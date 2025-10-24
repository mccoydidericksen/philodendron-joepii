import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { DemoBanner } from '@/components/DemoBanner';
import { PlantForm } from '@/components/PlantForm';
import { getPlant } from '@/app/actions/plants';

export default async function EditPlantPage({ params }: { params: Promise<{ id: string }> }) {
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
        <div className="mx-auto max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-moss-dark mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>Edit Plant</h1>
            <p className="text-sage-dark text-sm">
              Update details for {plant.name}
            </p>
          </header>

          <PlantForm mode="edit" plant={plant} />
        </div>
      </div>
    </>
  );
}
