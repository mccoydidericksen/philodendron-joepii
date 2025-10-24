import type { CareTaskType } from '@/lib/db/types';

/**
 * Default task configurations for each care task type
 * Used for auto-task generation and task creation defaults
 */
export const TASK_DEFAULTS = {
  water: { frequency: 6, unit: 'days' as const, title: 'Water' },
  fertilize: { frequency: 12, unit: 'days' as const, title: 'Fertilize' },
  mist: { frequency: 3, unit: 'days' as const, title: 'Mist' },
  repot_check: { frequency: 6, unit: 'months' as const, title: 'Check for Repotting' },
  water_fertilize: { frequency: 12, unit: 'days' as const, title: 'Water & Fertilize' },
  prune: { frequency: 30, unit: 'days' as const, title: 'Prune' },
  rotate: { frequency: 7, unit: 'days' as const, title: 'Rotate' },
  custom: { frequency: 7, unit: 'days' as const, title: 'Custom Task' },
} as const satisfies Record<
  CareTaskType,
  { frequency: number; unit: 'days' | 'weeks' | 'months'; title: string }
>;

export type TaskDefaultsType = typeof TASK_DEFAULTS;
