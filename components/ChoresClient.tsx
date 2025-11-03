'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ChoreCard } from './ChoreCard';
import { bulkCompleteTasks } from '@/app/actions/tasks';
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
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleTaskComplete = (taskId: string) => {
    // Remove the completed task from the list with animation
    setChores((prev) => prev.filter((chore) => chore.id !== taskId));
  };

  const handleBulkComplete = async () => {
    if (chores.length === 0) return;

    const confirmMessage = `Are you sure you want to complete all ${chores.length} chore${chores.length === 1 ? '' : 's'}?`;
    if (!confirm(confirmMessage)) return;

    setIsCompleting(true);

    try {
      const taskIds = chores.map(chore => chore.id);
      const result = await bulkCompleteTasks(taskIds);

      if (result.success) {
        startTransition(() => {
          setChores([]);
        });
      } else {
        console.error('Failed to bulk complete tasks:', result.error);
        alert(`Failed to complete some tasks: ${result.error}`);
        setIsCompleting(false);
      }
    } catch (error) {
      console.error('Error bulk completing tasks:', error);
      alert('An error occurred while completing tasks. Please try again.');
      setIsCompleting(false);
    }
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
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-soil">
          {chores.length} {chores.length === 1 ? 'chore' : 'chores'} to complete
        </div>
        <button
          onClick={handleBulkComplete}
          disabled={isCompleting || isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isCompleting || isPending
              ? 'bg-sage/50 text-moss/50 cursor-not-allowed'
              : 'bg-moss text-white hover:bg-moss-dark active:scale-95'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 ${isCompleting || isPending ? 'animate-pulse' : ''}`} />
          {isCompleting || isPending ? 'Completing...' : 'Complete All'}
        </button>
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
