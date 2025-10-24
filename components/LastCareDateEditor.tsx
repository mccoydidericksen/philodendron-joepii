'use client';

import { useState } from 'react';
import { updateLastCareDate } from '@/app/actions/plants';
import { Button } from '@/components/ui/button';
import type { Plant } from '@/lib/db/types';

interface LastCareDateEditorProps {
  plant: Plant;
}

type CareType = 'water' | 'fertilize' | 'mist' | 'repot';

export function LastCareDateEditor({ plant }: LastCareDateEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const careTypes: Array<{
    type: CareType;
    label: string;
    field: keyof Pick<Plant, 'lastWateredAt' | 'lastFertilizedAt' | 'lastMistedAt' | 'lastRepottedAt'>;
  }> = [
    { type: 'water', label: 'Last Watered', field: 'lastWateredAt' },
    { type: 'fertilize', label: 'Last Fertilized', field: 'lastFertilizedAt' },
    { type: 'mist', label: 'Last Misted', field: 'lastMistedAt' },
    { type: 'repot', label: 'Last Repotted', field: 'lastRepottedAt' },
  ];

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const toDateInputValue = (date: Date | string | null) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      // Update each care date that was modified
      for (const { type, field } of careTypes) {
        const newDateStr = formData.get(field) as string;
        const oldDate = plant[field];

        // Only update if date changed
        if (newDateStr && newDateStr !== toDateInputValue(oldDate)) {
          const result = await updateLastCareDate(plant.id, type, new Date(newDateStr));

          if (!result.success) {
            throw new Error(result.error || `Failed to update ${type} date`);
          }
        }
      }

      setIsEditing(false);
      // Force page refresh to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dates');
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-moss-dark">Last Care Dates</h3>
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            Edit Dates
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {careTypes.map(({ label, field }) => (
            <div key={field} className="border-b border-sage/30 pb-2">
              <p className="text-sm font-medium text-soil">{label}</p>
              <p className="text-moss-dark">{formatDate(plant[field])}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-soil">
          These dates are automatically updated when you complete care tasks, but you can manually
          adjust them here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
      <h3 className="mb-4 text-xl font-semibold text-moss-dark">Edit Last Care Dates</h3>

      {error && (
        <div className="mb-4 rounded-lg border-2 border-red-200 bg-red-50 p-3 text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {careTypes.map(({ label, field }) => (
            <div key={field}>
              <label htmlFor={field} className="block text-sm font-medium text-soil mb-1">
                {label}
              </label>
              <input
                type="date"
                id={field}
                name={field}
                defaultValue={toDateInputValue(plant[field])}
                className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
              />
            </div>
          ))}
        </div>

        <p className="text-sm text-soil">
          Updating these dates will recalculate the next due dates for associated care tasks based on
          their default schedules.
        </p>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setError(null);
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
