'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { toggleFavoritePlant } from '@/app/actions/plants';
import { toast } from 'sonner';

interface FavoriteStarButtonProps {
  plantId: string;
  plantName: string;
  isFavorite: boolean;
}

export function FavoriteStarButton({ plantId, plantName, isFavorite }: FavoriteStarButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useState(isFavorite);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    // Prevent card link navigation
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    setOptimisticFavorite(!optimisticFavorite);

    startTransition(async () => {
      const result = await toggleFavoritePlant(plantId);

      if (result.success) {
        const action = result.data?.isFavorite ? 'added to' : 'removed from';
        toast.success(`${plantName} ${action} favorites`);
      } else {
        // Revert optimistic update on error
        setOptimisticFavorite(optimisticFavorite);
        toast.error(result.error || 'Failed to update favorite');
      }
    });
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isPending}
      className="absolute top-2 right-2 z-50 p-2 rounded-full bg-soil/70 hover:bg-soil/90 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
      aria-label={optimisticFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`w-5 h-5 transition-all ${
          optimisticFavorite
            ? 'fill-warning text-warning drop-shadow-[0_0_8px_rgba(233,180,76,0.6)]'
            : 'fill-none text-white stroke-2'
        }`}
      />
    </button>
  );
}
