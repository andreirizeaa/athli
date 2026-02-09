import { setRequestLocale, getTranslations } from 'next-intl/server'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'
import PageHero from '@/components/page-hero'
import ComparisonTable from '@/components/comparison-table'

export default async function HowWeComparePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations('pages')

    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <PageHero
                    title={t('howWeCompare.title')}
                    subtitle={t('howWeCompare.subtitle')}
                />
                <ComparisonTable />
            </main>
            <Footer />
        </div>
    )
}
