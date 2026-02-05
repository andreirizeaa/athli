import posthog from 'posthog-js';

/**
 * Analytics service for tracking events via PostHog
 * 
 * Usage:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('button_clicked', { buttonName: 'submit' });
 */

export type AnalyticsEventProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Track a custom event with optional properties
 * @param eventName - Name of the event to track
 * @param properties - Optional properties to attach to the event
 */
export function trackEvent(eventName: string, properties?: AnalyticsEventProperties): void {
    if (typeof window === 'undefined') {
        return;
    }

    posthog.capture(eventName, properties);
}

/**
 * Identify a user for analytics tracking
 * @param userId - Unique identifier for the user
 * @param traits - Optional user traits/properties
 */
export function identifyUser(userId: string, traits?: AnalyticsEventProperties): void {
    if (typeof window === 'undefined') {
        return;
    }

    posthog.identify(userId, traits);
}

/**
 * Reset the current user's identity (e.g., on logout)
 */
export function resetUser(): void {
    if (typeof window === 'undefined') {
        return;
    }

    posthog.reset();
}

// Analytics event constants - add new events here
export const AnalyticsEvents = {
    // Test events
    AI_ASSISTANT_BUTTON_CLICKED: 'ai_assistant_button_clicked',

    // Add more events as needed
} as const;
