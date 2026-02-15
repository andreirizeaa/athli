export const competitorKeys = ['truecoach', 'trainerize', 'everfit', 'trainheroic', 'mypthub', 'hubfit', 'kahunas'] as const

export type CompetitorKey = (typeof competitorKeys)[number]

export const competitorSlugs: Record<CompetitorKey, string> = {
    truecoach: 'athli-vs-truecoach',
    trainerize: 'athli-vs-trainerize',
    everfit: 'athli-vs-everfit',
    trainheroic: 'athli-vs-trainheroic',
    mypthub: 'athli-vs-mypthub',
    hubfit: 'athli-vs-hubfit',
    kahunas: 'athli-vs-kahunas',
}

export const slugToKey: Record<string, CompetitorKey> = Object.fromEntries(
    Object.entries(competitorSlugs).map(([key, slug]) => [slug, key as CompetitorKey])
) as Record<string, CompetitorKey>

export const allSlugs = Object.values(competitorSlugs)

export const competitorLogos: Record<CompetitorKey, string> = {
    truecoach: '/logos/truecoach.png',
    trainerize: '/logos/trainerize.png',
    everfit: '/logos/everfit.png',
    trainheroic: '/logos/trainheroic.png',
    mypthub: '/logos/mypthub.png',
    hubfit: '/logos/hubfit.png',
    kahunas: '/logos/kahunas.png',
}

export type PricingPlan = {
    name: string
    price: string
    clientLimit: string
    features: string[]
}

export type CompetitorPricingData = {
    name: string
    pageTitle: string
    pageSubtitle: string
    description: string
    trialInfo: string
    plans: PricingPlan[]
}
