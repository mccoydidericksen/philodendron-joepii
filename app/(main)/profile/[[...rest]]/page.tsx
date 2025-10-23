import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserProfile } from '@clerk/nextjs';

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-cream p-8 pb-32">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-moss-dark">Profile</h1>
          <p className="mt-2 text-soil">
            Manage your account settings and preferences
          </p>
        </header>

        <div className="flex justify-center">
          <UserProfile
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-lg border-2 border-sage',
                navbar: 'border-r-2 border-sage',
                navbarButton: 'text-soil hover:bg-sage/20 hover:text-moss-dark',
                navbarButtonActive: 'bg-moss text-white hover:bg-moss-light',
                formButtonPrimary: 'bg-moss hover:bg-moss-light text-white',
                formFieldInput: 'border-2 border-sage focus:border-moss',
                profileSectionTitle: 'text-moss-dark',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
