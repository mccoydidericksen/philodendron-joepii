'use client';

import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard } from './KanbanTaskCard';
import { TaskModal } from './TaskModal';
import type { CareTask, CareTaskType } from '@/lib/db/types';

interface TaskBoardByTypeProps {
  tasks: Array<CareTask & {
    plant: {
      id: string;
      name: string;
    };
  }>;
}

const TASK_TYPES: Array<{
  type: CareTaskType;
  label: string;
  icon: string;
}> = [
  { type: 'water', label: 'Water', icon: '💧' },
  { type: 'fertilize', label: 'Fertilize', icon: '🌱' },
  { type: 'mist', label: 'Mist', icon: '💦' },
  { type: 'repot_check', label: 'Repot', icon: '🪴' },
  { type: 'custom', label: 'Custom', icon: '📋' },
];

export function TaskBoardByType({ tasks }: TaskBoardByTypeProps) {
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null);

  // Group tasks by type and sort by due date
  const tasksByType = TASK_TYPES.map(({ type, label, icon }) => {
    const typeTasks = tasks
      .filter((task) => task.type === type)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

    return {
      type,
      label,
      icon,
      tasks: typeTasks,
      count: typeTasks.length,
    };
  });

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {tasksByType.map(({ type, label, icon, tasks: columnTasks, count }) => (
          <KanbanColumn
            key={type}
            id={type}
            title={label}
            icon={icon}
            count={count}
            isDroppable={false}
          >
            {columnTasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                isDraggable={false}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
