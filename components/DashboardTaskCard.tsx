'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { completeCareTask } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import type { CareTask } from '@/lib/db/types';

interface DashboardTaskCardProps {
  task: CareTask & {
    plant: {
      id: string;
      name: string;
    };
  };
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
  if (diffDays <= 2) return `Due in ${diffDays} days`;
  return `Due ${due.toLocaleDateString()}`;
}

function getTaskStatus(dueDate: Date): 'overdue' | 'due-soon' | 'upcoming' {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 2) return 'due-soon';
  return 'upcoming';
}

export function DashboardTaskCard({ task }: DashboardTaskCardProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

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
    if (!confirm(`Mark "${task.title}" as complete?`)) return;

    setIsCompleting(true);
    const result = await completeCareTask(task.id);
    setIsCompleting(false);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Failed to complete task');
    }
  }

  return (
    <div className={`rounded-lg border-2 ${statusColors[status]} p-4 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{getTaskIcon(task.type)}</span>
          <div className="flex-1 min-w-0">
            <Link
              href={`/plants/${task.plant.id}`}
              className="font-semibold text-moss hover:text-moss-dark transition-colors"
            >
              {task.plant.name}
            </Link>
            <p className="text-sm text-moss-dark mt-0.5">{task.title}</p>
            <p className={`text-xs font-medium mt-1 ${statusTextColors[status]}`}>
              {getRelativeTimeString(task.nextDueDate)}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleComplete}
          disabled={isCompleting}
          className="bg-moss hover:bg-moss-light text-white flex-shrink-0"
        >
          {isCompleting ? '...' : '✓'}
        </Button>
      </div>
    </div>
  );
}
