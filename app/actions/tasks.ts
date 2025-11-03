'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { careTasks, taskCompletions, plants } from '@/lib/db/schema';
import { eq, and, desc, asc, lte, gte, or, inArray } from 'drizzle-orm';
import type { CareTaskType, RecurrencePattern, TaskScheduleMode } from '@/lib/db/types';
import { calculateNextDueDate } from '@/lib/utils/date-helpers';
import { getUserId, getDbUserId, verifyPlantOwnership } from '@/lib/auth/helpers';
import { revalidateCommonPaths, revalidatePlantPaths, createSuccessResponse, createSuccessResponseNoData, createErrorResponse } from '@/lib/utils/server-helpers';
import { TASK_DEFAULTS } from '@/lib/constants/task-defaults';

export async function getTaskDefaults(taskType: CareTaskType): Promise<{ frequency: number; unit: 'days' | 'weeks' | 'months'; title: string }> {
  return TASK_DEFAULTS[taskType] || TASK_DEFAULTS.custom;
}

// ============================================
// CREATE TASK
// ============================================

export async function createCareTask(data: {
  plantId: string;
  type: CareTaskType;
  title: string;
  description?: string;
  scheduleMode: TaskScheduleMode;
  recurrencePattern?: RecurrencePattern;
  specificDueDate?: Date;
  startDate?: Date;
  assignedUserId?: string | null;
}) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify plant ownership
    await verifyPlantOwnership(data.plantId, dbUserId);

    // Determine isRecurring and nextDueDate based on scheduleMode
    let isRecurring = false;
    let nextDueDate: Date | null = null;
    let recurrencePattern = null;

    if (data.scheduleMode === 'recurring') {
      if (!data.recurrencePattern) {
        throw new Error('Recurrence pattern is required for recurring tasks');
      }
      isRecurring = true;
      recurrencePattern = data.recurrencePattern;
      const startDate = data.startDate || new Date();
      nextDueDate = calculateNextDueDate(startDate, data.recurrencePattern);
    } else if (data.scheduleMode === 'one-time') {
      if (!data.specificDueDate) {
        throw new Error('Due date is required for one-time tasks');
      }
      isRecurring = false;
      nextDueDate = data.specificDueDate;
    } else {
      // unscheduled
      isRecurring = false;
      nextDueDate = null;
    }

    // Get plant to check assignment
    const plant = await db.query.plants.findFirst({
      where: eq(plants.id, data.plantId),
    });

    // Default assignedUserId to plant's assignedUserId if not specified
    const assignedUserId = data.assignedUserId !== undefined
      ? data.assignedUserId
      : (plant?.assignedUserId || dbUserId);

    const [newTask] = await db
      .insert(careTasks)
      .values({
        plantId: data.plantId,
        userId: dbUserId,
        type: data.type,
        title: data.title,
        description: data.description || null,
        isRecurring,
        recurrencePattern,
        nextDueDate,
        assignedUserId: assignedUserId,
        createdByUserId: dbUserId,
      })
      .returning();

    revalidatePlantPaths(data.plantId);

    return createSuccessResponse(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    return createErrorResponse(error, 'Failed to create task');
  }
}

// ============================================
// COMPLETE TASK
// ============================================

export async function completeCareTask(taskId: string, notes?: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get task details
    const task = await db.query.careTasks.findFirst({
      where: and(
        eq(careTasks.id, taskId),
        eq(careTasks.userId, dbUserId)
      ),
    });

    if (!task) {
      return createErrorResponse('Task not found or unauthorized');
    }

    const completedAt = new Date();

    // Record completion
    await db
      .insert(taskCompletions)
      .values({
        taskId,
        userId: dbUserId,
        completedAt,
        notes: notes || null,
        skipped: false,
      });

    // Update plant's last care date based on task type
    const taskTypeToCareField: Record<string, string | string[]> = {
      'water': 'lastWateredAt',
      'fertilize': 'lastFertilizedAt',
      'mist': 'lastMistedAt',
      'repot_check': 'lastRepottedAt',
      'water_fertilize': ['lastWateredAt', 'lastFertilizedAt'],
    };

    const fieldsToUpdate = taskTypeToCareField[task.type];
    if (fieldsToUpdate) {
      const updateData = Array.isArray(fieldsToUpdate)
        ? Object.fromEntries(fieldsToUpdate.map(f => [f, completedAt]))
        : { [fieldsToUpdate]: completedAt };

      await db
        .update(plants)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(plants.id, task.plantId));
    }

    // Handle task based on type (recurring, one-time, or unscheduled)
    if (task.isRecurring && task.recurrencePattern) {
      // Recurring task: calculate next due date and update
      const nextDueDate = calculateNextDueDate(completedAt, task.recurrencePattern);
      await db
        .update(careTasks)
        .set({
          lastCompletedAt: completedAt,
          nextDueDate: nextDueDate,
          updatedAt: new Date(),
        })
        .where(eq(careTasks.id, taskId));
    } else if (!task.isRecurring && task.nextDueDate) {
      // One-time task with a due date: delete after completion
      await db
        .delete(careTasks)
        .where(eq(careTasks.id, taskId));
    } else {
      // Unscheduled task (no due date): just update lastCompletedAt
      await db
        .update(careTasks)
        .set({
          lastCompletedAt: completedAt,
          updatedAt: new Date(),
        })
        .where(eq(careTasks.id, taskId));
    }

    revalidatePlantPaths(task.plantId);

    return createSuccessResponseNoData();
  } catch (error) {
    console.error('Error completing task:', error);
    return createErrorResponse(error, 'Failed to complete task');
  }
}

// ============================================
// UPDATE TASK
// ============================================

export async function updateCareTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    scheduleMode?: TaskScheduleMode;
    recurrencePattern?: RecurrencePattern;
    specificDueDate?: Date;
    assignedUserId?: string | null;
  }
) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingTask = await db.query.careTasks.findFirst({
      where: and(
        eq(careTasks.id, taskId),
        eq(careTasks.userId, dbUserId)
      ),
    });

    if (!existingTask) {
      return createErrorResponse('Task not found or unauthorized');
    }

    const updateData: any = {
      lastModifiedByUserId: dbUserId,
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.assignedUserId !== undefined) {
      updateData.assignedUserId = data.assignedUserId;
    }

    // Handle schedule mode changes
    if (data.scheduleMode) {
      if (data.scheduleMode === 'recurring') {
        if (!data.recurrencePattern) {
          throw new Error('Recurrence pattern is required for recurring tasks');
        }
        updateData.isRecurring = true;
        updateData.recurrencePattern = data.recurrencePattern;
        // Recalculate next due date with new pattern
        const baseDate = existingTask.lastCompletedAt || existingTask.createdAt;
        updateData.nextDueDate = calculateNextDueDate(baseDate, data.recurrencePattern);
      } else if (data.scheduleMode === 'one-time') {
        if (!data.specificDueDate) {
          throw new Error('Due date is required for one-time tasks');
        }
        updateData.isRecurring = false;
        updateData.recurrencePattern = null;
        updateData.nextDueDate = data.specificDueDate;
      } else {
        // unscheduled
        updateData.isRecurring = false;
        updateData.recurrencePattern = null;
        updateData.nextDueDate = null;
      }
    } else if (data.recurrencePattern) {
      // Legacy support: if only recurrencePattern is provided
      updateData.recurrencePattern = data.recurrencePattern;
      const baseDate = existingTask.lastCompletedAt || existingTask.createdAt;
      updateData.nextDueDate = calculateNextDueDate(baseDate, data.recurrencePattern);
    }

    const [updatedTask] = await db
      .update(careTasks)
      .set(updateData)
      .where(eq(careTasks.id, taskId))
      .returning();

    revalidatePath(`/plants/${existingTask.plantId}`);
    revalidatePath('/dashboard');

    return createSuccessResponse(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return createErrorResponse(error, 'Failed to update task');
  }
}

// ============================================
// DELETE TASK
// ============================================

export async function deleteCareTask(taskId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingTask = await db.query.careTasks.findFirst({
      where: and(
        eq(careTasks.id, taskId),
        eq(careTasks.userId, dbUserId)
      ),
    });

    if (!existingTask) {
      return createErrorResponse('Task not found or unauthorized');
    }

    // Delete task (cascade will handle completions)
    await db
      .delete(careTasks)
      .where(eq(careTasks.id, taskId));

    revalidatePath(`/plants/${existingTask.plantId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete task',
    };
  }
}

// ============================================
// SKIP/SNOOZE TASK
// ============================================

export async function skipTask(taskId: string, daysToSkip: number) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get task details
    const task = await db.query.careTasks.findFirst({
      where: and(
        eq(careTasks.id, taskId),
        eq(careTasks.userId, dbUserId)
      ),
    });

    if (!task) {
      return createErrorResponse('Task not found or unauthorized');
    }

    if (!task.nextDueDate) {
      return {
        success: false,
        error: 'Cannot skip unscheduled task',
      };
    }

    // Calculate new due date by adding days
    const newDueDate = new Date(task.nextDueDate);
    newDueDate.setDate(newDueDate.getDate() + daysToSkip);

    // Update task
    await db
      .update(careTasks)
      .set({
        nextDueDate: newDueDate,
        updatedAt: new Date(),
      })
      .where(eq(careTasks.id, taskId));

    revalidatePlantPaths(task.plantId);

    return {
      success: true,
      data: { newDueDate },
    };
  } catch (error) {
    console.error('Error skipping task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to skip task',
    };
  }
}

// ============================================
// UPDATE TASK DUE DATE
// ============================================

export async function updateTaskDueDate(taskId: string, newDueDate: Date) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify ownership
    const existingTask = await db.query.careTasks.findFirst({
      where: and(
        eq(careTasks.id, taskId),
        eq(careTasks.userId, dbUserId)
      ),
    });

    if (!existingTask) {
      return createErrorResponse('Task not found or unauthorized');
    }

    // Update task due date
    const [updatedTask] = await db
      .update(careTasks)
      .set({
        nextDueDate: newDueDate,
        updatedAt: new Date(),
      })
      .where(eq(careTasks.id, taskId))
      .returning();

    revalidatePath(`/plants/${existingTask.plantId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error updating task due date:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task due date',
    };
  }
}

// ============================================
// GET TASKS
// ============================================

export async function getPlantTasks(plantId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify plant ownership
    await verifyPlantOwnership(plantId, dbUserId);

    const tasks = await db.query.careTasks.findMany({
      where: eq(careTasks.plantId, plantId),
      orderBy: [asc(careTasks.nextDueDate)],
      with: {
        completions: {
          orderBy: [desc(taskCompletions.completedAt)],
          limit: 5,
        },
      },
    });

    return {
      success: true,
      data: tasks,
    };
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tasks',
    };
  }
}

export async function getUpcomingTasks(daysAhead: number = 7, speciesTypeFilter?: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID to find accessible plants
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    // Get accessible plant IDs (personal + group plants)
    const accessiblePlants = await db.query.plants.findMany({
      where: userGroupId
        ? or(
            eq(plants.userId, dbUserId),
            eq(plants.plantGroupId, userGroupId)
          )
        : eq(plants.userId, dbUserId),
      columns: { id: true },
    });

    const plantIds = accessiblePlants.map(p => p.id);

    if (plantIds.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const tasks = await db.query.careTasks.findMany({
      where: and(
        inArray(careTasks.plantId, plantIds),
        gte(careTasks.nextDueDate, today),
        lte(careTasks.nextDueDate, futureDate)
      ),
      orderBy: [asc(careTasks.nextDueDate)],
      with: {
        plant: {
          columns: {
            id: true,
            name: true,
            primaryPhotoUrl: true,
            speciesType: true,
          },
        },
      },
    });

    // Filter by species type on the client side if provided
    const filteredTasks = speciesTypeFilter && speciesTypeFilter !== 'all'
      ? tasks.filter(task => task.plant.speciesType === speciesTypeFilter)
      : tasks;

    return {
      success: true,
      data: filteredTasks,
    };
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch upcoming tasks',
    };
  }
}

export async function getOverdueTasks(speciesTypeFilter?: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Get user's group ID to find accessible plants
    const { getUserSingleGroupId } = await import('@/lib/auth/group-auth');
    const userGroupId = await getUserSingleGroupId(clerkUserId);

    // Get accessible plant IDs (personal + group plants)
    const accessiblePlants = await db.query.plants.findMany({
      where: userGroupId
        ? or(
            eq(plants.userId, dbUserId),
            eq(plants.plantGroupId, userGroupId)
          )
        : eq(plants.userId, dbUserId),
      columns: { id: true },
    });

    const plantIds = accessiblePlants.map(p => p.id);

    if (plantIds.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const today = new Date();

    const tasks = await db.query.careTasks.findMany({
      where: and(
        inArray(careTasks.plantId, plantIds),
        lte(careTasks.nextDueDate, today)
      ),
      orderBy: [asc(careTasks.nextDueDate)],
      with: {
        plant: {
          columns: {
            id: true,
            name: true,
            primaryPhotoUrl: true,
            speciesType: true,
          },
        },
      },
    });

    // Filter by species type on the client side if provided
    const filteredTasks = speciesTypeFilter && speciesTypeFilter !== 'all'
      ? tasks.filter(task => task.plant.speciesType === speciesTypeFilter)
      : tasks;

    return {
      success: true,
      data: filteredTasks,
    };
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch overdue tasks',
    };
  }
}

// ============================================
// CONVERT TASK TO UNSCHEDULED
// ============================================

export async function convertTaskToUnscheduled(taskId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify task ownership
    const existingTask = await db.query.careTasks.findFirst({
      where: and(
        eq(careTasks.id, taskId),
        eq(careTasks.userId, dbUserId)
      ),
    });

    if (!existingTask) {
      return createErrorResponse('Task not found or unauthorized');
    }

    // Update task to be non-recurring
    const [updatedTask] = await db
      .update(careTasks)
      .set({
        isRecurring: false,
        recurrencePattern: null,
        updatedAt: new Date(),
      })
      .where(eq(careTasks.id, taskId))
      .returning();

    revalidatePath('/dashboard');

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error converting task to unscheduled:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert task',
    };
  }
}

// ============================================
// TASK ASSIGNMENT
// ============================================

export async function assignTaskToUser(taskId: string, assignedUserId: string | null) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify task ownership or group membership
    const task = await db.query.careTasks.findFirst({
      where: eq(careTasks.id, taskId),
      with: {
        plant: {
          with: {
            plantGroup: true,
          },
        },
      },
    });

    if (!task) {
      return {
        success: false,
        error: 'Task not found',
      };
    }

    // Check authorization
    if (task.userId !== dbUserId && !task.plant.plantGroup) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const [updatedTask] = await db
      .update(careTasks)
      .set({
        assignedUserId,
        lastModifiedByUserId: dbUserId,
        updatedAt: new Date(),
      })
      .where(eq(careTasks.id, taskId))
      .returning();

    revalidatePlantPaths(task.plantId);

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error assigning task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign task',
    };
  }
}

export async function getMyAssignedTasks(groupId?: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    let whereConditions = eq(careTasks.assignedUserId, dbUserId);

    if (groupId) {
      // Filter by group
      const group = await db.query.plantGroups.findFirst({
        where: (plantGroups, { eq }) => eq(plantGroups.clerkOrgId, groupId),
      });

      if (group) {
        const tasks = await db.query.careTasks.findMany({
          where: whereConditions,
          orderBy: [asc(careTasks.nextDueDate)],
          with: {
            plant: {
              with: {
                media: {
                  where: (plantMedia, { eq }) => eq(plantMedia.isPrimary, true),
                  limit: 1,
                },
              },
            },
          },
        });

        return {
          success: true,
          data: tasks.filter((t) => t.plant?.plantGroupId === group.id),
        };
      }
    }

    const tasks = await db.query.careTasks.findMany({
      where: whereConditions,
      orderBy: [asc(careTasks.nextDueDate)],
      with: {
        plant: {
          with: {
            media: {
              where: (plantMedia, { eq }) => eq(plantMedia.isPrimary, true),
              limit: 1,
            },
            plantGroup: true,
          },
        },
      },
    });

    return {
      success: true,
      data: tasks,
    };
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assigned tasks',
    };
  }
}

export async function getTaskHistory(taskId: string) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    const task = await db.query.careTasks.findFirst({
      where: eq(careTasks.id, taskId),
      with: {
        createdBy: true,
        lastModifiedBy: true,
        assignedUser: true,
        completions: {
          orderBy: [desc(taskCompletions.completedAt)],
          with: {
            user: true,
          },
          limit: 10,
        },
      },
    });

    if (!task) {
      return {
        success: false,
        error: 'Task not found',
      };
    }

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error('Error fetching task history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch task history',
    };
  }
}

// ============================================
// BULK COMPLETE TASKS
// ============================================

export async function bulkCompleteTasks(taskIds: string[]) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    if (!taskIds || taskIds.length === 0) {
      return createErrorResponse('No tasks provided');
    }

    const completedAt = new Date();
    const results = {
      completed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each task
    for (const taskId of taskIds) {
      try {
        // Get task details
        const task = await db.query.careTasks.findFirst({
          where: and(
            eq(careTasks.id, taskId),
            eq(careTasks.userId, dbUserId)
          ),
        });

        if (!task) {
          results.failed++;
          results.errors.push(`Task ${taskId} not found or unauthorized`);
          continue;
        }

        // Record completion
        await db
          .insert(taskCompletions)
          .values({
            taskId,
            userId: dbUserId,
            completedAt,
            notes: null,
            skipped: false,
          });

        // Update plant's last care date based on task type
        const taskTypeToCareField: Record<string, string | string[]> = {
          'water': 'lastWateredAt',
          'fertilize': 'lastFertilizedAt',
          'mist': 'lastMistedAt',
          'repot_check': 'lastRepottedAt',
          'water_fertilize': ['lastWateredAt', 'lastFertilizedAt'],
        };

        const fieldsToUpdate = taskTypeToCareField[task.type];
        if (fieldsToUpdate) {
          const updateData = Array.isArray(fieldsToUpdate)
            ? Object.fromEntries(fieldsToUpdate.map(f => [f, completedAt]))
            : { [fieldsToUpdate]: completedAt };

          await db
            .update(plants)
            .set({
              ...updateData,
              updatedAt: new Date(),
            })
            .where(eq(plants.id, task.plantId));
        }

        // Handle task based on type (recurring, one-time, or unscheduled)
        if (task.isRecurring && task.recurrencePattern) {
          // Recurring task: calculate next due date and update
          const nextDueDate = calculateNextDueDate(completedAt, task.recurrencePattern);
          await db
            .update(careTasks)
            .set({
              lastCompletedAt: completedAt,
              nextDueDate: nextDueDate,
              updatedAt: new Date(),
            })
            .where(eq(careTasks.id, taskId));
        } else if (!task.isRecurring && task.nextDueDate) {
          // One-time task with a due date: delete after completion
          await db
            .delete(careTasks)
            .where(eq(careTasks.id, taskId));
        } else {
          // Unscheduled task (no due date): just update lastCompletedAt
          await db
            .update(careTasks)
            .set({
              lastCompletedAt: completedAt,
              updatedAt: new Date(),
            })
            .where(eq(careTasks.id, taskId));
        }

        results.completed++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Error completing task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Revalidate common paths
    revalidateCommonPaths();

    if (results.failed > 0) {
      return {
        success: false,
        error: `Completed ${results.completed} tasks, but ${results.failed} failed`,
        data: results,
      };
    }

    return createSuccessResponse(results);
  } catch (error) {
    console.error('Error bulk completing tasks:', error);
    return createErrorResponse(error, 'Failed to bulk complete tasks');
  }
}
