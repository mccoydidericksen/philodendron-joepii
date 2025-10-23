'use client';

import { useRouter } from 'next/navigation';
import { MediaGallery } from './MediaGallery';
import { MediaUpload } from './MediaUpload';
import type { PlantMedia } from '@/lib/db/types';

interface PlantMediaSectionProps {
  plantId: string;
  media: PlantMedia[];
}

export function PlantMediaSection({ plantId, media }: PlantMediaSectionProps) {
  const router = useRouter();

  function handleMediaChange() {
    router.refresh();
  }

  return (
    <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-moss-dark">Photos</h2>
        {media.length < 20 && (
          <MediaUpload
            plantId={plantId}
            currentPhotoCount={media.length}
            onUploadComplete={handleMediaChange}
          />
        )}
      </div>

      <MediaGallery
        photos={media}
        plantId={plantId}
        onPhotosChange={handleMediaChange}
      />

      {media.length >= 20 && (
        <p className="mt-4 text-sm text-soil text-center">
          Maximum of 20 photos reached
        </p>
      )}
    </section>
  );
}
