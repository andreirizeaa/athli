import posthog from 'posthog-js';

// TEMPORARILY DISABLED - change to true to re-enable PostHog
const POSTHOG_ENABLED = false;

if (POSTHOG_ENABLED) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        // Automatic instrumentation
        autocapture: true,           // Auto-track clicks, inputs, form submissions
        capture_pageview: true,      // Auto-track page views
        capture_pageleave: true,     // Auto-track page leaves
        capture_heatmaps: true,      // Enable heatmaps
        capture_dead_clicks: true,   // Track clicks that don't trigger navigation
    });
}
