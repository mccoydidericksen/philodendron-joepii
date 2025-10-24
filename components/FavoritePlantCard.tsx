'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { FavoriteStarButton } from './FavoriteStarButton';
import type { Plant, CareTask, PlantMedia } from '@/lib/db/types';
import { formatDistanceToNow, isPast, isFuture } from 'date-fns';

interface FavoritePlantCardProps {
  plant: Plant & { careTasks?: CareTask[]; media?: PlantMedia[] };
  onChangeClick?: () => void;
}

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

export function FavoritePlantCard({ plant, onChangeClick }: FavoritePlantCardProps) {
  const primaryMedia = plant.media?.[0];
  const today = new Date();

  // Separate tasks into overdue and upcoming
  const overdueTasks = plant.careTasks?.filter(
    (task) => task.nextDueDate && isPast(new Date(task.nextDueDate)) && new Date(task.nextDueDate).toDateString() !== today.toDateString()
  ) || [];

  const upcomingTasks = plant.careTasks?.filter(
    (task) => task.nextDueDate && (isFuture(new Date(task.nextDueDate)) || new Date(task.nextDueDate).toDateString() === today.toDateString())
  ) || [];

  const formatTaskDate = (date: Date) => {
    const taskDate = new Date(date);
    if (taskDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return formatDistanceToNow(taskDate, { addSuffix: true });
  };

  return (
    <Link
      href={`/plants/${plant.id}`}
      className="group rounded-lg border-2 border-sage bg-card-bg overflow-hidden transition-all hover:border-moss hover:shadow-lg flex flex-col h-full"
    >
      {/* Plant Image */}
      <div className="relative h-64 bg-sage-light flex-shrink-0">
        {primaryMedia?.url ? (
          <img
            src={primaryMedia.url}
            alt={plant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🪴
          </div>
        )}
        <FavoriteStarButton
          plantId={plant.id}
          plantName={plant.name}
          isFavorite={plant.isFavorite}
        />
        {onChangeClick && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChangeClick();
            }}
            className="absolute top-2 left-2 z-50 p-2 rounded-full bg-soil/70 hover:bg-soil/90 transition-all hover:scale-110 active:scale-95"
            aria-label="Change favorite plant"
            title="Change favorite"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Plant Info */}
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-moss-dark group-hover:text-moss transition-colors">
            {plant.name}
          </h3>
          <p className="text-sm text-soil mt-1 italic">
            {plant.speciesType} {plant.speciesName}
          </p>

          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-soil">📍 {plant.location}</span>
          </div>
        </div>

        {/* Tasks Footer */}
        {(overdueTasks.length > 0 || upcomingTasks.length > 0) ? (
          <div className="mt-4 pt-4 border-t-2 border-sage/30">
            <h4 className="text-xs font-semibold text-moss-dark mb-2 uppercase">
              Upcoming Tasks
            </h4>
            <div className="overflow-y-auto max-h-16 space-y-2">
              {/* Overdue tasks first - show only first one */}
              {overdueTasks.length > 0 ? (
                (() => {
                  const task = overdueTasks[0];
                  if (!task.nextDueDate) return null;
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 text-sm text-terracotta font-semibold"
                    >
                      <span className="flex-shrink-0">{TASK_TYPE_ICONS[task.type] || '📋'}</span>
                      <div className="flex-grow min-w-0">
                        <div className="truncate">{task.title}</div>
                        <div className="text-xs">
                          {formatTaskDate(new Date(task.nextDueDate))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : upcomingTasks.length > 0 ? (
                (() => {
                  const task = upcomingTasks[0];
                  if (!task.nextDueDate) return null;
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 text-sm text-soil"
                    >
                      <span className="flex-shrink-0">{TASK_TYPE_ICONS[task.type] || '📋'}</span>
                      <div className="flex-grow min-w-0">
                        <div className="truncate">{task.title}</div>
                        <div className="text-xs">
                          {formatTaskDate(new Date(task.nextDueDate))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t-2 border-sage/30">
            <p className="text-sm text-soil italic">No tasks scheduled</p>
          </div>
        )}
      </div>
    </Link>
  );
}
