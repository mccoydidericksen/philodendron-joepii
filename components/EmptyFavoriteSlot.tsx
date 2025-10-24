'use client';

import { Star } from 'lucide-react';

interface EmptyFavoriteSlotProps {
  onClick: () => void;
}

export function EmptyFavoriteSlot({ onClick }: EmptyFavoriteSlotProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border-2 border-dashed border-sage bg-card-bg/50 overflow-hidden flex flex-col h-full min-h-[400px] transition-all hover:border-moss hover:bg-sage/10 hover:shadow-lg cursor-pointer group"
    >
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mb-4 group-hover:bg-moss/20 transition-colors">
          <Star className="w-8 h-8 text-sage group-hover:text-moss transition-colors" />
        </div>
        <h3 className="text-lg font-semibold text-moss-dark mb-2 group-hover:text-moss transition-colors">
          Add a Favorite
        </h3>
        <p className="text-sm text-soil max-w-xs">
          Click here to select a plant from your collection
        </p>
      </div>
    </button>
  );
}
