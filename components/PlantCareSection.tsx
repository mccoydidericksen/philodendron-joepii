'use client';

import { useRouter } from 'next/navigation';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';
import type { CareTaskWithCompletions } from '@/lib/db/types';

interface PlantCareSectionProps {
  plantId: string;
  tasks: CareTaskWithCompletions[];
}

export function PlantCareSection({ plantId, tasks }: PlantCareSectionProps) {
  const router = useRouter();

  function handleUpdate() {
    router.refresh();
  }

  return (
    <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
      <h2 className="text-2xl font-semibold text-moss-dark mb-6">Care Schedule</h2>

      {/* Add Task Form */}
      <div className="mb-6">
        <TaskForm plantId={plantId} onSuccess={handleUpdate} />
      </div>

      {/* Tasks List */}
      <TaskList tasks={tasks} onUpdate={handleUpdate} />
    </section>
  );
}
