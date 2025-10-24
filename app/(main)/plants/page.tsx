import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DemoBanner } from '@/components/DemoBanner';
import {
  getPlants,
  getDistinctSpeciesTypes,
  getDistinctLocations,
  getAssignableUsers,
} from '@/app/actions/plants';
import { PlantsClient } from '@/components/PlantsClient';
import { Button } from '@/components/ui/button';

export default async function PlantsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const isDemoAccount = user?.publicMetadata?.isDemoAccount === true;

  // Fetch all plants
  const result = await getPlants(false);
  const plants = (result.success && result.data) ? result.data : [];

  // Fetch species types for filter
  const speciesTypesResult = await getDistinctSpeciesTypes();
  const speciesTypes = (speciesTypesResult.success && speciesTypesResult.data) ? speciesTypesResult.data : [];

  // Fetch locations for filter
  const locationsResult = await getDistinctLocations();
  const locations = (locationsResult.success && locationsResult.data) ? locationsResult.data : [];

  // Fetch assignable users for filter
  const assigneesResult = await getAssignableUsers();
  const assignees = (assigneesResult.success && assigneesResult.data) ? assigneesResult.data : [];

  return (
    <>
      {isDemoAccount && <DemoBanner />}
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-moss-dark mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>My Plants</h1>
              <p className="text-sage-dark text-sm">
                {plants.length === 0
                  ? "You haven't added any plants yet"
                  : `Managing ${plants.length} ${plants.length === 1 ? 'plant' : 'plants'}`}
              </p>
            </div>
            <Link href="/plants/new">
              <Button className="bg-moss hover:bg-moss-light text-white">
                + Add Plant
              </Button>
            </Link>
          </header>

          {plants.length === 0 ? (
            <div className="rounded-lg border-2 border-sage bg-card-bg p-12 text-center">
              <div className="mx-auto max-w-md">
                <h2 className="text-2xl font-semibold text-moss-dark mb-4">
                  Start Your Plant Collection
                </h2>
                <p className="text-soil mb-6">
                  Add your first plant to start tracking its care, growth, and health.
                </p>
                <Link href="/plants/new">
                  <Button className="bg-moss hover:bg-moss-light text-white">
                    Add Your First Plant
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <PlantsClient
              speciesTypes={speciesTypes}
              locations={locations}
              assignees={assignees}
              initialPlants={plants}
            />
          )}
        </div>
      </div>
    </>
  );
}
