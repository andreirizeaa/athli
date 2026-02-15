import type { CompetitorKey } from './competitor-pricing-data'

// Availability matrix shared between comparison table and competitor blog pages
// Columns: Athli, TrueCoach, Trainerize, Everfit, TrainHeroic, MyPTHub, HubFit, Kahunas
export const availability = [
    // AI & Automation
    [true, false, false, false, false, false, false, false],
    [true, false, false, false, false, false, false, false],
    [true, false, false, true, false, false, true, true],
    // Training & Programming
    [true, false, false, true, true, false, true, false],
    // Accountability & Data
    [true, true, false, true, false, false, true, true],
    [true, true, true, true, false, true, true, true],
    // Platform
    [true, true, true, true, true, true, true, true],
    [true, true, false, true, false, false, false, true],
]

// Competitor key -> column index in availability matrix (0 = Athli)
export const competitorColumnIndex: Record<CompetitorKey, number> = {
    truecoach: 1,
    trainerize: 2,
    everfit: 3,
    trainheroic: 4,
    mypthub: 5,
    hubfit: 6,
    kahunas: 7,
}

// Feature keys in order matching availability matrix rows
export const comparisonFeatureKeys = [
    'ai-assistant',
    'automation-flows',
    'custom-onboarding',
    'advanced-workout-builder',
    'custom-forms',
    'habit-metric-tracking',
    'payment-packages',
    'file-resource-storage',
] as const

export type ComparisonFeatureKey = (typeof comparisonFeatureKeys)[number]

// Feature key -> screenshot folder under /features/
export const featureScreenshotMap: Record<ComparisonFeatureKey, string | null> = {
    'ai-assistant': 'ai',
    'automation-flows': 'automations',
    'custom-onboarding': 'onboardings',
    'advanced-workout-builder': 'workouts',
    'custom-forms': 'forms',
    'habit-metric-tracking': 'habits',
    'payment-packages': 'packages',
    'file-resource-storage': null,
}

// Returns indices into comparisonFeatureKeys for features the competitor lacks
export function getMissingFeatureIndices(competitorKey: CompetitorKey): number[] {
    const colIdx = competitorColumnIndex[competitorKey]
    return availability.reduce<number[]>((acc, row, i) => {
        if (!row[colIdx]) acc.push(i)
        return acc
    }, [])
}

// Parse the lowest numeric price from a competitor's plans array
export function getLowestCompetitorPrice(plans: { price: string }[]): string | null {
    let lowest: number | null = null
    let lowestStr: string | null = null
    for (const plan of plans) {
        const match = plan.price.match(/[\d]+(?:\.[\d]+)?/)
        if (match) {
            const val = parseFloat(match[0])
            if (lowest === null || val < lowest) {
                lowest = val
                lowestStr = plan.price
            }
        }
    }
    return lowestStr
}
