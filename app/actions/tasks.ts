'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { careTasks, taskCompletions, plants } from '@/lib/db/schema';
import { eq, and, desc, asc, lte, gte } from 'drizzle-orm';
import type { CareTaskType, RecurrencePattern } from '@/lib/db/types';

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

async function verifyPlantOwnership(plantId: string, userId: string) {
  const plant = await db.query.plants.findFirst({
    where: and(
      eq(plants.id, plantId),
      eq(plants.userId, userId)
    ),
  });

  if (!plant) {
    throw new Error('Plant not found or unauthorized');
  }

  return plant;
}

export async function getTaskDefaults(taskType: CareTaskType): Promise<{ frequency: number; unit: 'days' | 'weeks' | 'months'; title: string }> {
  const defaults: Record<CareTaskType, { frequency: number; unit: 'days' | 'weeks' | 'months'; title: string }> = {
    water: { frequency: 6, unit: 'days', title: 'Water' },
    fertilize: { frequency: 12, unit: 'days', title: 'Fertilize' },
    mist: { frequency: 3, unit: 'days', title: 'Mist' },
    repot_check: { frequency: 6, unit: 'months', title: 'Check for Repotting' },
    water_fertilize: { frequency: 12, unit: 'days', title: 'Water & Fertilize' },
    prune: { frequency: 30, unit: 'days', title: 'Prune' },
    rotate: { frequency: 7, unit: 'days', title: 'Rotate' },
    custom: { frequency: 7, unit: 'days', title: 'Custom Task' },
  };

  return defaults[taskType] || defaults.custom;
}

// Internal helper function (not exported to avoid Server Action requirement)
function calculateNextDueDate(fromDate: Date, pattern: RecurrencePattern): Date {
  const next = new Date(fromDate);

  switch (pattern.unit) {
    case 'days':
      next.setDate(next.getDate() + pattern.frequency);
      break;
    case 'weeks':
      next.setDate(next.getDate() + (pattern.frequency * 7));
      break;
    case 'months':
      next.setMonth(next.getMonth() + pattern.frequency);
      break;
  }

  return next;
}

// ============================================
// CREATE TASK
// ============================================

export async function createCareTask(data: {
  plantId: string;
  type: CareTaskType;
  title: string;
  description?: string;
  recurrencePattern: RecurrencePattern;
  startDate?: Date;
}) {
  try {
    const clerkUserId = await getUserId();
    const dbUserId = await getDbUserId(clerkUserId);

    // Verify plant ownership
    await verifyPlantOwnership(data.plantId, dbUserId);

    const startDate = data.startDate || new Date();
    const nextDueDate = calculateNextDueDate(startDate, data.recurrencePattern);

    const [newTask] = await db
      .insert(careTasks)
      .values({
        plantId: data.plantId,
        userId: dbUserId,
        type: data.type,
        title: data.title,
        description: data.description || null,
        isRecurring: true,
        recurrencePattern: data.recurrencePattern,
        nextDueDate: nextDueDate,
      })
      .returning();

    revalidatePath(`/plants/${data.plantId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      data: newTask,
    };
  } catch (error) {
    console.error('Error creating task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task',
    };
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
      return {
        success: false,
        error: 'Task not found or unauthorized',
      };
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

    // Calculate next due date
    const nextDueDate = task.recurrencePattern
      ? calculateNextDueDate(completedAt, task.recurrencePattern)
      : null;

    // Update task
    await db
      .update(careTasks)
      .set({
        lastCompletedAt: completedAt,
        nextDueDate: nextDueDate || task.nextDueDate,
        updatedAt: new Date(),
      })
      .where(eq(careTasks.id, taskId));

    revalidatePath(`/plants/${task.plantId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error completing task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete task',
    };
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
    recurrencePattern?: RecurrencePattern;
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
      return {
        success: false,
        error: 'Task not found or unauthorized',
      };
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.recurrencePattern) {
      updateData.recurrencePattern = data.recurrencePattern;
      // Recalculate next due date with new pattern
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

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task',
    };
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
      return {
        success: false,
        error: 'Task not found or unauthorized',
      };
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
      return {
        success: false,
        error: 'Task not found or unauthorized',
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

    revalidatePath(`/plants/${task.plantId}`);
    revalidatePath('/dashboard');

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
      return {
        success: false,
        error: 'Task not found or unauthorized',
      };
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

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const tasks = await db.query.careTasks.findMany({
      where: and(
        eq(careTasks.userId, dbUserId),
        lte(careTasks.nextDueDate, futureDate)
      ),
      orderBy: [asc(careTasks.nextDueDate)],
      with: {
        plant: true,
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

    const today = new Date();

    const tasks = await db.query.careTasks.findMany({
      where: and(
        eq(careTasks.userId, dbUserId),
        lte(careTasks.nextDueDate, today)
      ),
      orderBy: [asc(careTasks.nextDueDate)],
      with: {
        plant: true,
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
      return {
        success: false,
        error: 'Task not found or unauthorized',
      };
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
