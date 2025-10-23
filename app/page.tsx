'use client';

import { useState } from 'react';
import { DemoLoginModal } from '@/components/DemoLoginModal';

export default function HomePage() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="mb-4 text-5xl font-bold text-moss-dark">
            Philodendron Joepii
          </h1>
          <p className="mb-8 text-lg text-soil">
            Never forget to water your plants again. Track care schedules, set reminders,
            and keep all your houseplants thriving.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/sign-up"
              className="rounded-lg bg-moss px-6 py-3 font-semibold text-cream transition-colors hover:bg-moss-light"
            >
              Get Started
            </a>
            <a
              href="/sign-in"
              className="rounded-lg border-2 border-sage px-6 py-3 font-semibold text-moss transition-colors hover:border-moss hover:bg-sage/10"
            >
              Sign In
            </a>
            <button
              onClick={() => setShowDemoModal(true)}
              className="rounded-lg border-2 border-terracotta bg-terracotta/10 px-6 py-3 font-semibold text-terracotta transition-colors hover:border-terracotta hover:bg-terracotta/20"
            >
              👨‍💻 View Demo
            </button>
          </div>
        </div>
      </div>

      <DemoLoginModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
      />
    </>
  );
}
