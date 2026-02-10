import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import PageHero from '@/components/page-hero'
import CallToAction from '@/components/call-to-action'
import CompetitorPricingContent from '@/components/competitor-pricing-content'
import { allSlugs, slugToKey } from '@/lib/competitor-pricing-data'
import { routing } from '@/lib/i18n/routing'

export function generateStaticParams() {
    return routing.locales.flatMap((locale) =>
        allSlugs.map((slug) => ({ locale, slug }))
    )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params
    const key = slugToKey[slug]
    if (!key) return {}
    setRequestLocale(locale)

    const t = await getTranslations('competitorPricing')
    return {
        title: `${t(`competitors.${key}.pageTitle`)} ${t('pricingComparison')} | Athli`,
        description: t(`competitors.${key}.pageSubtitle`),
    }
}

export default async function CompetitorPricingPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params
    const key = slugToKey[slug]
    if (!key) notFound()
    setRequestLocale(locale)

    const t = await getTranslations('competitorPricing')

    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <PageHero
                    title={t(`competitors.${key}.pageTitle`)}
                    titleLine2={t('pricingComparison')}
                    subtitle={t(`competitors.${key}.pageSubtitle`)}
                />
                <CompetitorPricingContent competitorKey={key} />
            </main>
            <CallToAction />
            <Footer />
        </div>
    )
}
