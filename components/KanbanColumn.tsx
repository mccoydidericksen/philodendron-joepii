'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ReactNode } from 'react';

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: string;
  count: number;
  children: ReactNode;
  isDroppable?: boolean;
  taskIds?: string[];
  className?: string;
}

export function KanbanColumn({
  id,
  title,
  icon,
  count,
  children,
  isDroppable = false,
  taskIds = [],
  className = '',
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !isDroppable,
  });

  return (
    <div className={`flex flex-col h-full min-w-[300px] max-w-[300px] ${className}`}>
      {/* Column Header */}
      <div className="sticky top-0 z-10 bg-cream pb-3">
        <div className="flex items-center justify-between px-4 py-3 bg-sage rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className="font-semibold text-moss-dark">{title}</h3>
          </div>
          <span className="px-2 py-0.5 bg-moss-dark text-white text-xs font-medium rounded-full">
            {count}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto px-2 py-2 space-y-3
          rounded-lg transition-colors max-h-[600px]
          ${isOver && isDroppable ? 'bg-sage/30' : ''}
        `}
      >
        {isDroppable ? (
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
        ) : (
          children
        )}

        {/* Empty State */}
        {count === 0 && (
          <div className="flex items-center justify-center h-32 text-center">
            <p className="text-sm text-soil">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
