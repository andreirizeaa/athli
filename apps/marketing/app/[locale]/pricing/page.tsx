import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import Pricing from '@/components/pricing'
import PricingComparison from '@/components/pricing-comparison'
import PageHero from '@/components/page-hero'

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations('pages')

    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <PageHero
                    title={t('pricing.title')}
                    subtitle={t('pricing.subtitle')}
                />
                <Pricing hideHeader />
                <PricingComparison />
            </main>
            <Footer />
        </div>
    )
}
