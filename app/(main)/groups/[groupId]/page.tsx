import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getPlantGroup } from '@/app/actions/plant-groups';
import { GroupDetailClient } from '@/components/plant-groups/GroupDetailClient';
import { DemoBanner } from '@/components/DemoBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const isDemoAccount = user?.publicMetadata?.isDemoAccount === true;

  // Await params (Next.js 15 requirement)
  const { groupId } = await params;

  // Get group data
  const groupResult = await getPlantGroup(groupId);

  if (!groupResult.success) {
    return (
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-lg border-2 border-danger bg-card-bg p-6">
            <h2 className="text-xl font-semibold text-danger mb-2">
              Group Not Found
            </h2>
            <p className="text-soil mb-4">
              {groupResult.error || 'This group does not exist or you do not have access to it.'}
            </p>
            <Link
              href="/groups"
              className="inline-flex items-center gap-2 text-moss hover:text-moss-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const group = groupResult.data;

  if (!group) {
    return (
      <div className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-lg border-2 border-danger bg-card-bg p-6">
            <h2 className="text-xl font-semibold text-danger mb-2">
              Group Not Found
            </h2>
            <p className="text-soil mb-4">
              This group does not exist or you do not have access to it.
            </p>
            <Link
              href="/groups"
              className="inline-flex items-center gap-2 text-moss hover:text-moss-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get user's role in this group
  const { clerkClient } = await import('@clerk/nextjs/server');
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  const membership = memberships.data.find((m) => m.organization.id === groupId);
  const userRole = membership?.role === 'org:admin' ? 'admin' : 'member';

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

          {/* Back Button */}
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-moss hover:text-moss-dark transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </Link>

          <GroupDetailClient
            groupId={groupId}
            groupName={group.name}
            description={group.description}
            memberCount={group.memberCount}
            userRole={userRole}
            currentUserId={userId}
          />
        </div>
      </div>
    </>
  );
}
