'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize PostHog only on client-side
    if (typeof window !== 'undefined') {
      if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        console.error('[PostHog] ERROR: NEXT_PUBLIC_POSTHOG_KEY is not set!');
        return;
      }

      try {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: '/greenhouse',
          ui_host: 'https://us.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: true,
          capture_pageleave: true,
          session_recording: {
            maskAllInputs: false,
            maskInputOptions: {
              password: true,
            },
          },
          capture_exceptions: true,
        });
      } catch (error) {
        console.error('[PostHog] Initialization error:', error);
      }
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
