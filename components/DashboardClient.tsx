'use client';

import { useState, useEffect } from 'react';
import { FilterDropdown } from '@/components/FilterDropdown';
import { DashboardKanban } from '@/components/DashboardKanban';
import { getUpcomingTasks, getOverdueTasks } from '@/app/actions/tasks';
import type { CareTask } from '@/lib/db/types';

interface DashboardClientProps {
  speciesTypes: string[];
  initialTasks: (CareTask & { plant: { id: string; name: string; speciesType: string } })[];
}

export function DashboardClient({ speciesTypes, initialTasks }: DashboardClientProps) {
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    async function fetchFilteredTasks() {
      const upcomingResult = await getUpcomingTasks(7, speciesFilter);
      const overdueResult = await getOverdueTasks(speciesFilter);

      if (upcomingResult.success && overdueResult.success) {
        const allTasks = [...overdueResult.data, ...upcomingResult.data];
        setTasks(allTasks);
      }
    }

    fetchFilteredTasks();
  }, [speciesFilter]);

  return (
    <>
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
