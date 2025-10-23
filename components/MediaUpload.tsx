'use client';

import { useState, useRef } from 'react';
import { uploadPlantPhoto } from '@/app/actions/media';
import { Button } from '@/components/ui/button';

interface MediaUploadProps {
  plantId: string;
  currentPhotoCount: number;
  onUploadComplete?: () => void;
}

export function MediaUpload({ plantId, currentPhotoCount, onUploadComplete }: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxPhotos = 20;
  const remainingSlots = maxPhotos - currentPhotoCount;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadPlantPhoto(plantId, formData);

      if (result.success) {
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Notify parent component
        onUploadComplete?.();
      } else {
        setError(result.error || 'Failed to upload photo');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  if (remainingSlots <= 0) {
    return (
      <div className="rounded-lg border-2 border-sage bg-card-bg p-4 text-center">
        <p className="text-soil">Maximum of {maxPhotos} photos reached</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
        <Button
          type="button"
          onClick={handleButtonClick}
          disabled={isUploading}
          className="bg-moss hover:bg-moss-light text-white"
        >
          {isUploading ? 'Uploading...' : '+ Add Photo'}
        </Button>
        <p className="text-sm text-soil">
          {remainingSlots} of {maxPhotos} photos remaining
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border-2 border-red-200 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-soil">
        Accepted formats: JPEG, PNG, WebP • Max size: 5MB
      </p>
    </div>
  );
}
