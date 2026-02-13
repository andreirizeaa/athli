import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import FAQsTwo from '@/components/faqs-2'
import PageHero from '@/components/page-hero'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    setRequestLocale(locale)
    return {
        title: 'FAQs - Athli',
    }
}

export default async function FAQsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations('pages')

    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <PageHero
                    title={t('faqs.title')}
                    subtitle={t('faqs.subtitle')}
                />
                <FAQsTwo hideHeader />
            </main>
            <Footer />
        </div>
    )
}
