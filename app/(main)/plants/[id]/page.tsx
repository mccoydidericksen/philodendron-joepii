import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { DemoBanner } from '@/components/DemoBanner';
import { getPlant } from '@/app/actions/plants';
import { Button } from '@/components/ui/button';
import { PlantMediaSection } from '@/components/PlantMediaSection';
import { PlantCareSection } from '@/components/PlantCareSection';

export default async function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const isDemoAccount = user?.publicMetadata?.isDemoAccount === true;

  // Fetch plant details
  const { id } = await params;
  const result = await getPlant(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const plant = result.data;

  return (
    <>
      {isDemoAccount && <DemoBanner />}
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/plants"
                className="text-moss hover:text-moss-dark transition-colors"
              >
                ← Back to Plants
              </Link>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-moss-dark mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>
                  {plant.name}
                </h1>
                <p className="text-sage-dark text-sm italic">{plant.speciesType} {plant.speciesName}</p>
              </div>
              <div className="flex gap-3">
                <Link href="/plant-assistant">
                  <Button variant="outline" className="border-moss text-moss hover:bg-moss/10">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ask Assistant
                  </Button>
                </Link>
                <Link href={`/plants/${plant.id}/edit`}>
                  <Button className="bg-moss hover:bg-moss-light text-white">
                    Edit Plant
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Photos Section */}
          <div className="mb-8">
            <PlantMediaSection plantId={plant.id} media={plant.media || []} />
          </div>

          {/* Care Schedule Section */}
          <div className="mb-8">
            <PlantCareSection plantId={plant.id} tasks={plant.careTasks || []} />
          </div>

          {/* Information Cards */}
          <div className="space-y-6">
            {/* Basic Information */}
            <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
              <h2 className="text-2xl font-semibold text-moss-dark mb-4">Basic Information</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-soil">Location</dt>
                  <dd className="mt-1 text-lg text-moss-dark">📍 {plant.location}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-soil">Date Acquired</dt>
                  <dd className="mt-1 text-lg text-moss-dark">
                    {new Date(plant.dateAcquired).toLocaleDateString()}
                  </dd>
                </div>
                {plant.potSize && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Pot Size</dt>
                    <dd className="mt-1 text-lg text-moss-dark">{plant.potSize}</dd>
                  </div>
                )}
                {plant.potType && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Pot Type</dt>
                    <dd className="mt-1 text-lg text-moss-dark">{plant.potType}</dd>
                  </div>
                )}
                {plant.potColor && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Pot Color</dt>
                    <dd className="mt-1 text-lg text-moss-dark">{plant.potColor}</dd>
                  </div>
                )}
                {plant.soilType && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Soil Type</dt>
                    <dd className="mt-1 text-lg text-moss-dark">{plant.soilType}</dd>
                  </div>
                )}
                {plant.hasDrainage !== null && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Drainage</dt>
                    <dd className="mt-1 text-lg text-moss-dark">
                      {plant.hasDrainage ? '✓ Has drainage' : '✗ No drainage'}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Growth Info */}
            {(plant.currentHeightIn || plant.currentWidthIn || plant.growthRate || plant.growthStage) && (
              <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
                <h2 className="text-2xl font-semibold text-moss-dark mb-4">Growth Information</h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {plant.currentHeightIn && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Current Height</dt>
                      <dd className="mt-1 text-lg text-moss-dark">{plant.currentHeightIn} inches</dd>
                    </div>
                  )}
                  {plant.currentWidthIn && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Current Width</dt>
                      <dd className="mt-1 text-lg text-moss-dark">{plant.currentWidthIn} inches</dd>
                    </div>
                  )}
                  {plant.growthRate && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Growth Rate</dt>
                      <dd className="mt-1 text-lg text-moss-dark capitalize">{plant.growthRate}</dd>
                    </div>
                  )}
                  {plant.growthStage && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Growth Stage</dt>
                      <dd className="mt-1 text-lg text-moss-dark capitalize">{plant.growthStage}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Care Requirements */}
            <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
              <h2 className="text-2xl font-semibold text-moss-dark mb-4">Care Requirements</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {plant.lightLevel && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Light Level</dt>
                    <dd className="mt-1 text-lg text-moss-dark capitalize">
                      💡 {plant.lightLevel.replace('-', ' ')}
                    </dd>
                  </div>
                )}
                {plant.humidityPreference && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Humidity</dt>
                    <dd className="mt-1 text-lg text-moss-dark capitalize">
                      💧 {plant.humidityPreference}
                    </dd>
                  </div>
                )}
                {(plant.minTemperatureF || plant.maxTemperatureF) && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Temperature Range</dt>
                    <dd className="mt-1 text-lg text-moss-dark">
                      🌡️ {plant.minTemperatureF || '?'}°F - {plant.maxTemperatureF || '?'}°F
                    </dd>
                  </div>
                )}
                {plant.fertilizerType && (
                  <div>
                    <dt className="text-sm font-medium text-soil">Fertilizer</dt>
                    <dd className="mt-1 text-lg text-moss-dark">{plant.fertilizerType}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Additional Information */}
            {(plant.toxicity || plant.nativeRegion || plant.difficultyLevel || plant.purchaseLocation) && (
              <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
                <h2 className="text-2xl font-semibold text-moss-dark mb-4">Additional Information</h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {plant.toxicity && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Toxicity</dt>
                      <dd className="mt-1 text-lg text-moss-dark">⚠️ {plant.toxicity}</dd>
                    </div>
                  )}
                  {plant.nativeRegion && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Native Region</dt>
                      <dd className="mt-1 text-lg text-moss-dark">🌍 {plant.nativeRegion}</dd>
                    </div>
                  )}
                  {plant.difficultyLevel && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Difficulty Level</dt>
                      <dd className="mt-1 text-lg text-moss-dark capitalize">
                        🎯 {plant.difficultyLevel}
                      </dd>
                    </div>
                  )}
                  {plant.purchaseLocation && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Purchase Location</dt>
                      <dd className="mt-1 text-lg text-moss-dark">{plant.purchaseLocation}</dd>
                    </div>
                  )}
                  {plant.purchasePriceCents && (
                    <div>
                      <dt className="text-sm font-medium text-soil">Purchase Price</dt>
                      <dd className="mt-1 text-lg text-moss-dark">
                        ${(plant.purchasePriceCents / 100).toFixed(2)}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Quick Links */}
            {plant.links && plant.links.length > 0 && (
              <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
                <h2 className="text-2xl font-semibold text-moss-dark mb-4">Resources</h2>
                <ul className="space-y-2">
                  {plant.links.slice(0, 5).map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-moss hover:text-moss-dark transition-colors"
                      >
                        <span>
                          {link.linkType === 'tiktok' ? '📱' :
                           link.linkType === 'youtube' ? '▶️' :
                           link.linkType === 'instagram' ? '📷' : '🔗'}
                        </span>
                        <span className="text-sm truncate">{link.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Notes */}
            {plant.notes && typeof plant.notes === 'string' && plant.notes.trim() !== '' && (
              <section className="rounded-lg border-2 border-sage bg-card-bg p-6">
                <h2 className="text-2xl font-semibold text-moss-dark mb-4">Notes</h2>
                <p className="text-moss-dark whitespace-pre-wrap">{plant.notes}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
