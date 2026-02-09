import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import MobileAppShowcase from '@/components/mobile-app-showcase'
import type { Feature } from '@/components/mobile-app-showcase'

const coachFeatureKeys = ['workout-builder', 'training', 'review-workouts', 'manage-client', 'habits', 'exercise-history', 'forms', 'chats'] as const

export default async function MobileCoachPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations('mobileCoach')

    const features: Feature[] = coachFeatureKeys.map((key) => ({
        key,
        label: t(`features.${key}.label`),
        headline: t(`features.${key}.headline`),
        description: t(`features.${key}.description`),
        highlights: t.raw(`features.${key}.highlights`) as string[],
        imagePath: `/mobile/coach/${key}`,
    }))

    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <MobileAppShowcase
                    appTitle={`Athli for ${t('appName')}`}
                    tagline={t('tagline')}
                    description={t('description')}
                    features={features}
                    getAppTitle={t('getAppTitle')}
                    getAppSubtitle={t('getAppSubtitle')}
                />
            </main>
            <Footer />
        </div>
    )
}
