'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { plants } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { NewPlant, Plant } from '@/lib/db/types';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

async function getDbUserId(clerkUserId: string) {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    throw new Error('User not found in database');
  }

  return user.id;
}

// ============================================
// CREATE OPERATIONS
// ============================================

export async function createPlant(data: Omit<NewPlant, 'userId' | 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const [newPlant] = await db
      .insert(plants)
      .values({
        ...data,
        userId: dbUserId,
      })
      .returning();

    revalidatePath('/dashboard');
    revalidatePath('/plants');

    return {
      success: true,
      data: newPlant,
    };
  } catch (error) {
    console.error('Error creating plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create plant',
    };
  }
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getPlant(plantId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const plant = await db.query.plants.findFirst({
      where: and(
        eq(plants.id, plantId),
        eq(plants.userId, dbUserId)
      ),
      with: {
        careTasks: {
          orderBy: (careTasks, { asc }) => [asc(careTasks.nextDueDate)],
        },
        media: {
          orderBy: (plantMedia, { asc }) => [asc(plantMedia.orderIndex)],
        },
        notes: {
          orderBy: (plantNotes, { desc }) => [desc(plantNotes.createdAt)],
        },
        links: {
          orderBy: (plantLinks, { desc }) => [desc(plantLinks.createdAt)],
        },
      },
    });

    if (!plant) {
      return {
        success: false,
        error: 'Plant not found',
      };
    }

    return {
      success: true,
      data: plant,
    };
  } catch (error) {
    console.error('Error fetching plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plant',
    };
  }
}

export async function getPlants(includeArchived = false, speciesTypeFilter?: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    let whereConditions = includeArchived
      ? eq(plants.userId, dbUserId)
      : and(
          eq(plants.userId, dbUserId),
          eq(plants.isArchived, false)
        );

    // Add species type filter if provided
    if (speciesTypeFilter && speciesTypeFilter !== 'all') {
      whereConditions = and(
        whereConditions,
        eq(plants.speciesType, speciesTypeFilter)
      );
    }

    const userPlants = await db.query.plants.findMany({
      where: whereConditions,
      orderBy: [desc(plants.createdAt)],
      with: {
        careTasks: {
          orderBy: (careTasks, { asc }) => [asc(careTasks.nextDueDate)],
        },
        media: {
          where: (plantMedia, { eq }) => eq(plantMedia.isPrimary, true),
          limit: 1,
        },
      },
    });

    return {
      success: true,
      data: userPlants,
    };
  } catch (error) {
    console.error('Error fetching plants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plants',
    };
  }
}

export async function getDistinctSpeciesTypes() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const result = await db
      .selectDistinct({ speciesType: plants.speciesType })
      .from(plants)
      .where(
        and(
          eq(plants.userId, dbUserId),
          eq(plants.isArchived, false)
        )
      )
      .orderBy(plants.speciesType);

    return {
      success: true,
      data: result.map(r => r.speciesType).filter(Boolean) as string[],
    };
  } catch (error) {
    console.error('Error fetching species types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch species types',
    };
  }
}

export async function getPlantsCount() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const result = await db
      .select()
      .from(plants)
      .where(
        and(
          eq(plants.userId, dbUserId),
          eq(plants.isArchived, false)
        )
      );

    return {
      success: true,
      data: result.length,
    };
  } catch (error) {
    console.error('Error counting plants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to count plants',
    };
  }
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updatePlant(
  plantId: string,
  data: Partial<Omit<Plant, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingPlant = await db.query.plants.findFirst({
      where: and(
        eq(plants.id, plantId),
        eq(plants.userId, dbUserId)
      ),
    });

    if (!existingPlant) {
      return {
        success: false,
        error: 'Plant not found or unauthorized',
      };
    }

    const [updatedPlant] = await db
      .update(plants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId))
      .returning();

    revalidatePath('/dashboard');
    revalidatePath('/plants');
    revalidatePath(`/plants/${plantId}`);

    return {
      success: true,
      data: updatedPlant,
    };
  } catch (error) {
    console.error('Error updating plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update plant',
    };
  }
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function archivePlant(plantId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingPlant = await db.query.plants.findFirst({
      where: and(
        eq(plants.id, plantId),
        eq(plants.userId, dbUserId)
      ),
    });

    if (!existingPlant) {
      return {
        success: false,
        error: 'Plant not found or unauthorized',
      };
    }

    const [archivedPlant] = await db
      .update(plants)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId))
      .returning();

    revalidatePath('/dashboard');
    revalidatePath('/plants');

    return {
      success: true,
      data: archivedPlant,
    };
  } catch (error) {
    console.error('Error archiving plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive plant',
    };
  }
}

export async function unarchivePlant(plantId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingPlant = await db.query.plants.findFirst({
      where: and(
        eq(plants.id, plantId),
        eq(plants.userId, dbUserId)
      ),
    });

    if (!existingPlant) {
      return {
        success: false,
        error: 'Plant not found or unauthorized',
      };
    }

    const [unarchivedPlant] = await db
      .update(plants)
      .set({
        isArchived: false,
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId))
      .returning();

    revalidatePath('/dashboard');
    revalidatePath('/plants');

    return {
      success: true,
      data: unarchivedPlant,
    };
  } catch (error) {
    console.error('Error unarchiving plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unarchive plant',
    };
  }
}

export async function deletePlant(plantId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingPlant = await db.query.plants.findFirst({
      where: and(
        eq(plants.id, plantId),
        eq(plants.userId, dbUserId)
      ),
    });

    if (!existingPlant) {
      return {
        success: false,
        error: 'Plant not found or unauthorized',
      };
    }

    // Hard delete (cascade will handle related records)
    await db
      .delete(plants)
      .where(eq(plants.id, plantId));

    revalidatePath('/dashboard');
    revalidatePath('/plants');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete plant',
    };
  }
}

// ============================================
// FAVORITE OPERATIONS
// ============================================

export async function toggleFavoritePlant(plantId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingPlant = await db.query.plants.findFirst({
      where: and(
        eq(plants.id, plantId),
        eq(plants.userId, dbUserId)
      ),
    });

    if (!existingPlant) {
      return {
        success: false,
        error: 'Plant not found or unauthorized',
      };
    }

    // If trying to favorite (currently not favorited), check if user already has 3 favorites
    if (!existingPlant.isFavorite) {
      const favoriteCount = await db
        .select()
        .from(plants)
        .where(
          and(
            eq(plants.userId, dbUserId),
            eq(plants.isFavorite, true),
            eq(plants.isArchived, false)
          )
        );

      if (favoriteCount.length >= 3) {
        return {
          success: false,
          error: 'Maximum of 3 favorite plants allowed. Unfavorite another plant first.',
        };
      }
    }

    // Toggle favorite status
    const [updatedPlant] = await db
      .update(plants)
      .set({
        isFavorite: !existingPlant.isFavorite,
        favoritedAt: !existingPlant.isFavorite ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId))
      .returning();

    revalidatePath('/dashboard');
    revalidatePath('/plants');
    revalidatePath(`/plants/${plantId}`);

    return {
      success: true,
      data: updatedPlant,
    };
  } catch (error) {
    console.error('Error toggling favorite plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle favorite',
    };
  }
}

export async function getFavoritePlants() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const favoritePlants = await db.query.plants.findMany({
      where: and(
        eq(plants.userId, dbUserId),
        eq(plants.isFavorite, true),
        eq(plants.isArchived, false)
      ),
      orderBy: [desc(plants.favoritedAt)],
      limit: 3,
      with: {
        careTasks: {
          orderBy: (careTasks, { asc }) => [asc(careTasks.nextDueDate)],
        },
        media: {
          where: (plantMedia, { eq }) => eq(plantMedia.isPrimary, true),
          limit: 1,
        },
      },
    });

    return {
      success: true,
      data: favoritePlants,
    };
  } catch (error) {
    console.error('Error fetching favorite plants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch favorite plants',
    };
  }
}
