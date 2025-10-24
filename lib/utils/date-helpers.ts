import type { RecurrencePattern } from '@/lib/db/types';

/**
 * Calculate the next due date based on a starting date and recurrence pattern
 * @param fromDate Starting date to calculate from
 * @param pattern Recurrence pattern with frequency and unit
 * @returns Next due date
 */
export function calculateNextDueDate(fromDate: Date, pattern: RecurrencePattern): Date {
  const next = new Date(fromDate);

  switch (pattern.unit) {
    case 'days':
      next.setDate(next.getDate() + pattern.frequency);
      break;
    case 'weeks':
      next.setDate(next.getDate() + pattern.frequency * 7);
      break;
    case 'months':
      next.setMonth(next.getMonth() + pattern.frequency);
      break;
  }

  return next;
}
