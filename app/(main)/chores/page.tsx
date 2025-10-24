import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ChoresClient } from '@/components/ChoresClient';
import { getOverdueTasks, getUpcomingTasks } from '@/app/actions/tasks';

export default async function ChoresPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch overdue tasks
  const overdueResult = await getOverdueTasks();
  const overdueTasks = (overdueResult.success && overdueResult.data) ? overdueResult.data : [];

  // Fetch tasks due today (within 0 days = today only)
  const todayResult = await getUpcomingTasks(0);
  const todayTasks = (todayResult.success && todayResult.data) ? todayResult.data : [];

  // Combine overdue and today's tasks
  const allChores = [...(overdueTasks || []), ...(todayTasks || [])];

  // Remove duplicates (in case a task is both overdue and due today)
  const uniqueChores = Array.from(
    new Map(allChores.map(task => [task.id, task])).values()
  );

  return (
    <div className="min-h-screen bg-cream p-8 pb-32">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-moss-dark mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
            Today's Chores
          </h1>
          <p className="text-sage-dark text-sm">
            Complete your plant care tasks for today and overdue items
          </p>
        </header>

        <ChoresClient initialChores={uniqueChores} />
      </div>
    </div>
  );
}
