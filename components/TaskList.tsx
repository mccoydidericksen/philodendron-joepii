'use client';

import { TaskCard } from './TaskCard';
import type { CareTaskWithCompletions } from '@/lib/db/types';

interface TaskListProps {
  tasks: CareTaskWithCompletions[];
  onUpdate?: () => void;
}

export function TaskList({ tasks, onUpdate }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border-2 border-sage bg-card-bg p-12 text-center">
        <div className="mx-auto max-w-sm">
          <p className="text-2xl mb-2">📅</p>
          <h3 className="text-lg font-semibold text-moss-dark mb-2">No care tasks yet</h3>
          <p className="text-soil text-sm">
            Add a care task to keep your plant healthy and thriving
          </p>
        </div>
      </div>
    );
  }

  // Separate overdue, due soon, and upcoming tasks
  const now = new Date();
  const overdueTasks = tasks.filter(task => task.nextDueDate && new Date(task.nextDueDate) < now);
  const dueSoonTasks = tasks.filter(task => {
    if (!task.nextDueDate) return false;
    const dueDate = new Date(task.nextDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 1;
  });
  const upcomingTasks = tasks.filter(task => {
    if (!task.nextDueDate) return false;
    const dueDate = new Date(task.nextDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 1;
  });

  return (
    <div className="space-y-6">
      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-700 mb-3">
            Overdue ({overdueTasks.length})
          </h3>
          <div className="space-y-3">
            {overdueTasks.map(task => (
              <TaskCard key={task.id} task={task} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Due Soon Tasks */}
      {dueSoonTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-orange-700 mb-3">
            Due Soon ({dueSoonTasks.length})
          </h3>
          <div className="space-y-3">
            {dueSoonTasks.map(task => (
              <TaskCard key={task.id} task={task} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-moss-dark mb-3">
            Upcoming ({upcomingTasks.length})
          </h3>
          <div className="space-y-3">
            {upcomingTasks.map(task => (
              <TaskCard key={task.id} task={task} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
