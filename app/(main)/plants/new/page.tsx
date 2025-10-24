'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlantForm } from '@/components/PlantForm';
import { BulkUploadModal } from '@/components/BulkUploadModal';
import { Button } from '@/components/ui/button';

export default function NewPlantPage() {
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-moss-dark mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>Add New Plant</h1>
                <p className="text-sage-dark text-sm">
                  Fill in the details about your new plant
                </p>
              </div>
              <Button
                onClick={() => setShowBulkUpload(true)}
                variant="outline"
                className="whitespace-nowrap"
              >
                📤 Bulk Upload
              </Button>
            </div>
          </header>

          <PlantForm mode="create" />
        </div>
      </div>

      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
      />
    </>
  );
}
