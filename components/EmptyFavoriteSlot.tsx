'use client';

import { Star } from 'lucide-react';

export function EmptyFavoriteSlot() {
  return (
    <div className="rounded-lg border-2 border-dashed border-sage bg-card-bg/50 overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mb-4">
          <Star className="w-8 h-8 text-sage" />
        </div>
        <h3 className="text-lg font-semibold text-moss-dark mb-2">
          Add a Favorite
        </h3>
        <p className="text-sm text-soil max-w-xs">
          Click the ⭐ on any plant card to add it to your favorites and see it here
        </p>
      </div>
    </div>
  );
}
