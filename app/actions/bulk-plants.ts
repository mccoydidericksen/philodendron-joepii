'use server';

import { db } from '@/lib/db';
import { plants, users } from '@/lib/db/schema';
import { parseAndValidatePlantCSV, generateErrorCSV } from '@/lib/utils/csv-parser';
import type { ParsedCSVRow } from '@/lib/utils/csv-parser';
import type { Plant } from '@/lib/db/types';
import { createDefaultTasksForPlant } from '@/lib/utils/auto-task-generator';
import { eq } from 'drizzle-orm';
import { getUserId, getDbUserId } from '@/lib/auth/helpers';
import { revalidateCommonPaths } from '@/lib/utils/server-helpers';

export interface BulkUploadResult {
  success: boolean;
  stats?: {
    totalRows: number;
    successfulInserts: number;
    updatedPlants: number;
    duplicatesSkipped: number;
    failedRows: number;
  };
  errors?: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Record<string, any>;
  }>;
  insertedPlants?: Plant[];
  updatedPlants?: Plant[];
  errorCSV?: string; // CSV content for download
}

/**
 * Create a normalized key for duplicate detection
 * Case-insensitive comparison based on name, species_type, and location
 */
function createPlantKey(name: string, speciesType: string, location: string): string {
  return `${name.toLowerCase().trim()}|${speciesType.toLowerCase().trim()}|${location.toLowerCase().trim()}`;
}

/**
 * Map CSV fields (snake_case) to database schema fields (camelCase)
 */
function mapCSVFieldsToDBSchema(csvData: Record<string, any>) {
  return {
    name: csvData.name,
    speciesType: csvData.species_type,
    speciesName: csvData.species_name,
    location: csvData.location,
    potSize: csvData.pot_size,
    potType: csvData.pot_type,
    potColor: csvData.pot_color,
    soilType: csvData.soil_type,
    hasDrainage: csvData.has_drainage,
    currentHeightIn: csvData.current_height_in,
    currentWidthIn: csvData.current_width_in,
    lightLevel: csvData.light_level,
    humidityPreference: csvData.humidity_preference,
    minTemperatureF: csvData.min_temperature_f,
    maxTemperatureF: csvData.max_temperature_f,
    fertilizerType: csvData.fertilizer_type,
    growthStage: csvData.growth_stage,
    toxicity: csvData.toxicity,
    nativeRegion: csvData.native_region,
    growthRate: csvData.growth_rate,
    difficultyLevel: csvData.difficulty_level,
    purchaseLocation: csvData.purchase_location,
    purchasePriceCents: csvData.purchase_price,
    notes: csvData.notes,
  };
}

/**
 * Bulk upload plants from CSV file
 * @param formData FormData containing the CSV file
 * @returns Upload result with stats and errors
 */
export async function bulkUploadPlants(formData: FormData): Promise<BulkUploadResult> {
  try {
    // Authenticate user
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user object for reference
    const user = await db.query.users.findFirst({
      where: eq(users.id, dbUserId),
    });

    if (!user) {
      return {
        success: false,
        errors: [
          {
            row: 0,
            message: 'User not found in database',
          },
        ],
      };
    }

    // Extract file from FormData
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return {
        success: false,
        errors: [
          {
            row: 0,
            message: 'No file provided. Please select a CSV file to upload.',
          },
        ],
      };
    }

    // Parse and validate CSV
    const parseResult = await parseAndValidatePlantCSV(file, 100);

    if (!parseResult.success) {
      return {
        success: false,
        errors: [
          {
            row: 0,
            message: parseResult.error || 'Failed to parse CSV file',
          },
        ],
      };
    }

    // Check if there are any valid rows
    const validRows = parseResult.rows.filter((row) => row.isValid);
    const invalidRows = parseResult.rows.filter((row) => !row.isValid);

    if (validRows.length === 0) {
      // All rows are invalid
      const errorDetails = invalidRows.flatMap((row) =>
        (row.errors || []).map((error) => ({
          row: row.row,
          field: error.field,
          message: error.message,
          data: row.data,
        }))
      );

      return {
        success: false,
        stats: {
          totalRows: parseResult.totalRows,
          successfulInserts: 0,
          updatedPlants: 0,
          duplicatesSkipped: 0,
          failedRows: parseResult.invalidRows,
        },
        errors: errorDetails,
        errorCSV: generateErrorCSV(invalidRows),
      };
    }

    // Fetch all existing plants for this user for duplicate detection
    const existingPlants = await db.query.plants.findMany({
      where: eq(plants.userId, user.id),
      columns: {
        id: true,
        name: true,
        speciesType: true,
        location: true,
        dateAcquired: true,
        userId: true,
        createdByUserId: true,
        createdAt: true,
      },
    });

    // Build a map of existing plants keyed by normalized identifier
    const existingPlantsMap = new Map<string, { id: string; dateAcquired: Date; userId: string; createdByUserId: string | null; createdAt: Date }>();
    for (const plant of existingPlants) {
      const key = createPlantKey(plant.name, plant.speciesType, plant.location);
      existingPlantsMap.set(key, {
        id: plant.id,
        dateAcquired: plant.dateAcquired,
        userId: plant.userId,
        createdByUserId: plant.createdByUserId,
        createdAt: plant.createdAt,
      });
    }

    // Track plants seen in this CSV to detect intra-file duplicates
    const seenInCSV = new Set<string>();

    // Classify rows: new inserts, updates, or duplicates
    const plantsToInsert: Array<any> = [];
    const plantsToUpdate: Array<{ id: string; data: any }> = [];
    let duplicatesSkipped = 0;
    const processingErrors: Array<{
      row: number;
      message: string;
      data?: Record<string, any>;
    }> = [];

    for (const validRow of validRows) {
      try {
        const plantKey = createPlantKey(
          validRow.data.name,
          validRow.data.species_type,
          validRow.data.location
        );

        // Check for intra-CSV duplicate
        if (seenInCSV.has(plantKey)) {
          duplicatesSkipped++;
          continue;
        }
        seenInCSV.add(plantKey);

        // Map CSV fields to database schema
        const mappedFields = mapCSVFieldsToDBSchema(validRow.data);

        const plantData = {
          ...mappedFields,
          userId: user.id,
          dateAcquired: new Date(validRow.data.date_acquired),
          lastWateredAt: validRow.data.last_watered || null,
          lastFertilizedAt: validRow.data.last_fertilized || null,
          lastMistedAt: validRow.data.last_misted || null,
          lastRepottedAt: validRow.data.last_repotted || null,
        };

        // Check if plant exists in database
        const existingPlant = existingPlantsMap.get(plantKey);

        if (existingPlant) {
          // Queue for UPDATE
          plantsToUpdate.push({
            id: existingPlant.id,
            data: {
              ...plantData,
              // Preserve original values
              dateAcquired: existingPlant.dateAcquired,
              userId: existingPlant.userId,
              createdByUserId: existingPlant.createdByUserId,
              createdAt: existingPlant.createdAt,
              lastModifiedByUserId: user.id,
              updatedAt: new Date(),
            },
          });
        } else {
          // Queue for INSERT
          plantsToInsert.push({
            ...plantData,
            createdByUserId: user.id,
            assignedUserId: user.id,
          });
        }
      } catch (error) {
        console.error(`Error processing row ${validRow.row}:`, error);
        processingErrors.push({
          row: validRow.row,
          message: error instanceof Error ? error.message : 'Failed to process plant',
          data: validRow.data,
        });
      }
    }

    // Batch INSERT new plants
    const insertedPlants: Plant[] = [];
    if (plantsToInsert.length > 0) {
      try {
        const inserted = await db.insert(plants).values(plantsToInsert).returning();
        insertedPlants.push(...inserted);

        // Create tasks for new plants
        for (const newPlant of inserted) {
          try {
            await createDefaultTasksForPlant(newPlant.id, user.id, {
              lastWateredAt: newPlant.lastWateredAt,
              lastFertilizedAt: newPlant.lastFertilizedAt,
              lastMistedAt: newPlant.lastMistedAt,
              lastRepottedAt: newPlant.lastRepottedAt,
            });
          } catch (taskError) {
            console.error(`Error creating tasks for plant ${newPlant.id}:`, taskError);
          }
        }
      } catch (error) {
        console.error('Batch insert error:', error);
        processingErrors.push({
          row: 0,
          message: `Batch insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Batch UPDATE existing plants
    const updatedPlantsList: Plant[] = [];
    for (const updateItem of plantsToUpdate) {
      try {
        const [updated] = await db
          .update(plants)
          .set(updateItem.data)
          .where(eq(plants.id, updateItem.id))
          .returning();
        updatedPlantsList.push(updated);
      } catch (error) {
        console.error(`Error updating plant ${updateItem.id}:`, error);
        processingErrors.push({
          row: 0,
          message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Combine validation errors and processing errors
    const allErrors = [
      ...invalidRows.flatMap((row) =>
        (row.errors || []).map((error) => ({
          row: row.row,
          field: error.field,
          message: error.message,
          data: row.data,
        }))
      ),
      ...processingErrors,
    ];

    // Revalidate relevant paths
    if (insertedPlants.length > 0 || updatedPlantsList.length > 0) {
      revalidateCommonPaths();
    }

    // Determine overall success
    const isFullSuccess = allErrors.length === 0;
    const isPartialSuccess = (insertedPlants.length > 0 || updatedPlantsList.length > 0) && allErrors.length > 0;

    // Generate error CSV if there are errors
    const errorCSV =
      allErrors.length > 0
        ? generateErrorCSV([...invalidRows, ...processingErrors.map((err) => ({ row: err.row, data: err.data || {}, isValid: false, errors: [{ field: 'general', message: err.message }] }))])
        : undefined;

    return {
      success: isFullSuccess || isPartialSuccess,
      stats: {
        totalRows: parseResult.totalRows,
        successfulInserts: insertedPlants.length,
        updatedPlants: updatedPlantsList.length,
        duplicatesSkipped,
        failedRows: allErrors.length,
      },
      errors: allErrors.length > 0 ? allErrors : undefined,
      insertedPlants,
      updatedPlants: updatedPlantsList,
      errorCSV,
    };
  } catch (error) {
    console.error('Bulk upload error:', error);
    return {
      success: false,
      errors: [
        {
          row: 0,
          message:
            error instanceof Error ? error.message : 'An unexpected error occurred during bulk upload',
        },
      ],
    };
  }
}
