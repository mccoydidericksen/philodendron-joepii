#!/usr/bin/env bun
/**
 * Sync Production Data to Local Development
 *
 * This script copies all data from a production user to a local development user:
 * - Source: mccoy.did@gmail.com (production Neon DB)
 * - Target: mccoy@lightweaver.dev (local PostgreSQL)
 *
 * Usage:
 *   bun run scripts/sync-prod-to-local.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql as vercelSql } from "@vercel/postgres";
import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

// Production database (Neon)
const PROD_DB_URL = process.env.DB_POSTGRES_URL_NON_POOLING!;
const prodPool = new Pool({ connectionString: PROD_DB_URL });
const prodDb = drizzle(prodPool, { schema });

// Local database
const LOCAL_DB_URL = "postgresql://mccoy@localhost:5432/plantrot";
const localPool = new Pool({ connectionString: LOCAL_DB_URL });
const localDb = drizzle(localPool, { schema });

const PROD_EMAIL = "mccoy.did@gmail.com";
const LOCAL_EMAIL = "mccoy@lightweaver.dev";

async function syncData() {
  try {
    console.log("🔄 Starting data sync from production to local...\n");

    // 1. Get production user
    console.log(`📥 Fetching production user: ${PROD_EMAIL}`);
    const prodUser = await prodDb.query.users.findFirst({
      where: eq(schema.users.email, PROD_EMAIL),
    });

    if (!prodUser) {
      throw new Error(`Production user not found: ${PROD_EMAIL}`);
    }
    console.log(`✅ Found production user: ${prodUser.id}`);

    // 2. Get local user
    console.log(`📥 Fetching local user: ${LOCAL_EMAIL}`);
    const localUser = await localDb.query.users.findFirst({
      where: eq(schema.users.email, LOCAL_EMAIL),
    });

    if (!localUser) {
      throw new Error(`Local user not found: ${LOCAL_EMAIL}`);
    }
    console.log(`✅ Found local user: ${localUser.id}\n`);

    // 3. Clear existing local data (keep the user)
    console.log("🗑️  Clearing existing local data...");
    await localDb.delete(schema.plants).where(eq(schema.plants.userId, localUser.id));
    console.log("✅ Cleared existing plants and related data\n");

    // 4. Copy plants
    console.log("📋 Copying plants...");
    const prodPlants = await prodDb.query.plants.findMany({
      where: eq(schema.plants.userId, prodUser.id),
      with: {
        media: true,
        notes: true,
        links: true,
      },
    });

    console.log(`   Found ${prodPlants.length} plants to copy`);

    const plantIdMapping = new Map<string, string>(); // old ID -> new ID

    for (const plant of prodPlants) {
      const { id: oldId, userId, createdByUserId, lastModifiedByUserId, assignedUserId, plantGroupId, parentPlantId, ...plantData } = plant;

      // Insert plant with new user ID
      const [newPlant] = await localDb
        .insert(schema.plants)
        .values({
          ...plantData,
          userId: localUser.id,
          createdByUserId: localUser.id,
          lastModifiedByUserId: localUser.id,
          assignedUserId: localUser.id,
          plantGroupId: null, // Will handle groups separately if needed
          parentPlantId: null, // Will handle parent relationships after all plants are created
        })
        .returning();

      plantIdMapping.set(oldId, newPlant.id);

      // Copy plant media
      if (plant.media && plant.media.length > 0) {
        for (const media of plant.media) {
          const { id, plantId, userId, ...mediaData } = media;
          await localDb.insert(schema.plantMedia).values({
            ...mediaData,
            plantId: newPlant.id,
            userId: localUser.id,
          });
        }
      }

      // Copy plant notes
      if (plant.notes && plant.notes.length > 0) {
        for (const note of plant.notes) {
          await localDb.insert(schema.plantNotes).values({
            content: note.content,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            plantId: newPlant.id,
            userId: localUser.id,
          });
        }
      }

      // Copy plant links
      if (plant.links && plant.links.length > 0) {
        for (const link of plant.links) {
          const { id, plantId, userId, ...linkData } = link;
          await localDb.insert(schema.plantLinks).values({
            ...linkData,
            plantId: newPlant.id,
            userId: localUser.id,
          });
        }
      }

      console.log(`   ✓ ${plant.name} (${plant.speciesName})`);
    }

    // Update parent plant relationships
    console.log("\n🔗 Updating parent plant relationships...");
    for (const plant of prodPlants) {
      if (plant.parentPlantId && plantIdMapping.has(plant.parentPlantId)) {
        const newPlantId = plantIdMapping.get(plant.id)!;
        const newParentId = plantIdMapping.get(plant.parentPlantId)!;
        await localDb
          .update(schema.plants)
          .set({ parentPlantId: newParentId })
          .where(eq(schema.plants.id, newPlantId));
      }
    }

    // 5. Copy care tasks
    console.log("\n📋 Copying care tasks...");
    const prodTasks = await prodDb.query.careTasks.findMany({
      where: eq(schema.careTasks.userId, prodUser.id),
      with: {
        completions: true,
      },
    });

    console.log(`   Found ${prodTasks.length} care tasks to copy`);

    for (const task of prodTasks) {
      if (!plantIdMapping.has(task.plantId)) {
        console.log(`   ⚠️  Skipping task for unknown plant: ${task.title}`);
        continue;
      }

      const { id: oldTaskId, plantId, userId, createdByUserId, lastModifiedByUserId, assignedUserId, ...taskData } = task;

      const newPlantId = plantIdMapping.get(plantId)!;

      // Insert task with new IDs
      const [newTask] = await localDb
        .insert(schema.careTasks)
        .values({
          ...taskData,
          plantId: newPlantId,
          userId: localUser.id,
          createdByUserId: localUser.id,
          lastModifiedByUserId: localUser.id,
          assignedUserId: localUser.id,
        })
        .returning();

      // Copy task completions
      if (task.completions && task.completions.length > 0) {
        for (const completion of task.completions) {
          const { id, taskId, userId, ...completionData } = completion;
          await localDb.insert(schema.taskCompletions).values({
            ...completionData,
            taskId: newTask.id,
            userId: localUser.id,
          });
        }
      }

      console.log(`   ✓ ${task.title}`);
    }

    // 6. Copy notification preferences
    console.log("\n📋 Copying notification preferences...");
    const prodNotifPrefs = await prodDb.query.userNotificationPreferences.findMany({
      where: eq(schema.userNotificationPreferences.userId, prodUser.id),
    });

    if (prodNotifPrefs.length > 0) {
      // Clear existing local preferences
      await localDb
        .delete(schema.userNotificationPreferences)
        .where(eq(schema.userNotificationPreferences.userId, localUser.id));

      for (const pref of prodNotifPrefs) {
        const { id, userId, ...prefData } = pref;
        await localDb.insert(schema.userNotificationPreferences).values({
          ...prefData,
          userId: localUser.id,
        });
      }
      console.log(`   ✓ Copied ${prodNotifPrefs.length} notification preferences`);
    }

    // Summary
    console.log("\n✅ Data sync complete!");
    console.log(`\nSummary:`);
    console.log(`  - Plants: ${prodPlants.length}`);
    console.log(`  - Care tasks: ${prodTasks.length}`);
    console.log(`  - Notification preferences: ${prodNotifPrefs.length}`);

  } catch (error) {
    console.error("\n❌ Error during sync:", error);
    throw error;
  } finally {
    await prodPool.end();
    await localPool.end();
  }
}

syncData();
