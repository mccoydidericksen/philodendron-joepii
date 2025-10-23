import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DemoBanner } from '@/components/DemoBanner';
import { PlantForm } from '@/components/PlantForm';

export default async function NewPlantPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const isDemoAccount = user?.publicMetadata?.isDemoAccount === true;

  return (
    <>
      {isDemoAccount && <DemoBanner />}
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-moss-dark">Add New Plant</h1>
            <p className="mt-2 text-soil">
              Fill in the details about your new plant
            </p>
          </header>

          <PlantForm mode="create" />
        </div>
      </div>
    </>
  );
}
