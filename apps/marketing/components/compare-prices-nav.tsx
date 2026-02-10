'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { competitorKeys, competitorSlugs, competitorLogos } from '@/lib/competitor-pricing-data'
import { ArrowRight } from 'lucide-react'

export default function ComparePricesNav() {
    const t = useTranslations('competitorPricing')

    return (
        <section className="py-16">
            <div className="mx-auto max-w-7xl px-6">
                <div className="text-center">
                    <h2 className="text-3xl font-semibold md:text-4xl">{t('title')}</h2>
                    <p className="text-muted-foreground mt-3 text-balance">{t('subtitle')}</p>
                </div>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {competitorKeys.map((key) => {
                        const competitor = t.raw(`competitors.${key}`) as { name: string; linkLabel: string }
                        return (
                            <Link
                                key={key}
                                href={`/how-we-compare/${competitorSlugs[key]}`}
                                className="group flex items-center gap-4 rounded-xl border bg-background p-4 transition-colors hover:bg-muted/50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={competitorLogos[key]}
                                    alt={competitor.name}
                                    width={40}
                                    height={40}
                                    className="size-10 rounded-lg"
                                />
                                <span className="flex-1 text-sm font-medium">{competitor.linkLabel}</span>
                                <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
