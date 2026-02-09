export const featureKeys = ['flows', 'forms', 'inbox', 'metrics', 'progress', 'training', 'workouts'] as const;

export type FeatureKey = (typeof featureKeys)[number];

export type FeaturePageData = {
    key: string
    label: string
    headline: string
    description: string
    highlights: string[]
    benefits: { title: string; description: string }[]
}
