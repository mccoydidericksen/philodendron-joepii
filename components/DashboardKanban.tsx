'use client';

import { useState } from 'react';
import { TaskBoardToggle } from './TaskBoardToggle';
import { TaskBoardByType } from './TaskBoardByType';
import { TaskBoardByStatus } from './TaskBoardByStatus';
import type { CareTask } from '@/lib/db/types';

interface DashboardKanbanProps {
  tasks: Array<CareTask & {
    plant: {
      id: string;
      name: string;
    };
  }>;
}

export function DashboardKanban({ tasks }: DashboardKanbanProps) {
  const [view, setView] = useState<'type' | 'status'>('status');

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <TaskBoardToggle view={view} onViewChange={setView} />

      {/* Kanban Board */}
      <div className="min-h-[600px]">
        {view === 'type' ? (
          <TaskBoardByType tasks={tasks} />
        ) : (
          <TaskBoardByStatus tasks={tasks} />
        )}
      </div>
    </div>
  );
}
