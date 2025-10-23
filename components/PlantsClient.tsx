'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FilterDropdown } from '@/components/FilterDropdown';
import { FavoriteStarButton } from '@/components/FavoriteStarButton';
import { getPlants } from '@/app/actions/plants';
import type { Plant, CareTask, PlantMedia } from '@/lib/db/types';

interface PlantsClientProps {
  speciesTypes: string[];
  initialPlants: (Plant & { careTasks?: CareTask[]; media?: PlantMedia[] })[];
}

export function PlantsClient({ speciesTypes, initialPlants }: PlantsClientProps) {
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [plants, setPlants] = useState(initialPlants);

  useEffect(() => {
    async function fetchFilteredPlants() {
      const result = await getPlants(false, speciesFilter);

      if (result.success) {
        setPlants(result.data);
      }
    }

    fetchFilteredPlants();
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

      {/* Plants Grid */}
      {plants.length === 0 ? (
        <div className="rounded-lg border-2 border-sage bg-card-bg p-12 text-center">
          <div className="mx-auto max-w-md">
            <h2 className="text-2xl font-semibold text-moss-dark mb-4">
              No Plants Found
            </h2>
            <p className="text-soil mb-6">
              {speciesFilter === 'all'
                ? "You haven't added any plants yet."
                : `No plants found with species type "${speciesFilter}".`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => {
            const primaryMedia = plant.media?.[0];
            const upcomingTasks = plant.careTasks?.filter(
              (task) => new Date(task.nextDueDate) >= new Date()
            ).length || 0;

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
                  {plant.isArchived ? (
                    <div className="absolute top-2 right-2 bg-soil/90 text-white px-3 py-1 rounded-md text-sm font-medium">
                      Archived
                    </div>
                  ) : (
                    <FavoriteStarButton
                      plantId={plant.id}
                      plantName={plant.name}
                      isFavorite={plant.isFavorite}
                    />
                  )}
                </div>

                {/* Plant Info */}
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-moss-dark group-hover:text-moss transition-colors">
                    {plant.name}
                  </h3>
                  <p className="text-sm text-soil mt-1 italic">{plant.speciesType} {plant.speciesName}</p>

                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-soil">
                      📍 {plant.location}
                    </span>
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
    </>
  );
}
