'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardTaskCard } from '@/components/DashboardTaskCard';
import { FilterDropdown } from '@/components/FilterDropdown';
import { Button } from '@/components/ui/button';
import { getPlantsCount } from '@/app/actions/plants';
import { getUpcomingTasks, getOverdueTasks } from '@/app/actions/tasks';
import type { CareTask } from '@/lib/db/types';

interface DashboardContentProps {
  initialPlantsCount: number;
  initialUpcomingTasks: (CareTask & { plant: { id: string; name: string } })[];
  initialOverdueTasks: (CareTask & { plant: { id: string; name: string } })[];
  speciesTypes: string[];
}

export function DashboardContent({
  initialPlantsCount,
  initialUpcomingTasks,
  initialOverdueTasks,
  speciesTypes,
}: DashboardContentProps) {
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [upcomingTasks, setUpcomingTasks] = useState(initialUpcomingTasks);
  const [overdueTasks, setOverdueTasks] = useState(initialOverdueTasks);

  useEffect(() => {
    async function fetchFilteredTasks() {
      const upcomingResult = await getUpcomingTasks(7, speciesFilter);
      const overdueResult = await getOverdueTasks(speciesFilter);

      if (upcomingResult.success && upcomingResult.data) {
        setUpcomingTasks(upcomingResult.data);
      }
      if (overdueResult.success && overdueResult.data) {
        setOverdueTasks(overdueResult.data);
      }
    }

    fetchFilteredTasks();
  }, [speciesFilter]);

  // Calculate task counts
  const tasksNeedingAttention = overdueTasks.length + upcomingTasks.filter(task => {
    if (!task.nextDueDate) return false;
    const dueDate = new Date(task.nextDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDays === 0; // Due today only
  }).length;

  // Combine and sort tasks for display (overdue first, then by due date)
  const urgentTasks = [
    ...overdueTasks,
    ...upcomingTasks.filter(task => {
      if (!task.nextDueDate) return false;
      const dueDate = new Date(task.nextDueDate);
      const diffDays = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diffDays === 0;
    })
  ].slice(0, 10); // Show first 10 urgent tasks

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

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/plants" className="rounded-lg border-2 border-sage bg-card-bg p-6 transition-all hover:border-moss hover:shadow-lg">
          <h2 className="text-2xl font-semibold text-moss">My Plants</h2>
          <p className="mt-4 text-4xl font-bold text-moss-dark">{initialPlantsCount}</p>
          <p className="mt-2 text-sm text-soil">plants being tracked</p>
        </Link>

        <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
          <h2 className="text-2xl font-semibold text-moss">Tasks Due</h2>
          <p className={`mt-4 text-4xl font-bold ${tasksNeedingAttention > 0 ? 'text-terracotta' : 'text-moss-dark'}`}>
            {tasksNeedingAttention}
          </p>
          <p className="mt-2 text-sm text-soil">
            {tasksNeedingAttention === 1 ? 'task needs' : 'tasks need'} attention
          </p>
        </div>

        <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
          <h2 className="text-2xl font-semibold text-moss">Upcoming</h2>
          <p className="mt-4 text-4xl font-bold text-moss-dark">
            {upcomingTasks.length}
          </p>
          <p className="mt-2 text-sm text-soil">tasks in next 7 days</p>
        </div>
      </div>

      {initialPlantsCount === 0 ? (
        <div className="mt-8 rounded-lg border-2 border-sage bg-card-bg p-6">
          <h2 className="text-2xl font-semibold text-moss-dark">Getting Started</h2>
          <p className="mt-4 text-soil">
            Welcome to Philodendron Joepii! You haven't added any plants yet.
          </p>
          <Link href="/plants/new">
            <Button className="mt-4 bg-moss hover:bg-moss-light text-white">
              Add Your First Plant
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Urgent Tasks Section */}
          {urgentTasks.length > 0 && (
            <div className="mt-8 rounded-lg border-2 border-sage bg-card-bg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-moss-dark">
                  Tasks Needing Attention
                </h2>
                <span className="text-sm text-soil">
                  {urgentTasks.length} {urgentTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <div className="space-y-3">
                {urgentTasks.map((task) => (
                  <DashboardTaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 rounded-lg border-2 border-sage bg-card-bg p-6">
            <h2 className="text-2xl font-semibold text-moss-dark">Quick Actions</h2>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link href="/plants/new">
                <Button className="bg-moss hover:bg-moss-light text-white">
                  + Add New Plant
                </Button>
              </Link>
              <Link href="/plants">
                <Button variant="outline">
                  View All Plants
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
