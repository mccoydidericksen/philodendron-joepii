'use client';

import { SignIn } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function SignInPage() {
  const [demoEmail, setDemoEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if coming from demo button
    const email = sessionStorage.getItem('demo_email');
    if (email) {
      setDemoEmail(email);
      // Clear it after use
      sessionStorage.removeItem('demo_email');
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-moss-dark">
            {demoEmail ? 'Demo Account Login' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-soil">
            {demoEmail ? 'Use the password from the modal to sign in 👨‍💻' : 'Sign in to manage your plants 🌱'}
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg border-2 border-sage',
            },
          }}
          initialValues={{
            emailAddress: demoEmail || '',
          }}
        />
      </div>
    </div>
  );
}
