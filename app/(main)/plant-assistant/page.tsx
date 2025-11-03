import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PlantCareChat } from '@/components/PlantCareChat';
import { DemoBanner } from '@/components/DemoBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { UserButton } from '@clerk/nextjs';

export default async function PlantAssistantPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const isDemoAccount = user?.publicMetadata?.isDemoAccount === true;

  return (
    <>
      {isDemoAccount && <DemoBanner />}
      <div className="min-h-screen bg-cream p-4 md:p-8 pb-24 md:pb-8">
        <div className="mx-auto max-w-7xl relative">
          {/* User Actions - Top Right */}
          <div className="absolute right-0 top-0 flex items-center gap-3 z-10">
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

          {/* Chat Component */}
          <PlantCareChat />
        </div>
      </div>
    </>
  );
}
