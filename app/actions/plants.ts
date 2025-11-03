'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { plants, careTasks, users } from '@/lib/db/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import type { NewPlant, Plant } from '@/lib/db/types';
import { createDefaultTasksForPlant } from '@/lib/utils/auto-task-generator';
import { calculateNextDueDate } from '@/lib/utils/date-helpers';
import { getUserId, getDbUserId, verifyPlantOwnership } from '@/lib/auth/helpers';
import { revalidateCommonPaths, revalidatePlantPaths, revalidateGroupPaths, createSuccessResponse, createSuccessResponseNoData, createErrorResponse } from '@/lib/utils/server-helpers';

// ============================================
// CREATE OPERATIONS
// ============================================

export async function createPlant(
  data: Omit<NewPlant, 'userId' | 'id' | 'createdAt' | 'updatedAt' | 'createdByUserId'>,
  options?: {
    assignedUserId?: string | null;
  }
) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Auto-detect if user is in a group and automatically assign plant to that group
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    const [newPlant] = await db
      .insert(plants)
      .values({
        ...data,
        userId: dbUserId,
        plantGroupId: userGroupId, // Automatically set to user's group (or null if no group)
        assignedUserId: options?.assignedUserId || dbUserId,
        createdByUserId: dbUserId,
      })
      .returning();

    // Auto-create default care tasks (water, fertilize, mist, repot_check)
    try {
      await createDefaultTasksForPlant(newPlant.id, dbUserId, {
        lastWateredAt: newPlant.lastWateredAt,
        lastFertilizedAt: newPlant.lastFertilizedAt,
        lastMistedAt: newPlant.lastMistedAt,
        lastRepottedAt: newPlant.lastRepottedAt,
      });
    } catch (taskError) {
      console.error('Error creating default tasks:', taskError);
      // Don't fail plant creation if task creation fails
    }

    revalidateCommonPaths();
    if (userGroupId) {
      // Revalidate group paths if plant was auto-added to a group
      revalidateGroupPaths();
    }

    return createSuccessResponse(newPlant);
  } catch (error) {
    console.error('Error creating plant:', error);
    return createErrorResponse(error, 'Failed to create plant');
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
          with: {
            completions: {
              orderBy: (taskCompletions, { desc }) => [desc(taskCompletions.completedAt)],
              limit: 5,
            },
          },
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
      return createErrorResponse('Plant not found');
    }

    return createSuccessResponse(plant);
  } catch (error) {
    console.error('Error fetching plant:', error);
    return createErrorResponse(error, 'Failed to fetch plant');
  }
}

export async function getPlants(
  includeArchived = false,
  speciesTypeFilter?: string,
  options?: {
    groupId?: string | null; // null = personal plants only
    assignedToMe?: boolean;
    locationFilter?: string;
    assigneeFilter?: string; // 'unassigned', 'me', or userId
  }
) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID for filtering
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    let whereConditions;

    if (options?.groupId) {
      // Get specific group plants
      const group = await db.query.plantGroups.findFirst({
        where: (plantGroups, { eq }) => eq(plantGroups.clerkOrgId, options.groupId!),
      });

      if (!group) {
        return createErrorResponse('Group not found');
      }

      whereConditions = includeArchived
        ? eq(plants.plantGroupId, group.id)
        : and(
            eq(plants.plantGroupId, group.id),
            eq(plants.isArchived, false)
          );
    } else if (options?.groupId === null) {
      // Explicitly get personal plants only
      whereConditions = includeArchived
        ? and(eq(plants.userId, dbUserId), eq(plants.plantGroupId, null as any))
        : and(
            eq(plants.userId, dbUserId),
            eq(plants.plantGroupId, null as any),
            eq(plants.isArchived, false)
          );
    } else {
      // Default: get all accessible plants (personal + group)
      if (userGroupId) {
        // User is in a group - show personal plants OR plants in their group
        whereConditions = includeArchived
          ? or(
              eq(plants.userId, dbUserId),
              eq(plants.plantGroupId, userGroupId)
            )
          : and(
              or(
                eq(plants.userId, dbUserId),
                eq(plants.plantGroupId, userGroupId)
              ),
              eq(plants.isArchived, false)
            );
      } else {
        // User not in a group - show only personal plants
        whereConditions = includeArchived
          ? eq(plants.userId, dbUserId)
          : and(
              eq(plants.userId, dbUserId),
              eq(plants.isArchived, false)
            );
      }
    }

    // Add assigned to me filter
    if (options?.assignedToMe) {
      whereConditions = and(whereConditions, eq(plants.assignedUserId, dbUserId));
    }

    // Add species type filter if provided
    if (speciesTypeFilter && speciesTypeFilter !== 'all') {
      whereConditions = and(
        whereConditions,
        eq(plants.speciesType, speciesTypeFilter)
      );
    }

    // Add location filter if provided
    if (options?.locationFilter && options.locationFilter !== 'all') {
      whereConditions = and(
        whereConditions,
        eq(plants.location, options.locationFilter)
      );
    }

    // Add assignee filter if provided
    if (options?.assigneeFilter && options.assigneeFilter !== 'all') {
      if (options.assigneeFilter === 'unassigned') {
        whereConditions = and(
          whereConditions,
          eq(plants.assignedUserId, null as any)
        );
      } else if (options.assigneeFilter === 'me') {
        whereConditions = and(
          whereConditions,
          eq(plants.assignedUserId, dbUserId)
        );
      } else {
        // Filter by specific user ID
        whereConditions = and(
          whereConditions,
          eq(plants.assignedUserId, options.assigneeFilter)
        );
      }
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
        assignedUser: true,
      },
    });

    return createSuccessResponse(userPlants);
  } catch (error) {
    console.error('Error fetching plants:', error);
    return createErrorResponse(error, 'Failed to fetch plants');
  }
}

export async function getDistinctSpeciesTypes() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID for filtering
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    const whereConditions = userGroupId
      ? or(
          eq(plants.userId, dbUserId),
          eq(plants.plantGroupId, userGroupId)
        )
      : eq(plants.userId, dbUserId);

    const result = await db
      .selectDistinct({ speciesType: plants.speciesType })
      .from(plants)
      .where(
        and(
          whereConditions,
          eq(plants.isArchived, false)
        )
      )
      .orderBy(plants.speciesType);

    return createSuccessResponse(result.map(r => r.speciesType).filter(Boolean) as string[]);
  } catch (error) {
    console.error('Error fetching species types:', error);
    return createErrorResponse(error, 'Failed to fetch species types');
  }
}

export async function getPlantCountsBySpeciesType() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID for filtering
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    const whereConditions = userGroupId
      ? or(
          eq(plants.userId, dbUserId),
          eq(plants.plantGroupId, userGroupId)
        )
      : eq(plants.userId, dbUserId);

    // Get all non-archived plants
    const userPlants = await db.query.plants.findMany({
      where: and(
        whereConditions,
        eq(plants.isArchived, false)
      ),
      columns: {
        id: true,
        name: true,
        speciesType: true,
      },
    });

    // Group by species type
    const countsBySpecies = userPlants.reduce((acc, plant) => {
      const species = plant.speciesType;
      if (!acc[species]) {
        acc[species] = {
          speciesType: species,
          count: 0,
          plantIds: [],
          plantNames: [],
        };
      }
      acc[species].count++;
      acc[species].plantIds.push(plant.id);
      acc[species].plantNames.push(plant.name);
      return acc;
    }, {} as Record<string, { speciesType: string; count: number; plantIds: string[]; plantNames: string[] }>);

    // Convert to array and sort by count (highest to lowest)
    const sortedData = Object.values(countsBySpecies)
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: sortedData,
    };
  } catch (error) {
    console.error('Error fetching plant counts by species:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plant counts by species',
    };
  }
}

export async function getDistinctLocations() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID for filtering
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    const whereConditions = userGroupId
      ? or(
          eq(plants.userId, dbUserId),
          eq(plants.plantGroupId, userGroupId)
        )
      : eq(plants.userId, dbUserId);

    const result = await db
      .selectDistinct({ location: plants.location })
      .from(plants)
      .where(
        and(
          whereConditions,
          eq(plants.isArchived, false)
        )
      )
      .orderBy(plants.location);

    return {
      success: true,
      data: result.map(r => r.location).filter(Boolean) as string[],
    };
  } catch (error) {
    console.error('Error fetching locations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch locations',
    };
  }
}

export async function getAssignableUsers() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID for filtering
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    const whereConditions = userGroupId
      ? or(
          eq(plants.userId, dbUserId),
          eq(plants.plantGroupId, userGroupId)
        )
      : eq(plants.userId, dbUserId);

    // Get unique assigned users from plants
    const result = await db
      .selectDistinct({
        id: users.id,
        clerkUserId: users.clerkUserId,
        email: users.email,
      })
      .from(plants)
      .innerJoin(users, eq(plants.assignedUserId, users.id))
      .where(
        and(
          whereConditions,
          eq(plants.isArchived, false)
        )
      )
      .orderBy(users.email);

    // Get user info from Clerk for better display names
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerk = await clerkClient();
    const usersWithNames = await Promise.all(
      result.map(async (user) => {
        try {
          const clerkUser = await clerk.users.getUser(user.clerkUserId);
          return {
            id: user.id,
            name: clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || user.email.split('@')[0],
            email: user.email,
          };
        } catch {
          return {
            id: user.id,
            name: user.email.split('@')[0],
            email: user.email,
          };
        }
      })
    );

    // Filter out the current user since "Me" option already represents them
    const filteredUsers = usersWithNames.filter(user => user.id !== dbUserId);

    return {
      success: true,
      data: filteredUsers,
    };
  } catch (error) {
    console.error('Error fetching assignable users:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assignable users',
    };
  }
}

export async function getPlantsCount() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID for filtering
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    const whereConditions = userGroupId
      ? or(
          eq(plants.userId, dbUserId),
          eq(plants.plantGroupId, userGroupId)
        )
      : eq(plants.userId, dbUserId);

    const result = await db
      .select()
      .from(plants)
      .where(
        and(
          whereConditions,
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
  data: Partial<Omit<Plant, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'createdByUserId'>>
) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Check authorization (personal or group member)
    const { canEditPlant } = await import('@/lib/auth/group-auth');
    const canEdit = await canEditPlant(plantId, clerkUserId);

    if (!canEdit) {
      return {
        success: false,
        error: 'Plant not found or unauthorized',
      };
    }

    const [updatedPlant] = await db
      .update(plants)
      .set({
        ...data,
        lastModifiedByUserId: dbUserId,
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId))
      .returning();

    revalidatePlantPaths(plantId);

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

    revalidateCommonPaths();

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

    revalidateCommonPaths();

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

    revalidateCommonPaths();

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

    revalidatePlantPaths(plantId);

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

export async function setFavoritePlant(plantId: string) {
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

    // If already favorited, just return success
    if (existingPlant.isFavorite) {
      return {
        success: true,
        data: existingPlant,
      };
    }

    // Check if user already has 3 favorites
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

    // Set as favorite
    const [updatedPlant] = await db
      .update(plants)
      .set({
        isFavorite: true,
        favoritedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId))
      .returning();

    revalidatePlantPaths(plantId);

    return {
      success: true,
      data: updatedPlant,
    };
  } catch (error) {
    console.error('Error setting favorite plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set favorite',
    };
  }
}

export async function getFavoritePlants() {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID for filtering
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    const whereConditions = userGroupId
      ? or(
          eq(plants.userId, dbUserId),
          eq(plants.plantGroupId, userGroupId)
        )
      : eq(plants.userId, dbUserId);

    const favoritePlants = await db.query.plants.findMany({
      where: and(
        whereConditions,
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

// ============================================
// ASSIGNMENT OPERATIONS
// ============================================

export async function assignPlantToUser(plantId: string, assignedUserId: string | null) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Check authorization
    const { canEditPlant } = await import('@/lib/auth/group-auth');
    const canEdit = await canEditPlant(plantId, clerkUserId);

    if (!canEdit) {
      return {
        success: false,
        error: 'Plant not found or unauthorized',
      };
    }

    // If assigning to a user, verify they're in the same group
    if (assignedUserId) {
      const plant = await db.query.plants.findFirst({
        where: eq(plants.id, plantId),
        with: {
          plantGroup: true,
        },
      });

      if (plant?.plantGroup) {
        // Verify the assigned user is a member of the group
        const { checkGroupMembership } = await import('@/lib/auth/group-auth');
        const assignedUser = await db.query.users.findFirst({
          where: eq(users.id, assignedUserId),
        });

        if (assignedUser) {
          const membership = await checkGroupMembership(plant.plantGroup.clerkOrgId, assignedUser.clerkUserId);
          if (!membership) {
            return {
              success: false,
              error: 'Assigned user is not a member of this group',
            };
          }
        }
      }

      // Auto-assign all tasks for this plant to the new assignee
      await db
        .update(careTasks)
        .set({
          assignedUserId: assignedUserId,
          lastModifiedByUserId: dbUserId,
          updatedAt: new Date(),
        })
        .where(eq(careTasks.plantId, plantId));
    }

    // Update plant assignment
    const [updatedPlant] = await db
      .update(plants)
      .set({
        assignedUserId: assignedUserId,
        lastModifiedByUserId: dbUserId,
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId))
      .returning();

    revalidatePlantPaths(plantId);

    return {
      success: true,
      data: updatedPlant,
    };
  } catch (error) {
    console.error('Error assigning plant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign plant',
    };
  }
}

export async function getMyAssignedPlants(groupId?: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    let whereConditions = and(
      eq(plants.assignedUserId, dbUserId),
      eq(plants.isArchived, false)
    );

    if (groupId) {
      const group = await db.query.plantGroups.findFirst({
        where: (plantGroups, { eq }) => eq(plantGroups.clerkOrgId, groupId),
      });

      if (group) {
        whereConditions = and(
          whereConditions,
          eq(plants.plantGroupId, group.id)
        );
      }
    }

    const assignedPlants = await db.query.plants.findMany({
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
        plantGroup: true,
      },
    });

    return {
      success: true,
      data: assignedPlants,
    };
  } catch (error) {
    console.error('Error fetching assigned plants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assigned plants',
    };
  }
}

export async function getGroupPlants(groupId: string) {
  try {
    const clerkUserId = await getUserId();

    // Check membership
    const { checkGroupMembership } = await import('@/lib/auth/group-auth');
    const membership = await checkGroupMembership(groupId, clerkUserId);

    if (!membership) {
      return {
        success: false,
        error: 'You are not a member of this group',
      };
    }

    // Get group's database ID
    const group = await db.query.plantGroups.findFirst({
      where: (plantGroups, { eq }) => eq(plantGroups.clerkOrgId, groupId),
    });

    if (!group) {
      return {
        success: false,
        error: 'Group not found',
      };
    }

    const groupPlants = await db.query.plants.findMany({
      where: and(
        eq(plants.plantGroupId, group.id),
        eq(plants.isArchived, false)
      ),
      orderBy: [desc(plants.createdAt)],
      with: {
        careTasks: {
          orderBy: (careTasks, { asc }) => [asc(careTasks.nextDueDate)],
        },
        media: {
          where: (plantMedia, { eq }) => eq(plantMedia.isPrimary, true),
          limit: 1,
        },
        assignedUser: true,
        createdBy: true,
      },
    });

    return {
      success: true,
      data: groupPlants,
    };
  } catch (error) {
    console.error('Error fetching group plants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch group plants',
    };
  }
}

// ============================================
// LAST CARE DATE OPERATIONS
// ============================================

/**
 * Update a plant's last care date and recalculate associated task due date
 */
export async function updateLastCareDate(
  plantId: string,
  careType: 'water' | 'fertilize' | 'mist' | 'repot',
  lastCareDate: Date
) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify plant ownership
    await verifyPlantOwnership(plantId, dbUserId);

    // Map care type to plant field
    const fieldMap: Record<string, string> = {
      water: 'lastWateredAt',
      fertilize: 'lastFertilizedAt',
      mist: 'lastMistedAt',
      repot: 'lastRepottedAt',
    };

    const plantField = fieldMap[careType];

    // Update plant record
    await db
      .update(plants)
      .set({
        [plantField]: lastCareDate,
        updatedAt: new Date(),
      })
      .where(eq(plants.id, plantId));

    // Find associated task and recalculate due date
    const taskTypeMap: Record<string, string> = {
      water: 'water',
      fertilize: 'fertilize',
      mist: 'mist',
      repot: 'repot_check',
    };

    const task = await db.query.careTasks.findFirst({
      where: and(
        eq(careTasks.plantId, plantId),
        eq(careTasks.type, taskTypeMap[careType] as any)
      ),
    });

    if (task && task.recurrencePattern) {
      const newDueDate = calculateNextDueDate(lastCareDate, task.recurrencePattern);

      await db
        .update(careTasks)
        .set({
          lastCompletedAt: lastCareDate,
          nextDueDate: newDueDate,
          updatedAt: new Date(),
        })
        .where(eq(careTasks.id, task.id));
    }

    revalidatePath(`/plants/${plantId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating last care date:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update last care date',
    };
  }
}

// Helper function removed - now using centralized version from @/lib/auth/helpers
