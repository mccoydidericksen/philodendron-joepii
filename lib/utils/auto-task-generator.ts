import { db } from '@/lib/db';
import { careTasks } from '@/lib/db/schema';
import type { CareTaskType, RecurrencePattern } from '@/lib/db/types';
import { calculateNextDueDate } from './date-helpers';
import { TASK_DEFAULTS } from '@/lib/constants/task-defaults';

// Filter to only the task types we auto-generate
const AUTO_GENERATED_TASK_TYPES = ['water', 'fertilize', 'mist', 'repot_check'] as const;

/**
 * Create default care tasks for a newly added plant
 *
 * @param plantId - Plant database ID
 * @param userId - User database ID
 * @param lastCareDates - Object with optional last care dates
 * @returns Array of created task IDs
 */
export async function createDefaultTasksForPlant(
  plantId: string,
  userId: string,
  lastCareDates: {
    lastWateredAt?: Date | null;
    lastFertilizedAt?: Date | null;
    lastMistedAt?: Date | null;
    lastRepottedAt?: Date | null;
  }
): Promise<string[]> {
  const now = new Date();
  const createdTaskIds: string[] = [];

  // Map task types to their last care date fields
  const taskTypeToDateField: Record<
    typeof AUTO_GENERATED_TASK_TYPES[number],
    keyof typeof lastCareDates
  > = {
    water: 'lastWateredAt',
    fertilize: 'lastFertilizedAt',
    mist: 'lastMistedAt',
    repot_check: 'lastRepottedAt',
  };

  // Create a task for each auto-generated care type
  for (const taskType of AUTO_GENERATED_TASK_TYPES) {
    const defaults = TASK_DEFAULTS[taskType];
    const dateField = taskTypeToDateField[taskType];
    const lastCareDate = lastCareDates[dateField];

    // Calculate base date: use last care date if provided, otherwise use today
    const baseDate = lastCareDate || now;

    // Calculate next due date
    const recurrencePattern: RecurrencePattern = {
      frequency: defaults.frequency,
      unit: defaults.unit,
    };
    const nextDueDate = calculateNextDueDate(baseDate, recurrencePattern);

    // Create the task
    try {
      const [newTask] = await db
        .insert(careTasks)
        .values({
          plantId,
          userId,
          type: taskType as CareTaskType,
          title: defaults.title,
          description: `Automatically created ${defaults.title.toLowerCase()} task`,
          isRecurring: true,
          recurrencePattern,
          nextDueDate,
          lastCompletedAt: lastCareDate || null, // Set if provided
          assignedUserId: userId,
          createdByUserId: userId,
        })
        .returning();

      createdTaskIds.push(newTask.id);
    } catch (error) {
      console.error(`Failed to create ${taskType} task for plant ${plantId}:`, error);
      // Continue creating other tasks even if one fails
    }
  }

  return createdTaskIds;
}

/**
 * Get the default cadence for a specific task type
 */
export function getTaskDefaultCadence(taskType: CareTaskType): RecurrencePattern | null {
  if (taskType in TASK_DEFAULTS) {
    const defaults = TASK_DEFAULTS[taskType];
    return {
      frequency: defaults.frequency,
      unit: defaults.unit,
    };
  }
  return null;
}
