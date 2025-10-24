'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlant, updatePlant } from '@/app/actions/plants';
import type { Plant } from '@/lib/db/types';
import { Button } from '@/components/ui/button';

interface PlantFormProps {
  plant?: Plant;
  mode: 'create' | 'edit';
}

export function PlantForm({ plant, mode }: PlantFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    const data = {
      // Basic info
      name: formData.get('name') as string,
      speciesType: formData.get('speciesType') as string,
      speciesName: formData.get('speciesName') as string,
      location: formData.get('location') as string,
      dateAcquired: new Date(formData.get('dateAcquired') as string),

      // Physical attributes
      potSize: formData.get('potSize') as string || null,
      potType: formData.get('potType') as string || null,
      potColor: formData.get('potColor') as string || null,
      soilType: formData.get('soilType') as string || null,
      hasDrainage: formData.get('hasDrainage') === 'true',
      currentHeightIn: formData.get('currentHeightIn')
        ? formData.get('currentHeightIn') as string
        : null,
      currentWidthIn: formData.get('currentWidthIn')
        ? formData.get('currentWidthIn') as string
        : null,

      // Care requirements
      lightLevel: (formData.get('lightLevel') as string || null) as any,
      humidityPreference: (formData.get('humidityPreference') as string || null) as any,
      minTemperatureF: formData.get('minTemperatureF')
        ? formData.get('minTemperatureF') as string
        : null,
      maxTemperatureF: formData.get('maxTemperatureF')
        ? formData.get('maxTemperatureF') as string
        : null,
      fertilizerType: formData.get('fertilizerType') as string || null,
      growthStage: (formData.get('growthStage') as string || null) as any,

      // Additional info
      toxicity: formData.get('toxicity') as string || null,
      nativeRegion: formData.get('nativeRegion') as string || null,
      growthRate: (formData.get('growthRate') as string || null) as any,
      difficultyLevel: (formData.get('difficultyLevel') as string || null) as any,
      purchaseLocation: formData.get('purchaseLocation') as string || null,
      purchasePriceCents: formData.get('purchasePriceCents')
        ? parseInt(formData.get('purchasePriceCents') as string) * 100
        : null,
      notes: formData.get('notes') as string || null,

      // Last care dates
      lastWateredAt: formData.get('lastWateredAt')
        ? new Date(formData.get('lastWateredAt') as string)
        : null,
      lastFertilizedAt: formData.get('lastFertilizedAt')
        ? new Date(formData.get('lastFertilizedAt') as string)
        : null,
      lastMistedAt: formData.get('lastMistedAt')
        ? new Date(formData.get('lastMistedAt') as string)
        : null,
      lastRepottedAt: formData.get('lastRepottedAt')
        ? new Date(formData.get('lastRepottedAt') as string)
        : null,
    };

    try {
      const result = mode === 'create'
        ? await createPlant(data)
        : await updatePlant(plant!.id, data);

      if (result.success) {
        router.push('/plants');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save plant');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h2 className="text-2xl font-semibold text-moss-dark mb-4">Basic Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-soil mb-1">
              Name <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={plant?.name}
              placeholder="e.g., Bob, My Monstera"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="speciesType" className="block text-sm font-medium text-soil mb-1">
              Species Type <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="speciesType"
              name="speciesType"
              required
              defaultValue={plant?.speciesType}
              placeholder="e.g., Philodendron"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="speciesName" className="block text-sm font-medium text-soil mb-1">
              Species Name <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="speciesName"
              name="speciesName"
              required
              defaultValue={plant?.speciesName}
              placeholder="e.g., Joepii"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-soil mb-1">
              Location <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              required
              defaultValue={plant?.location}
              placeholder="e.g., Living Room, Bedroom"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="dateAcquired" className="block text-sm font-medium text-soil mb-1">
              Date Acquired <span className="text-terracotta">*</span>
            </label>
            <input
              type="date"
              id="dateAcquired"
              name="dateAcquired"
              required
              defaultValue={plant?.dateAcquired ? new Date(plant.dateAcquired).toISOString().split('T')[0] : ''}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Physical Attributes */}
      <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h2 className="text-2xl font-semibold text-moss-dark mb-4">Physical Attributes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="potSize" className="block text-sm font-medium text-soil mb-1">
              Pot Size
            </label>
            <input
              type="text"
              id="potSize"
              name="potSize"
              defaultValue={plant?.potSize || ''}
              placeholder="e.g., 6 inch, 4L"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="potType" className="block text-sm font-medium text-soil mb-1">
              Pot Type
            </label>
            <input
              type="text"
              id="potType"
              name="potType"
              defaultValue={plant?.potType || ''}
              placeholder="e.g., Ceramic, Plastic, Terracotta"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="potColor" className="block text-sm font-medium text-soil mb-1">
              Pot Color
            </label>
            <input
              type="text"
              id="potColor"
              name="potColor"
              defaultValue={plant?.potColor || ''}
              placeholder="e.g., White, Terracotta, Green"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="soilType" className="block text-sm font-medium text-soil mb-1">
              Soil Type
            </label>
            <input
              type="text"
              id="soilType"
              name="soilType"
              defaultValue={plant?.soilType || ''}
              placeholder="e.g., Well-draining mix, Succulent mix"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="hasDrainage" className="block text-sm font-medium text-soil mb-1">
              Has Drainage Holes?
            </label>
            <select
              id="hasDrainage"
              name="hasDrainage"
              defaultValue={plant?.hasDrainage !== false ? 'true' : 'false'}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label htmlFor="currentHeightIn" className="block text-sm font-medium text-soil mb-1">
              Current Height (inches)
            </label>
            <input
              type="number"
              step="0.1"
              id="currentHeightIn"
              name="currentHeightIn"
              defaultValue={plant?.currentHeightIn || ''}
              placeholder="e.g., 12.5"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="currentWidthIn" className="block text-sm font-medium text-soil mb-1">
              Current Width (inches)
            </label>
            <input
              type="number"
              step="0.1"
              id="currentWidthIn"
              name="currentWidthIn"
              defaultValue={plant?.currentWidthIn || ''}
              placeholder="e.g., 8.5"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Care Requirements */}
      <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h2 className="text-2xl font-semibold text-moss-dark mb-4">Care Requirements</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="lightLevel" className="block text-sm font-medium text-soil mb-1">
              Light Level
            </label>
            <select
              id="lightLevel"
              name="lightLevel"
              defaultValue={plant?.lightLevel || ''}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value="">Select...</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="bright-indirect">Bright Indirect</option>
              <option value="bright-direct">Bright Direct</option>
            </select>
          </div>

          <div>
            <label htmlFor="humidityPreference" className="block text-sm font-medium text-soil mb-1">
              Humidity Preference
            </label>
            <select
              id="humidityPreference"
              name="humidityPreference"
              defaultValue={plant?.humidityPreference || ''}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value="">Select...</option>
              <option value="low">Low (30-40%)</option>
              <option value="medium">Medium (40-60%)</option>
              <option value="high">High (60%+)</option>
            </select>
          </div>

          <div>
            <label htmlFor="minTemperatureF" className="block text-sm font-medium text-soil mb-1">
              Min Temperature (°F)
            </label>
            <input
              type="number"
              step="1"
              id="minTemperatureF"
              name="minTemperatureF"
              defaultValue={plant?.minTemperatureF || ''}
              placeholder="e.g., 60"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="maxTemperatureF" className="block text-sm font-medium text-soil mb-1">
              Max Temperature (°F)
            </label>
            <input
              type="number"
              step="1"
              id="maxTemperatureF"
              name="maxTemperatureF"
              defaultValue={plant?.maxTemperatureF || ''}
              placeholder="e.g., 85"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="fertilizerType" className="block text-sm font-medium text-soil mb-1">
              Fertilizer Type
            </label>
            <input
              type="text"
              id="fertilizerType"
              name="fertilizerType"
              defaultValue={plant?.fertilizerType || ''}
              placeholder="e.g., 10-10-10, Organic, Fish emulsion"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="growthStage" className="block text-sm font-medium text-soil mb-1">
              Growth Stage
            </label>
            <select
              id="growthStage"
              name="growthStage"
              defaultValue={plant?.growthStage || ''}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value="">Select...</option>
              <option value="seedling">Seedling</option>
              <option value="juvenile">Juvenile</option>
              <option value="mature">Mature</option>
              <option value="flowering">Flowering</option>
            </select>
          </div>
        </div>
      </section>

      {/* Additional Information */}
      <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h2 className="text-2xl font-semibold text-moss-dark mb-4">Additional Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="toxicity" className="block text-sm font-medium text-soil mb-1">
              Toxicity
            </label>
            <input
              type="text"
              id="toxicity"
              name="toxicity"
              defaultValue={plant?.toxicity || ''}
              placeholder="e.g., Toxic to cats and dogs"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="nativeRegion" className="block text-sm font-medium text-soil mb-1">
              Native Region
            </label>
            <input
              type="text"
              id="nativeRegion"
              name="nativeRegion"
              defaultValue={plant?.nativeRegion || ''}
              placeholder="e.g., South America, Southeast Asia"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="growthRate" className="block text-sm font-medium text-soil mb-1">
              Growth Rate
            </label>
            <select
              id="growthRate"
              name="growthRate"
              defaultValue={plant?.growthRate || ''}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value="">Select...</option>
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </div>

          <div>
            <label htmlFor="difficultyLevel" className="block text-sm font-medium text-soil mb-1">
              Difficulty Level
            </label>
            <select
              id="difficultyLevel"
              name="difficultyLevel"
              defaultValue={plant?.difficultyLevel || ''}
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value="">Select...</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="purchaseLocation" className="block text-sm font-medium text-soil mb-1">
              Purchase Location
            </label>
            <input
              type="text"
              id="purchaseLocation"
              name="purchaseLocation"
              defaultValue={plant?.purchaseLocation || ''}
              placeholder="e.g., Local nursery, Home Depot"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="purchasePriceCents" className="block text-sm font-medium text-soil mb-1">
              Purchase Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              id="purchasePriceCents"
              name="purchasePriceCents"
              defaultValue={plant?.purchasePriceCents ? (plant.purchasePriceCents / 100).toFixed(2) : ''}
              placeholder="0.00"
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-soil mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={plant?.notes || ''}
              placeholder="Any additional notes about your plant..."
              className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Last Care Dates (Only show on create) */}
      {mode === 'create' && (
        <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
          <h2 className="text-2xl font-semibold text-moss-dark mb-2">
            Last Care Dates (Optional)
          </h2>
          <p className="text-sm text-soil mb-4">
            If you've already been caring for this plant, enter when you last completed these tasks.
            We'll automatically create care tasks and calculate when they're next due based on default schedules.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lastWateredAt" className="block text-sm font-medium text-soil mb-1">
                Last Watered
              </label>
              <input
                type="date"
                id="lastWateredAt"
                name="lastWateredAt"
                className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
              />
              <p className="mt-1 text-xs text-soil">Next due in 6 days</p>
            </div>

            <div>
              <label htmlFor="lastFertilizedAt" className="block text-sm font-medium text-soil mb-1">
                Last Fertilized
              </label>
              <input
                type="date"
                id="lastFertilizedAt"
                name="lastFertilizedAt"
                className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
              />
              <p className="mt-1 text-xs text-soil">Next due in 12 days</p>
            </div>

            <div>
              <label htmlFor="lastMistedAt" className="block text-sm font-medium text-soil mb-1">
                Last Misted
              </label>
              <input
                type="date"
                id="lastMistedAt"
                name="lastMistedAt"
                className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
              />
              <p className="mt-1 text-xs text-soil">Next due in 3 days</p>
            </div>

            <div>
              <label htmlFor="lastRepottedAt" className="block text-sm font-medium text-soil mb-1">
                Last Repotted
              </label>
              <input
                type="date"
                id="lastRepottedAt"
                name="lastRepottedAt"
                className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
              />
              <p className="mt-1 text-xs text-soil">Next check in 6 months</p>
            </div>
          </div>
        </section>
      )}

      {/* Form Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-moss hover:bg-moss-light text-white"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Plant' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
