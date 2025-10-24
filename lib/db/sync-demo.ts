import { db } from './index';
import { users, plants, careTasks as careTasksTable, taskCompletions, plantMedia } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Sync script to mirror personal account data to demo account
 * This script copies all plants, care tasks, and task completions from your personal account
 * to the demo account, replacing any existing demo data.
 *
 * Run this script weekly or whenever you want to update the demo account with your latest data.
 *
 * Usage: bun run sync-demo
 */

const PERSONAL_EMAIL = 'mccoy.did@gmail.com';
const DEMO_EMAIL = 'john.doe@plantrot.app';

async function syncDemoData() {
  try {
    console.log('🔄 Starting demo data sync...');
    console.log('');

    // Find both users
    const personalUser = await db.query.users.findFirst({
      where: eq(users.email, PERSONAL_EMAIL),
    });

    const demoUser = await db.query.users.findFirst({
      where: eq(users.email, DEMO_EMAIL),
    });

    // Validate users exist
    if (!personalUser) {
      console.error('❌ Personal user not found!');
      console.log('Expected email:', PERSONAL_EMAIL);
      process.exit(1);
    }

    if (!demoUser) {
      console.error('❌ Demo user not found. Please create the user in Clerk first.');
      console.log('Expected email:', DEMO_EMAIL);
      process.exit(1);
    }

    console.log('✅ Found personal user:', personalUser.email);
    console.log('✅ Found demo user:', demoUser.email);
    console.log('');

    // Get all personal account data
    const personalPlants = await db.query.plants.findMany({
      where: eq(plants.userId, personalUser.id),
      with: {
        careTasks: {
          with: {
            completions: true,
          },
        },
        media: true,
      },
    });

    console.log(`📊 Personal account has ${personalPlants.length} plants`);

    if (personalPlants.length === 0) {
      console.log('');
      console.log('⚠️  No plants found in personal account.');
      console.log('   The demo account will be cleared but no data will be copied.');
      console.log('   This is expected if you haven\'t added any plants yet!');
      console.log('');
    }

    // Delete existing demo account data (in correct order due to foreign keys)
    console.log('🗑️  Clearing existing demo account data...');

    const existingDemoPlants = await db.query.plants.findMany({
      where: eq(plants.userId, demoUser.id),
    });

    if (existingDemoPlants.length > 0) {
      // Delete task completions first
      for (const plant of existingDemoPlants) {
        const tasks = await db.query.careTasks.findMany({
          where: eq(careTasksTable.plantId, plant.id),
        });

        for (const task of tasks) {
          await db.delete(taskCompletions).where(eq(taskCompletions.taskId, task.id));
        }

        // Delete care tasks
        await db.delete(careTasksTable).where(eq(careTasksTable.plantId, plant.id));

        // Delete plant media
        await db.delete(plantMedia).where(eq(plantMedia.plantId, plant.id));
      }

      // Delete plants
      await db.delete(plants).where(eq(plants.userId, demoUser.id));
      console.log(`   Deleted ${existingDemoPlants.length} existing plants and their associated data`);
    } else {
      console.log('   No existing demo data to clear');
    }

    console.log('');

    // Copy personal data to demo account
    if (personalPlants.length > 0) {
      console.log('📦 Copying data to demo account...');

      let totalTasks = 0;
      let totalCompletions = 0;
      let totalMedia = 0;

      for (const plant of personalPlants) {
        // Create a mapping of old plant IDs to new plant IDs
        const { careTasks: tasks, media: mediaFiles, ...plantData } = plant;

        // Insert plant with demo user ID
        const [newPlant] = await db.insert(plants).values({
          ...plantData,
          userId: demoUser.id,
          id: undefined, // Let DB generate new ID
        }).returning();

        console.log(`   ✓ Copied plant: ${newPlant.name}`);

        // Copy care tasks for this plant
        if (tasks && tasks.length > 0) {
          for (const task of tasks) {
            const { completions, ...taskData } = task;

            // Insert care task with new plant ID and demo user ID
            const [newTask] = await db.insert(careTasksTable).values({
              ...taskData,
              plantId: newPlant.id,
              userId: demoUser.id,
              id: undefined, // Let DB generate new ID
            }).returning();

            totalTasks++;

            // Copy task completions
            if (completions && completions.length > 0) {
              for (const completion of completions) {
                await db.insert(taskCompletions).values({
                  ...completion,
                  taskId: newTask.id,
                  userId: demoUser.id,
                  id: undefined, // Let DB generate new ID
                });
                totalCompletions++;
              }
            }
          }
        }

        // Copy plant media for this plant
        if (mediaFiles && mediaFiles.length > 0) {
          for (const media of mediaFiles) {
            await db.insert(plantMedia).values({
              ...media,
              plantId: newPlant.id,
              userId: demoUser.id,
              id: undefined, // Let DB generate new ID
            });
            totalMedia++;
          }
        }
      }

      console.log('');
      console.log('🎉 Demo data sync completed successfully!');
      console.log('');
      console.log('Summary:');
      console.log(`  - ${personalPlants.length} plants copied`);
      console.log(`  - ${totalTasks} care tasks copied`);
      console.log(`  - ${totalCompletions} task completions copied`);
      console.log(`  - ${totalMedia} media files copied`);
    } else {
      console.log('✅ Demo account cleared. No data to copy yet.');
    }

    console.log('');
    console.log('Demo account is ready at:');
    console.log(`  Email: ${DEMO_EMAIL}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error syncing demo data:', error);
    console.error(error);
    process.exit(1);
  }
}

// Run the sync function
syncDemoData();
