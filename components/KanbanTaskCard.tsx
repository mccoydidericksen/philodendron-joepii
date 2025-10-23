'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CareTask } from '@/lib/db/types';

interface KanbanTaskCardProps {
  task: CareTask & {
    plant: {
      id: string;
      name: string;
    };
  };
  isDraggable?: boolean;
  onClick?: () => void;
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
    return `${absDays}d overdue`;
  }
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays}d`;
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTaskStatus(dueDate: Date): 'overdue' | 'due-soon' | 'upcoming' {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 2) return 'due-soon';
  return 'upcoming';
}

export function KanbanTaskCard({ task, isDraggable = false, onClick }: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const status = getTaskStatus(task.nextDueDate);
  const statusColors = {
    'overdue': 'border-l-red-500 bg-red-50/50',
    'due-soon': 'border-l-orange-500 bg-orange-50/50',
    'upcoming': 'border-l-green-500 bg-green-50/50',
  };

  const statusBadgeColors = {
    'overdue': 'bg-red-100 text-red-700',
    'due-soon': 'bg-orange-100 text-orange-700',
    'upcoming': 'bg-green-100 text-green-700',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDraggable ? listeners : {})}
      onClick={onClick}
      className={`
        group relative rounded-lg border-2 border-sage bg-card-bg p-3
        border-l-4 ${statusColors[status]}
        cursor-pointer transition-all
        hover:shadow-md hover:border-moss
        ${isDragging ? 'cursor-grabbing' : isDraggable ? 'cursor-grab' : 'cursor-pointer'}
      `}
    >
      {/* Task Icon & Title */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xl flex-shrink-0">{getTaskIcon(task.type)}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-moss-dark text-sm truncate">
            {task.title}
          </h4>
        </div>
      </div>

      {/* Plant Name */}
      <p className="text-xs text-soil mb-2 truncate">
        {task.plant.name}
      </p>

      {/* Due Date Badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusBadgeColors[status]}`}>
          {getRelativeTimeString(task.nextDueDate)}
        </span>

        {/* Recurrence indicator */}
        {task.recurrencePattern && (
          <span className="text-xs text-soil">
            🔄 Every {task.recurrencePattern.frequency}{task.recurrencePattern.unit.charAt(0)}
          </span>
        )}
      </div>

      {/* Hover overlay for drag indicator */}
      {isDraggable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-soil" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
      )}
    </div>
  );
}
