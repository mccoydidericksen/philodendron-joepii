import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { DemoBanner } from '@/components/DemoBanner';
import { getPlantsCount, getDistinctSpeciesTypes, getFavoritePlants, getPlants, getPlantCountsBySpeciesType } from '@/app/actions/plants';
import { getUpcomingTasks, getOverdueTasks } from '@/app/actions/tasks';
import { DashboardKanban } from '@/components/DashboardKanban';
import { DashboardClient } from '@/components/DashboardClient';
import { FavoritePlantsSection } from '@/components/FavoritePlantsSection';
import { PlantsBySpeciesChart } from '@/components/PlantsBySpeciesChart';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { UserButton } from '@clerk/nextjs';
import { TypingText } from '@/components/ui/TypingText';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  // Check if this is the demo account
  const isDemoAccount = user?.publicMetadata?.isDemoAccount === true;

  // Fetch plant count
  const plantsResult = await getPlantsCount();
  const plantsCount = (plantsResult.success && plantsResult.data !== undefined) ? plantsResult.data : 0;

  // Fetch favorite plants
  const favoritePlantsResult = await getFavoritePlants();
  const favoritePlants = (favoritePlantsResult.success && favoritePlantsResult.data) ? favoritePlantsResult.data : [];

  // Fetch all plants for the selector modal
  const allPlantsResult = await getPlants(false);
  const allPlants = (allPlantsResult.success && allPlantsResult.data) ? allPlantsResult.data : [];

  // Fetch species types for filter
  const speciesTypesResult = await getDistinctSpeciesTypes();
  const speciesTypes = (speciesTypesResult.success && speciesTypesResult.data) ? speciesTypesResult.data : [];

  // Fetch plant counts by species type for chart
  const plantCountsResult = await getPlantCountsBySpeciesType();
  const plantCounts = (plantCountsResult.success && plantCountsResult.data) ? plantCountsResult.data : [];

  // Fetch task data
  const upcomingResult = await getUpcomingTasks(7);
  const overdueResult = await getOverdueTasks();

  const upcomingTasks = (upcomingResult.success && upcomingResult.data) ? upcomingResult.data : [];
  const overdueTasks = (overdueResult.success && overdueResult.data) ? overdueResult.data : [];

  // All tasks for kanban (overdue + upcoming within 7 days)
  const allTasks = [...(overdueTasks || []), ...(upcomingTasks || [])];

  // Calculate task counts
  const tasksNeedingAttention = (overdueTasks || []).length + (upcomingTasks || []).filter(task => {
    if (!task.nextDueDate) return false;
    const dueDate = new Date(task.nextDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2; // Due within 2 days
  }).length;

  return (
    <>
      {isDemoAccount && <DemoBanner />}
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-[1800px] relative">
          {/* User Actions - Top Right */}
          <div className="absolute right-0 top-0 flex items-center gap-3">
            <Link href="/plant-assistant">
              <Button
                variant="ghost"
                size="icon"
                className="text-moss hover:text-moss-dark hover:bg-moss/10"
                title="AI Plant Assistant"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            <NotificationBell />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'size-10 ring-2 ring-sage hover:ring-moss transition-all',
                  userButtonPopoverCard: 'shadow-lg border-2 border-sage',
                },
              }}
            />
          </div>

          <header className="mb-8">
            <h1 className="text-3xl font-bold text-moss-dark mb-1" style={{ fontFamily: 'var(--font-fredoka)' }}>
              plantrot
            </h1>
            <p className="text-sage-dark text-sm">
              <TypingText
                text={`welcome back, ${(user?.firstName || user?.emailAddresses[0].emailAddress.split('@')[0])?.toLowerCase()}! here's your plant care at a glance.`}
                speed={40}
              />
            </p>
          </header>

          {/* Metrics Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Link href="/plants" className="rounded-lg border-2 border-sage bg-card-bg p-6 transition-all hover:border-moss hover:shadow-lg">
              <h2 className="text-2xl font-semibold text-moss">My Plants</h2>
              <p className="mt-4 text-4xl font-bold text-moss-dark">{plantsCount}</p>
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

          {/* Favorite Plants Section */}
          {plantsCount > 0 && (
            <FavoritePlantsSection favoritePlants={favoritePlants} allPlants={allPlants} />
          )}

          {/* Plants by Species Chart */}
          {plantsCount > 0 && (
            <PlantsBySpeciesChart data={plantCounts} />
          )}

          {plantsCount === 0 ? (
            <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
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
          ) : allTasks.length === 0 ? (
            <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
              <h2 className="text-2xl font-semibold text-moss-dark">No Tasks Yet</h2>
              <p className="mt-4 text-soil">
                You don't have any care tasks scheduled. Add tasks to your plants to see them here!
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link href="/plants">
                  <Button className="bg-moss hover:bg-moss-light text-white">
                    View Your Plants
                  </Button>
                </Link>
                <Link href="/plants/new">
                  <Button variant="outline">
                    + Add New Plant
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Kanban Board with Filter */}
              <DashboardClient speciesTypes={speciesTypes} initialTasks={allTasks} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
