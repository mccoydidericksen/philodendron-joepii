'use client';

import { FavoritePlantCard } from './FavoritePlantCard';
import { EmptyFavoriteSlot } from './EmptyFavoriteSlot';
import type { Plant, CareTask, PlantMedia } from '@/lib/db/types';

interface FavoritePlantsSectionProps {
  favoritePlants: (Plant & { careTasks?: CareTask[]; media?: PlantMedia[] })[];
}

export function FavoritePlantsSection({ favoritePlants }: FavoritePlantsSectionProps) {
  // Always show 3 slots
  const slots = Array.from({ length: 3 }, (_, i) => favoritePlants[i] || null);

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-moss-dark mb-4">
        My Favorite Plants
      </h2>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {slots.map((plant, index) =>
          plant ? (
            <FavoritePlantCard key={plant.id} plant={plant} />
          ) : (
            <EmptyFavoriteSlot key={`empty-${index}`} />
          )
        )}
      </div>
    </div>
  );
}
