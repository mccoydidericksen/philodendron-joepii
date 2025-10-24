import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PlantGroupsList } from '@/components/plant-groups/PlantGroupsList';
import { DemoBanner } from '@/components/DemoBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { UserButton } from '@clerk/nextjs';

export default async function GroupsPage() {
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
        <div className="mx-auto max-w-[1400px] relative">
          {/* User Actions - Top Right */}
          <div className="absolute right-0 top-0 flex items-center gap-3">
            <NotificationBell />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'size-10 ring-2 ring-sage hover:ring-moss transition-all',
                  userButtonPopoverCard: 'shadow-lg border-2 border-sage',
                },
              }}
            />
          </div>

          <header className="mb-8">
            <h1 className="text-3xl font-bold text-moss-dark mb-2" style={{ fontFamily: 'var(--font-fredoka)' }}>Plant Groups</h1>
            <p className="text-sage-dark text-sm">
              Collaborate with friends and family on plant care
            </p>
          </header>

          <PlantGroupsList />
        </div>
      </div>
    </>
  );
}
