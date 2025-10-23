'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard } from './KanbanTaskCard';
import { TaskModal } from './TaskModal';
import { updateTaskDueDate, convertTaskToUnscheduled } from '@/app/actions/tasks';
import type { CareTask } from '@/lib/db/types';

interface TaskBoardByStatusProps {
  tasks: Array<CareTask & {
    plant: {
      id: string;
      name: string;
      primaryPhotoUrl: string | null;
    };
  }>;
}

type TaskStatus = 'overdue' | 'due-soon' | 'upcoming' | 'unscheduled';

function getTaskStatus(task: CareTask): TaskStatus {
  // Check if task is unscheduled (not recurring)
  if (!task.isRecurring) return 'unscheduled';

  const now = new Date();
  const due = new Date(task.nextDueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 1) return 'due-soon';
  return 'upcoming';
}

function calculateNewDueDate(targetStatus: TaskStatus): Date {
  const now = new Date();
  const newDate = new Date(now);

  switch (targetStatus) {
    case 'overdue':
      // Set to yesterday
      newDate.setDate(newDate.getDate() - 1);
      break;
    case 'due-soon':
      // Set to tomorrow
      newDate.setDate(newDate.getDate() + 1);
      break;
    case 'upcoming':
      // Set to 3 days from now
      newDate.setDate(newDate.getDate() + 3);
      break;
  }

  return newDate;
}

const STATUS_COLUMNS = [
  { id: 'overdue', label: 'Overdue', icon: '🔴' },
  { id: 'due-soon', label: 'Due Soon', icon: '🟠' },
  { id: 'upcoming', label: 'Upcoming', icon: '🟢' },
  { id: 'unscheduled', label: 'Unscheduled', icon: '⚪' },
] as const;

export function TaskBoardByStatus({ tasks }: TaskBoardByStatusProps) {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null);
  const [activeTask, setActiveTask] = useState<typeof tasks[0] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = STATUS_COLUMNS.map(({ id }) => {
    const statusTasks = tasks
      .filter((task) => getTaskStatus(task) === id)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

    return {
      status: id as TaskStatus,
      tasks: statusTasks,
      count: statusTasks.length,
    };
  });

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveTask(null);

    if (!over || active.id === over.id) {
      return;
    }

    const targetStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);

    if (!task) return;

    // Handle conversion to unscheduled
    if (targetStatus === 'unscheduled') {
      // Optimistically update UI
      router.refresh();

      // Convert to unscheduled task
      const result = await convertTaskToUnscheduled(task.id);

      if (!result.success) {
        alert(result.error || 'Failed to convert task to unscheduled');
        router.refresh();
      }
      return;
    }

    // Calculate new due date based on target column
    const newDueDate = calculateNewDueDate(targetStatus);

    // Optimistically update UI
    router.refresh();

    // Update in database
    const result = await updateTaskDueDate(task.id, newDueDate);

    if (!result.success) {
      alert(result.error || 'Failed to update task');
      router.refresh();
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map(({ id, label, icon }, index) => {
            const { tasks: columnTasks, count } = tasksByStatus[index];
            const taskIds = columnTasks.map((t) => t.id);

            return (
              <KanbanColumn
                key={id}
                id={id}
                title={label}
                icon={icon}
                count={count}
                isDroppable={true}
                taskIds={taskIds}
              >
                {columnTasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    isDraggable={true}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3">
              <KanbanTaskCard task={activeTask} isDraggable={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
