'use client';

import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Plant, PlantMedia } from '@/lib/db/types';

interface PlantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  plants: (Plant & { media?: PlantMedia[] })[];
  onSelectPlant: (plantId: string) => void;
  excludePlantIds?: string[]; // Plants to exclude from selection (already favorited)
  isLoading?: boolean;
}

export function PlantSelectorModal({
  isOpen,
  onClose,
  plants,
  onSelectPlant,
  excludePlantIds = [],
  isLoading = false,
}: PlantSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out excluded plants and archived plants
  const availablePlants = useMemo(() => {
    return plants.filter(
      (plant) => !excludePlantIds.includes(plant.id) && !plant.isArchived
    );
  }, [plants, excludePlantIds]);

  // Search filtering
  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) {
      return availablePlants;
    }

    const query = searchQuery.toLowerCase();
    return availablePlants.filter(
      (plant) =>
        plant.name.toLowerCase().includes(query) ||
        plant.speciesType.toLowerCase().includes(query) ||
        plant.speciesName?.toLowerCase().includes(query) ||
        plant.location?.toLowerCase().includes(query)
    );
  }, [availablePlants, searchQuery]);

  const handleSelectPlant = (plantId: string) => {
    onSelectPlant(plantId);
    setSearchQuery(''); // Reset search
  };

  const handleClose = () => {
    setSearchQuery(''); // Reset search
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg border-2 border-sage bg-cream shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-sage p-4">
          <h2 className="text-2xl font-bold text-moss-dark">Select a Plant</h2>
          <button
            onClick={handleClose}
            className="text-2xl text-soil hover:text-moss-dark transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b-2 border-sage/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-soil" />
            <input
              type="text"
              placeholder="Search by name, species, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-2 border-sage bg-card-bg pl-10 pr-4 py-2 text-soil placeholder:text-soil/50 focus:border-moss focus:outline-none"
            />
          </div>
        </div>

        {/* Plants List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredPlants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-soil">
                {availablePlants.length === 0
                  ? 'No plants available to favorite'
                  : 'No plants match your search'}
              </p>
              {availablePlants.length === 0 && (
                <p className="text-sm text-soil/70 mt-2">
                  Add some plants first, or unfavorite a plant to make room
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredPlants.map((plant) => {
                const primaryMedia = plant.media?.[0];

                return (
                  <button
                    key={plant.id}
                    onClick={() => handleSelectPlant(plant.id)}
                    disabled={isLoading}
                    className="flex items-center gap-4 rounded-lg border-2 border-sage bg-card-bg p-3 text-left transition-all hover:border-moss hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {/* Plant Image */}
                    <div className="h-16 w-16 flex-shrink-0 rounded-md bg-sage-light overflow-hidden">
                      {primaryMedia?.url ? (
                        <img
                          src={primaryMedia.url}
                          alt={plant.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-3xl">
                          🪴
                        </div>
                      )}
                    </div>

                    {/* Plant Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-moss-dark group-hover:text-moss transition-colors truncate">
                        {plant.name}
                      </h3>
                      <p className="text-sm text-soil italic truncate">
                        {plant.speciesType} {plant.speciesName}
                      </p>
                      {plant.location && (
                        <p className="text-xs text-soil/70 mt-1 truncate">
                          📍 {plant.location}
                        </p>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    <div className="flex-shrink-0 text-moss opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-sage p-4">
          <Button onClick={handleClose} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
