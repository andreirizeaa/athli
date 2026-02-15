export const featureKeys = ['automations', 'forms', 'inbox', 'metrics', 'habits', 'exercise-history', 'progress-photos', 'client-training', 'workouts', 'packages'] as const;

export type FeatureKey = (typeof featureKeys)[number];

export type FeaturePageData = {
    key: string
    label: string
    headline: string
    description: string
    highlights: string[]
    benefits: { title: string; description: string }[]
}
