'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FilterDropdown } from '@/components/FilterDropdown';
import { getUpcomingTasks, getOverdueTasks } from '@/app/actions/tasks';
import type { CareTask } from '@/lib/db/types';

// Import DashboardKanban as client-only to avoid SSR hydration mismatches with @dnd-kit
const DashboardKanban = dynamic(
  () => import('@/components/DashboardKanban').then((mod) => mod.DashboardKanban),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-[300px] flex-1">
            <div className="rounded-lg border-2 border-sage bg-card-bg p-4 animate-pulse">
              <div className="h-6 bg-sage/20 rounded mb-4 w-1/2"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-24 bg-sage/10 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

interface DashboardClientProps {
  speciesTypes: string[];
  initialTasks: (CareTask & { plant: { id: string; name: string; primaryPhotoUrl: string | null; speciesType: string } })[];
}

export function DashboardClient({ speciesTypes, initialTasks }: DashboardClientProps) {
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    async function fetchFilteredTasks() {
      const upcomingResult = await getUpcomingTasks(7, speciesFilter);
      const overdueResult = await getOverdueTasks(speciesFilter);

      if (upcomingResult.success && overdueResult.success) {
        const allTasks = [...(overdueResult.data || []), ...(upcomingResult.data || [])];
        setTasks(allTasks);
      }
    }

    fetchFilteredTasks();
  }, [speciesFilter]);

  return (
    <>
      {/* Kanban Board Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-moss-dark mb-2">
          Plant Care Tasks
        </h2>
        <p className="text-sm text-soil">
          Track and manage your plant care schedule
        </p>
      </div>

      {/* Filter Section */}
      {speciesTypes.length > 0 && (
        <div className="mb-6">
          <FilterDropdown
            options={speciesTypes}
            value={speciesFilter}
            onChange={setSpeciesFilter}
            label="Filter by Species Type"
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <DashboardKanban tasks={tasks} />
      </div>
    </>
  );
}
