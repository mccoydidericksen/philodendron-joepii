'use client';

interface TaskBoardToggleProps {
  view: 'type' | 'status';
  onViewChange: (view: 'type' | 'status') => void;
}

export function TaskBoardToggle({ view, onViewChange }: TaskBoardToggleProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-soil">View by:</span>
      <div className="inline-flex rounded-lg border-2 border-sage bg-card-bg p-1">
        <button
          onClick={() => onViewChange('status')}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              view === 'status'
                ? 'bg-moss text-white shadow-sm'
                : 'text-soil hover:text-moss-dark'
            }
          `}
        >
          🎯 Status
        </button>
        <button
          onClick={() => onViewChange('type')}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              view === 'type'
                ? 'bg-moss text-white shadow-sm'
                : 'text-soil hover:text-moss-dark'
            }
          `}
        >
          📋 Task Type
        </button>
      </div>
      {view === 'status' && (
        <span className="text-xs text-soil italic">
          Drag tasks between columns to reschedule
        </span>
      )}
    </div>
  );
}
