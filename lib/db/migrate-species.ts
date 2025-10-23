import { db } from './index';
import { plants } from './schema';
import { sql } from 'drizzle-orm';

/**
 * Migration script to split the species field into speciesType and speciesName
 *
 * This script:
 * 1. Finds all plants with the old 'species' field
 * 2. Splits on first space: "Philodendron Joepii" → type="Philodendron", name="Joepii"
 * 3. Updates each plant with the split values
 *
 * Usage: bun run migrate:species
 */

async function migrateSpeciesData() {
  try {
    console.log('🔄 Starting species field migration...');
    console.log('');

    // Get all plants (the old 'species' column should still exist until we push schema)
    const allPlants = await db.execute(sql`
      SELECT id, species
      FROM plants
      WHERE species IS NOT NULL
    `);

    console.log(`📊 Found ${allPlants.rows.length} plants to migrate`);

    if (allPlants.rows.length === 0) {
      console.log('');
      console.log('⚠️  No plants found with species data.');
      console.log('   This is expected if you haven\'t added any plants yet!');
      console.log('');
      return;
    }

    console.log('');
    console.log('🔧 Splitting species data...');

    let successCount = 0;
    let errorCount = 0;

    for (const row of allPlants.rows) {
      const plantId = row.id as string;
      const species = row.species as string;

      try {
        // Split on first space
        const firstSpaceIndex = species.indexOf(' ');

        let speciesType: string;
        let speciesName: string;

        if (firstSpaceIndex === -1) {
          // No space found, use entire value as type and set name to same value
          speciesType = species.trim();
          speciesName = species.trim();
          console.log(`   ⚠️  "${species}" has no space - using as both type and name`);
        } else {
          // Split on first space
          speciesType = species.substring(0, firstSpaceIndex).trim();
          speciesName = species.substring(firstSpaceIndex + 1).trim();
        }

        // Update the plant with split values
        await db.execute(sql`
          UPDATE plants
          SET species_type = ${speciesType},
              species_name = ${speciesName}
          WHERE id = ${plantId}
        `);

        console.log(`   ✓ "${species}" → Type: "${speciesType}", Name: "${speciesName}"`);
        successCount++;
      } catch (error) {
        console.error(`   ✗ Failed to migrate plant ${plantId}:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('🎉 Species migration completed!');
    console.log('');
    console.log('Summary:');
    console.log(`  - ${successCount} plants migrated successfully`);
    if (errorCount > 0) {
      console.log(`  - ${errorCount} plants failed`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
migrateSpeciesData();
