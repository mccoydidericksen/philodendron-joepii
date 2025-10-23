'use client';

import { useState } from 'react';
import Link from 'next/link';

export function DemoBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="sticky top-0 z-40 border-b-2 border-warning/30 bg-warning/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0 text-2xl" role="img" aria-label="developer">
            👨‍💻
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-moss-dark sm:text-base">
              You're viewing the developer's showcase account
            </p>
            <p className="mt-0.5 text-xs text-soil sm:text-sm">
              Feel free to add, edit, or delete anything! It's all demo data.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="hidden rounded-lg border border-moss bg-moss px-4 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-moss-light sm:block"
          >
            Create Account
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            className="flex size-8 items-center justify-center rounded-lg text-soil transition-colors hover:bg-warning/30 hover:text-moss-dark"
            aria-label="Dismiss banner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
