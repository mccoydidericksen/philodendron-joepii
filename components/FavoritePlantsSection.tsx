'use client';

import { useState, useTransition } from 'react';
import { FavoritePlantCard } from './FavoritePlantCard';
import { EmptyFavoriteSlot } from './EmptyFavoriteSlot';
import { PlantSelectorModal } from './PlantSelectorModal';
import { setFavoritePlant, toggleFavoritePlant } from '@/app/actions/plants';
import { toast } from 'sonner';
import type { Plant, CareTask, PlantMedia } from '@/lib/db/types';

interface FavoritePlantsSectionProps {
  favoritePlants: (Plant & { careTasks?: CareTask[]; media?: PlantMedia[] })[];
  allPlants: (Plant & { media?: PlantMedia[] })[];
}

export function FavoritePlantsSection({ favoritePlants, allPlants }: FavoritePlantsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replacingPlantId, setReplacingPlantId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Always show 3 slots
  const slots = Array.from({ length: 3 }, (_, i) => favoritePlants[i] || null);

  const handleOpenModal = (plantIdToReplace?: string) => {
    setReplacingPlantId(plantIdToReplace || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setReplacingPlantId(null);
  };

  const handleSelectPlant = async (plantId: string) => {
    startTransition(async () => {
      // If replacing, first unfavorite the old plant
      if (replacingPlantId) {
        const unfavoriteResult = await toggleFavoritePlant(replacingPlantId);
        if (!unfavoriteResult.success) {
          toast.error(unfavoriteResult.error || 'Failed to remove old favorite');
          return;
        }
      }

      // Then favorite the new plant
      const result = await setFavoritePlant(plantId);

      if (result.success) {
        const selectedPlant = allPlants.find((p) => p.id === plantId);
        toast.success(
          replacingPlantId
            ? `Favorite updated to ${selectedPlant?.name || 'plant'}`
            : `${selectedPlant?.name || 'Plant'} added to favorites`
        );
        handleCloseModal();
      } else {
        toast.error(result.error || 'Failed to set favorite');
      }
    });
  };

  // Get IDs of currently favorited plants to exclude from selector
  const favoritedPlantIds = favoritePlants.map((p) => p.id);
  // When replacing, allow selecting the plant being replaced
  const excludedPlantIds = replacingPlantId
    ? favoritedPlantIds.filter((id) => id !== replacingPlantId)
    : favoritedPlantIds;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-moss-dark mb-4">
        My Favorite Plants
      </h2>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {slots.map((plant, index) =>
          plant ? (
            <FavoritePlantCard
              key={plant.id}
              plant={plant}
              onChangeClick={() => handleOpenModal(plant.id)}
            />
          ) : (
            <EmptyFavoriteSlot key={`empty-${index}`} onClick={() => handleOpenModal()} />
          )
        )}
      </div>

      <PlantSelectorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        plants={allPlants}
        onSelectPlant={handleSelectPlant}
        excludePlantIds={excludedPlantIds}
        isLoading={isPending}
      />
    </div>
  );
}
