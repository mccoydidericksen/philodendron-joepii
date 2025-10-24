'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { completeCareTask } from '@/app/actions/tasks';
import type { CareTask } from '@/lib/db/types';

interface ChoreCardProps {
  task: CareTask & {
    plant: {
      id: string;
      name: string;
      primaryPhotoUrl: string | null;
      speciesType: string;
    };
  };
  onComplete: (taskId: string) => void;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
  water_fertilize: 'Water & Fertilize',
  mist: 'Mist',
  repot_check: 'Check for Repotting',
  prune: 'Prune',
  rotate: 'Rotate',
  custom: 'Custom Task',
};

const TASK_TYPE_ICONS: Record<string, string> = {
  water: '💧',
  fertilize: '🌱',
  water_fertilize: '💧🌱',
  mist: '💨',
  repot_check: '🪴',
  prune: '✂️',
  rotate: '🔄',
  custom: '📋',
};

export function ChoreCard({ task, onComplete }: ChoreCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      const result = await completeCareTask(task.id);

      if (result.success) {
        startTransition(() => {
          onComplete(task.id);
        });
      } else {
        console.error('Failed to complete task:', result.error);
        setIsCompleting(false);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      setIsCompleting(false);
    }
  };

  const isOverdue = task.nextDueDate ? new Date(task.nextDueDate) < new Date() : false;

  return (
    <div
      className={`rounded-lg border-2 bg-card-bg overflow-hidden transition-all ${
        isCompleting ? 'opacity-50 scale-95' : 'hover:shadow-lg'
      } ${isOverdue ? 'border-terracotta' : 'border-sage'}`}
    >
      {/* Plant Image */}
      <div className="relative h-48 bg-sage-light flex-shrink-0">
        {task.plant.primaryPhotoUrl ? (
          <img
            src={task.plant.primaryPhotoUrl}
            alt={task.plant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🪴
          </div>
        )}
        {isOverdue && (
          <div className="absolute top-2 left-2 bg-terracotta text-white text-xs font-semibold px-2 py-1 rounded-md">
            Overdue
          </div>
        )}
      </div>

      {/* Plant Info & Task Details */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-moss-dark">
          {task.plant.name}
        </h3>
        <p className="text-sm text-soil mt-1 italic">
          {task.plant.speciesType}
        </p>

        {/* Task Type */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{TASK_TYPE_ICONS[task.type] || '📋'}</span>
            <div>
              <p className="text-base font-medium text-moss">
                {TASK_TYPE_LABELS[task.type] || task.title}
              </p>
              {task.description && (
                <p className="text-xs text-soil mt-1">{task.description}</p>
              )}
            </div>
          </div>

          {/* Complete Button */}
          <button
            onClick={handleComplete}
            disabled={isCompleting || isPending}
            className={`flex-shrink-0 rounded-full p-3 transition-all ${
              isCompleting || isPending
                ? 'bg-sage/50 cursor-not-allowed'
                : 'bg-moss hover:bg-moss-dark active:scale-95'
            }`}
            aria-label="Mark as complete"
            title="Mark as complete"
          >
            <CheckCircle2
              className={`w-6 h-6 text-white ${
                isCompleting || isPending ? 'animate-pulse' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
