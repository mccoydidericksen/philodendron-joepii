'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeCareTask, deleteCareTask } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import type { CareTask } from '@/lib/db/types';

interface TaskCardProps {
  task: CareTask;
  onUpdate?: () => void;
}

function getTaskIcon(type: string): string {
  const icons: Record<string, string> = {
    water: '💧',
    fertilize: '🌱',
    water_fertilize: '💧🌱',
    mist: '💦',
    repot_check: '🪴',
    prune: '✂️',
    rotate: '🔄',
    custom: '📋',
  };
  return icons[type] || '📋';
}

function getTaskStatus(dueDate: Date): 'overdue' | 'due-soon' | 'upcoming' {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 1) return 'due-soon';
  return 'upcoming';
}

function getRelativeTimeString(dueDate: Date): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return `Overdue by ${absDays} ${absDays === 1 ? 'day' : 'days'}`;
  }
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const status = getTaskStatus(task.nextDueDate);
  const statusColors = {
    'overdue': 'border-red-300 bg-red-50',
    'due-soon': 'border-orange-300 bg-orange-50',
    'upcoming': 'border-sage bg-card-bg',
  };

  const statusTextColors = {
    'overdue': 'text-red-700',
    'due-soon': 'text-orange-700',
    'upcoming': 'text-soil',
  };

  async function handleComplete() {
    setIsCompleting(true);
    const result = await completeCareTask(task.id, completionNotes || undefined);
    setIsCompleting(false);

    if (result.success) {
      setShowNotes(false);
      setCompletionNotes('');
      onUpdate?.();
      router.refresh();
    } else {
      alert(result.error || 'Failed to complete task');
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    const result = await deleteCareTask(task.id);
    setIsDeleting(false);

    if (result.success) {
      onUpdate?.();
      router.refresh();
    } else {
      alert(result.error || 'Failed to delete task');
    }
  }

  return (
    <div className={`rounded-lg border-2 ${statusColors[status]} p-4 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-3xl">{getTaskIcon(task.type)}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-moss-dark">{task.title}</h4>
            {task.description && (
              <p className="text-sm text-soil mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className={`font-medium ${statusTextColors[status]}`}>
                {getRelativeTimeString(task.nextDueDate)}
              </span>
              {task.recurrencePattern && (
                <span className="text-soil">
                  Every {task.recurrencePattern.frequency} {task.recurrencePattern.unit}
                </span>
              )}
            </div>
            {task.lastCompletedAt && (
              <p className="text-xs text-soil mt-1">
                Last completed: {new Date(task.lastCompletedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className="bg-moss hover:bg-moss-light text-white"
          >
            ✓ Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            {isDeleting ? '...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Completion notes */}
      {showNotes && (
        <div className="mt-4 pt-4 border-t-2 border-sage space-y-3">
          <div>
            <label htmlFor={`notes-${task.id}`} className="block text-sm font-medium text-soil mb-1">
              Add notes (optional)
            </label>
            <textarea
              id={`notes-${task.id}`}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={2}
              placeholder="Any observations or notes..."
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark text-sm focus:border-moss focus:outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNotes(false);
                setCompletionNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isCompleting}
              className="bg-moss hover:bg-moss-light text-white"
            >
              {isCompleting ? 'Saving...' : 'Mark Complete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
