'use client';

import { useState, useEffect } from 'react';
import { deletePlantPhoto, setPrimaryPhoto, reorderPhotos } from '@/app/actions/media';
import type { PlantMedia } from '@/lib/db/types';
import { Button } from '@/components/ui/button';

interface MediaGalleryProps {
  photos: PlantMedia[];
  plantId: string;
  onPhotosChange?: () => void;
}

export function MediaGallery({ photos: initialPhotos, plantId, onPhotosChange }: MediaGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PlantMedia | null>(null);

  // Sync state when props change (e.g., after router.refresh())
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  async function handleDelete(photoId: string) {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    setIsDeleting(photoId);
    const result = await deletePlantPhoto(photoId);
    setIsDeleting(null);

    if (result.success) {
      setPhotos(photos.filter(p => p.id !== photoId));
      onPhotosChange?.();
    } else {
      alert(result.error || 'Failed to delete photo');
    }
  }

  async function handleSetPrimary(photoId: string) {
    setIsSettingPrimary(photoId);
    const result = await setPrimaryPhoto(photoId);
    setIsSettingPrimary(null);

    if (result.success) {
      setPhotos(photos.map(p => ({
        ...p,
        isPrimary: p.id === photoId,
      })));
      onPhotosChange?.();
    } else {
      alert(result.error || 'Failed to set primary photo');
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
    setIsDragging(true);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPhotos = [...photos];
    const draggedPhoto = newPhotos[draggedIndex];
    newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(index, 0, draggedPhoto);

    setPhotos(newPhotos);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    setIsDragging(false);
    setDraggedIndex(null);

    // Save new order to server
    const photoIds = photos.map(p => p.id);
    await reorderPhotos(plantId, photoIds);
    onPhotosChange?.();
  }

  if (photos.length === 0) {
    return (
      <div className="rounded-lg border-2 border-sage bg-card-bg p-12 text-center">
        <div className="mx-auto max-w-sm">
          <p className="text-2xl mb-2">📷</p>
          <h3 className="text-lg font-semibold text-moss-dark mb-2">No photos yet</h3>
          <p className="text-soil text-sm">
            Add photos to track your plant's growth and health over time
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`group relative rounded-lg overflow-hidden bg-sage-light border-2 transition-all cursor-move ${
              isDragging && draggedIndex === index
                ? 'border-moss opacity-50'
                : 'border-sage hover:border-moss'
            }`}
          >
            {/* Photo */}
            <div
              className="aspect-square bg-cover bg-center cursor-pointer"
              style={{ backgroundImage: `url(${photo.url})` }}
              onClick={() => setSelectedPhoto(photo)}
            />

            {/* Primary Badge */}
            {photo.isPrimary && (
              <div className="absolute top-2 left-2 bg-moss text-white px-2 py-1 rounded-md text-xs font-medium">
                Primary
              </div>
            )}

            {/* Actions Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
              {!photo.isPrimary && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimary(photo.id);
                  }}
                  disabled={isSettingPrimary === photo.id}
                  className="w-full bg-moss hover:bg-moss-light text-white text-xs"
                >
                  {isSettingPrimary === photo.id ? 'Setting...' : 'Set Primary'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(photo.id);
                }}
                disabled={isDeleting === photo.id}
                className="w-full bg-white/90 hover:bg-red-50 text-red-600 border-red-300 text-xs"
              >
                {isDeleting === photo.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-4xl font-light"
            >
              ×
            </button>
            <img
              src={selectedPhoto.url}
              alt="Full size plant photo"
              className="w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {selectedPhoto.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <p>{selectedPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
