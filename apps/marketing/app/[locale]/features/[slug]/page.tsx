import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import PageHero from '@/components/page-hero'
import CallToAction from '@/components/call-to-action'
import FeaturePageContent from '@/components/feature-page-content'
import { featureKeys } from '@/lib/features-data'
import type { FeaturePageData } from '@/lib/features-data'
import { routing } from '@/lib/i18n/routing'

export function generateStaticParams() {
    return routing.locales.flatMap((locale) =>
        featureKeys.map((key) => ({ locale, slug: key }))
    )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params
    if (!featureKeys.includes(slug as any)) return {}
    setRequestLocale(locale)

    const t = await getTranslations('features')
    return {
        title: `${t(`${slug}.label`)} — Athli`,
        description: t(`${slug}.pageSubtitle`),
    }
}

export default async function FeaturePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params
    if (!featureKeys.includes(slug as any)) notFound()
    setRequestLocale(locale)

    const t = await getTranslations('features')

    const feature: FeaturePageData = {
        key: slug,
        label: t(`${slug}.label`),
        headline: t(`${slug}.headline`),
        description: t(`${slug}.description`),
        highlights: t.raw(`${slug}.highlights`) as string[],
        benefits: t.raw(`${slug}.benefits`) as { title: string; description: string }[],
    }

    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <PageHero title={t(`${slug}.pageTitle`)} subtitle={t(`${slug}.pageSubtitle`)} />
                <FeaturePageContent feature={feature} />
            </main>
            <CallToAction />
            <Footer />
        </div>
    )
}
