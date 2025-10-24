import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { getPlantGroup } from '@/app/actions/plant-groups';
import { getGroupPlants } from '@/app/actions/plants';
import { DemoBanner } from '@/components/DemoBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { FavoriteStarButton } from '@/components/FavoriteStarButton';

export default async function GroupPlantsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const isDemoAccount = user?.publicMetadata?.isDemoAccount === true;

  // Await params (Next.js 15 requirement)
  const { groupId } = await params;

  // Get group data
  const groupResult = await getPlantGroup(groupId);

  if (!groupResult.success) {
    redirect('/groups');
  }

  const group = groupResult.data;

  if (!group) {
    redirect('/groups');
  }

  // Get group plants
  const plantsResult = await getGroupPlants(groupId);
  const plants = (plantsResult.success && plantsResult.data) ? plantsResult.data : [];

  return (
    <>
      {isDemoAccount && <DemoBanner />}
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-[1400px] relative">
          {/* User Actions - Top Right */}
          <div className="absolute right-0 top-0 flex items-center gap-3">
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

          {/* Header */}
          <Link
            href={`/groups/${groupId}`}
            className="inline-flex items-center gap-2 text-moss hover:text-moss-dark transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {group.name}
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-moss-dark mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>{group.name} - Plants</h1>
            <p className="text-sage-dark text-sm">
              Managing {plants.length} {plants.length === 1 ? 'plant' : 'plants'}
            </p>
          </div>

          {/* Add Plant Button */}
          <div className="mb-6">
            <Link href={`/groups/${groupId}/plants/new`}>
              <Button className="bg-moss hover:bg-moss-light text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Plant to Group
              </Button>
            </Link>
          </div>

          {/* Plants Grid */}
          {plants.length === 0 ? (
            <div className="rounded-lg border-2 border-sage bg-card-bg p-12 text-center">
              <h2 className="text-2xl font-semibold text-moss-dark mb-4">
                No Plants Yet
              </h2>
              <p className="text-soil mb-6">
                Add plants to this group to start collaborating on care.
              </p>
              <Link href={`/groups/${groupId}/plants/new`}>
                <Button className="bg-moss hover:bg-moss-light text-white">
                  Add Your First Plant
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plants.map((plant) => {
                const primaryMedia = plant.media?.[0];
                const upcomingTasks = plant.careTasks?.filter(
                  (task) => task.nextDueDate && new Date(task.nextDueDate) >= new Date()
                ).length || 0;

                const assignedUser = plant.assignedUser;
                const assignedName = assignedUser
                  ? assignedUser.email.split('@')[0]
                  : 'Unassigned';

                return (
                  <Link
                    key={plant.id}
                    href={`/plants/${plant.id}`}
                    className="group rounded-lg border-2 border-sage bg-card-bg overflow-hidden transition-all hover:border-moss hover:shadow-lg"
                  >
                    {/* Plant Image */}
                    <div className="relative h-48 bg-sage-light">
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
                    </div>

                    {/* Plant Info */}
                    <div className="p-4">
                      <h3 className="text-xl font-semibold text-moss-dark group-hover:text-moss transition-colors">
                        {plant.name}
                      </h3>
                      <p className="text-sm text-soil mt-1 italic">
                        {plant.speciesType} {plant.speciesName}
                      </p>

                      <div className="mt-3 flex flex-col gap-2 text-sm">
                        <span className="text-soil">📍 {plant.location}</span>

                        {/* Assigned User */}
                        <div className="flex items-center gap-2">
                          <span className="text-soil">👤 Assigned to:</span>
                          <span className="font-medium text-moss-dark">{assignedName}</span>
                        </div>

                        {upcomingTasks > 0 && (
                          <span className="text-terracotta font-medium">
                            {upcomingTasks} task{upcomingTasks !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Quick Info Badges */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {plant.lightLevel && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-sage/30 text-xs text-moss-dark">
                            💡 {plant.lightLevel.replace('-', ' ')}
                          </span>
                        )}
                        {plant.difficultyLevel && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-sage/30 text-xs text-moss-dark">
                            🎯 {plant.difficultyLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
