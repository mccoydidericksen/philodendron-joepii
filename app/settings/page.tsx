import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationSettings } from '@/components/NotificationSettings';
import { Button } from '@/components/ui/button';

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="mx-auto max-w-4xl relative">
        {/* Header Actions */}
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

        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-moss hover:text-moss-dark mb-4 transition-colors"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-4xl font-bold text-moss-dark">Notification Settings</h1>
          <p className="mt-2 text-soil">
            Manage how and when you receive plant care reminders
          </p>
        </div>

        {/* Settings Content */}
        <NotificationSettings />
      </div>
    </div>
  );
}
