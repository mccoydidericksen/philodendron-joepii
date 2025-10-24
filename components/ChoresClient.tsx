'use client';

import { useState } from 'react';
import { ChoreCard } from './ChoreCard';
import type { CareTask } from '@/lib/db/types';

interface ChoresClientProps {
  initialChores: (CareTask & {
    plant: {
      id: string;
      name: string;
      primaryPhotoUrl: string | null;
      speciesType: string;
    };
  })[];
}

export function ChoresClient({ initialChores }: ChoresClientProps) {
  const [chores, setChores] = useState(initialChores);

  const handleTaskComplete = (taskId: string) => {
    // Remove the completed task from the list with animation
    setChores((prev) => prev.filter((chore) => chore.id !== taskId));
  };

  if (chores.length === 0) {
    return (
      <div className="rounded-lg border-2 border-sage bg-card-bg p-12 text-center">
        <div className="text-6xl mb-4">✨</div>
        <h2 className="text-2xl font-semibold text-moss-dark mb-2">
          All caught up!
        </h2>
        <p className="text-soil">
          No chores scheduled for today. Great job taking care of your plants!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm text-soil">
        {chores.length} {chores.length === 1 ? 'chore' : 'chores'} to complete
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {chores.map((chore) => (
          <ChoreCard
            key={chore.id}
            task={chore}
            onComplete={handleTaskComplete}
          />
        ))}
      </div>
    </div>
  );
}
