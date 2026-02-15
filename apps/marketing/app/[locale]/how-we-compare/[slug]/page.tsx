import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import PageHero from '@/components/page-hero'
import CallToAction from '@/components/call-to-action'
import CompetitorBlogContent from '@/components/competitor-blog-content'
import { allSlugs, slugToKey } from '@/lib/competitor-pricing-data'
import { routing } from '@/lib/i18n/routing'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://athli.app'

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

    const seoTitle = t(`competitors.${key}.seoTitle`)
    const seoDescription = t(`competitors.${key}.seoDescription`)
    const canonicalPath = locale === routing.defaultLocale
        ? `/how-we-compare/${slug}`
        : `/${locale}/how-we-compare/${slug}`
    const canonical = `${SITE_URL}${canonicalPath}`

    return {
        title: seoTitle,
        description: seoDescription,
        alternates: { canonical },
        openGraph: {
            title: seoTitle,
            description: seoDescription,
            url: canonical,
            siteName: 'Athli',
            type: 'article',
            locale: locale === 'es' ? 'es_ES' : 'en_GB',
        },
        twitter: {
            card: 'summary_large_image',
            title: seoTitle,
            description: seoDescription,
        },
    }
}

export default async function CompetitorPricingPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params
    const key = slugToKey[slug]
    if (!key) notFound()
    setRequestLocale(locale)

    const t = await getTranslations('competitorPricing')

    const seoTitle = t(`competitors.${key}.seoTitle`)
    const seoDescription = t(`competitors.${key}.seoDescription`)
    const canonicalPath = locale === routing.defaultLocale
        ? `/how-we-compare/${slug}`
        : `/${locale}/how-we-compare/${slug}`
    const canonical = `${SITE_URL}${canonicalPath}`

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: seoTitle,
        description: seoDescription,
        url: canonical,
        publisher: {
            '@type': 'Organization',
            name: 'Athli',
            url: SITE_URL,
        },
    }

    return (
        <div className="flex min-h-screen flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <HeroHeader />
            <main className="flex-1 pt-24">
                <PageHero
                    title={t(`competitors.${key}.pageTitle`)}
                    subtitle={t(`competitors.${key}.pageSubtitle`)}
                />
                <CompetitorBlogContent competitorKey={key} />
            </main>
            <CallToAction />
            <Footer />
        </div>
    )
}
