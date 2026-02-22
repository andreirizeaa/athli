import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import AffiliateContent from './affiliate-content'
import AffiliateHero from './affiliate-hero'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    setRequestLocale(locale)
    return {
        title: 'Affiliate Program - Athli',
        description: 'Partner with Athli and earn $20 for every coach you refer. Join our affiliate program and earn royalties while helping coaches discover the best coaching platform.',
    }
}

export default async function AffiliatePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations('affiliate')

    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <AffiliateHero
                    title={t('hero.title')}
                    subtitle={t('hero.description')}
                />
                <AffiliateContent />
            </main>
            <Footer />
        </div>
    )
}
