import Papa from 'papaparse';
import { BulkPlantRowSchema, CSV_HEADERS } from '@/lib/validations/bulk-plant';
import type { z } from 'zod';

export interface ParsedCSVRow {
  row: number;
  data: Record<string, any>;
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface CSVParseResult {
  success: boolean;
  rows: ParsedCSVRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  error?: string;
}

/**
 * Parse and validate CSV file containing plant data
 * @param file File object from FormData
 * @param maxRows Maximum number of rows to process (default: 100)
 * @returns Parsed and validated rows with error details
 */
export async function parseAndValidatePlantCSV(
  file: File,
  maxRows: number = 100
): Promise<CSVParseResult> {
  try {
    // Validate file
    const validationError = validateCSVFile(file, maxRows);
    if (validationError) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        error: validationError,
      };
    }

    // Read file as text
    const fileText = await file.text();

    // Parse CSV with papaparse
    const parseResult = Papa.parse(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize headers: trim whitespace, lowercase, handle common variations
        const normalized = header.trim().toLowerCase().replace(/[*\s]+/g, '_');

        // Map common variations to standard field names
        const headerMap: Record<string, string> = {
          'plant_name': 'name',
          'type': 'species_type',
          'species': 'species_name',
          'date': 'date_acquired',
          'acquired': 'date_acquired',
          'drainage': 'has_drainage',
          'height': 'current_height_in',
          'width': 'current_width_in',
          'light': 'light_level',
          'humidity': 'humidity_preference',
          'min_temp': 'min_temperature_f',
          'max_temp': 'max_temperature_f',
          'fertilizer': 'fertilizer_type',
          'stage': 'growth_stage',
          'native': 'native_region',
          'growth': 'growth_rate',
          'difficulty': 'difficulty_level',
          'price': 'purchase_price',
          'purchase': 'purchase_location',
        };

        return headerMap[normalized] || normalized;
      },
    });

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        error: `CSV parsing error: ${parseResult.errors[0].message}`,
      };
    }

    const parsedRows = parseResult.data as Record<string, any>[];

    // Limit rows
    const limitedRows = parsedRows.slice(0, maxRows);

    // Validate each row
    const results: ParsedCSVRow[] = limitedRows.map((rowData, index) => {
      // Validate with Zod schema
      const validation = BulkPlantRowSchema.safeParse(rowData);

      if (validation.success) {
        return {
          row: index + 1,
          data: validation.data,
          isValid: true,
        };
      } else {
        // Extract error details
        const errors = validation.error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return {
          row: index + 1,
          data: rowData,
          isValid: false,
          errors,
        };
      }
    });

    const validRows = results.filter((r) => r.isValid).length;
    const invalidRows = results.filter((r) => !r.isValid).length;

    return {
      success: true,
      rows: results,
      totalRows: results.length,
      validRows,
      invalidRows,
    };
  } catch (error) {
    console.error('CSV parsing error:', error);
    return {
      success: false,
      rows: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Validate CSV file before parsing
 */
function validateCSVFile(file: File, maxRows: number): string | null {
  // Check file extension
  if (!file.name.endsWith('.csv')) {
    return 'Invalid file type. Please upload a CSV file (.csv extension required).';
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return `File too large. Maximum size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`;
  }

  // File must have some content
  if (file.size === 0) {
    return 'File is empty. Please upload a valid CSV file.';
  }

  return null;
}

/**
 * Generate error CSV for failed rows
 * Allows users to download errors and fix them
 */
export function generateErrorCSV(invalidRows: ParsedCSVRow[]): string {
  const headers = ['Row', 'Error Field', 'Error Message', ...CSV_HEADERS];

  const rows = invalidRows.flatMap((row) => {
    if (!row.errors || row.errors.length === 0) return [];

    return row.errors.map((error) => {
      const rowData = CSV_HEADERS.map(
        (header) => row.data[header] || ''
      );

      return [
        row.row.toString(),
        error.field,
        error.message,
        ...rowData,
      ];
    });
  });

  // Convert to CSV
  const allRows = [headers, ...rows];
  return allRows
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');
}
