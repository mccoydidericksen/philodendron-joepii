import posthog from "posthog-js"

// Only initialize PostHog in production to exclude localhost/development tracking
if (process.env.NODE_ENV === "production") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
    },
    capture_exceptions: true, // This enables capturing exceptions using Error Tracking
  });
}
