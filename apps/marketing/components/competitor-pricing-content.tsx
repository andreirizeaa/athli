'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Clock, Check } from 'lucide-react'
import { motion } from 'motion/react'
import type { CompetitorKey } from '@/lib/competitor-pricing-data'
import { competitorLogos } from '@/lib/competitor-pricing-data'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

function AthliSection({ t, appUrl }: { t: ReturnType<typeof useTranslations<'competitorPricing'>>; appUrl: string }) {
    const borderRef = React.useRef<HTMLDivElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [dims, setDims] = React.useState({ w: 0, h: 0, r: 16 })

    React.useEffect(() => {
        const el = borderRef.current
        if (!el) return
        const obs = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect()
            const inner = containerRef.current
            const computedR = inner ? parseFloat(getComputedStyle(inner).borderRadius) || 16 : 16
            setDims({ w: rect.width, h: rect.height, r: computedR })
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    const { w, h, r } = dims

    return (
        <div ref={borderRef} className="relative mt-16">
            {w > 0 && (
                <svg className="pointer-events-none absolute inset-0 z-10" width={w} height={h} fill="none">
                    <defs>
                        <linearGradient id="athli-border-grad" x1="0.5" y1="0" x2="0.5" y2="1">
                            <stop offset="0%" stopColor="rgb(192,132,252)" />
                            <stop offset="100%" stopColor="rgb(165,180,252)" />
                        </linearGradient>
                    </defs>
                    {/* Trail 1 */}
                    <motion.rect
                        x={1.5}
                        y={1.5}
                        width={w - 3}
                        height={h - 3}
                        rx={r}
                        ry={r}
                        pathLength={1}
                        stroke="url(#athli-border-grad)"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray="0.15 0.85"
                        animate={{ strokeDashoffset: [0, -1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Trail 2 */}
                    <motion.rect
                        x={1.5}
                        y={1.5}
                        width={w - 3}
                        height={h - 3}
                        rx={r}
                        ry={r}
                        pathLength={1}
                        stroke="url(#athli-border-grad)"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray="0.15 0.85"
                        animate={{ strokeDashoffset: [-0.5, -1.5] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />
                </svg>
            )}
            <div
                ref={containerRef}
                className="rounded-2xl border bg-background p-8 text-center"
                style={{ boxShadow: '0 0 40px rgba(192,132,252,0.16), 0 0 40px rgba(165,180,252,0.16)' }}
            >
                <h2 className="text-2xl font-semibold">{t('athliSection.title')}</h2>
                <p className="text-muted-foreground mt-1 text-lg">{t('athliSection.comingSoon')}</p>
                <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-sm">{t('athliSection.description')}</p>
                <div className="mt-6">
                    <Button asChild size="lg">
                        <Link href={`${appUrl}/auth/register`}>
                            <span>{t('athliSection.cta')}</span>
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

type Plan = {
    name: string
    price: string
    clientLimit: string
    features: string[]
}

export default function CompetitorPricingContent({ competitorKey }: { competitorKey: CompetitorKey }) {
    const t = useTranslations('competitorPricing')
    const competitor = t.raw(`competitors.${competitorKey}`) as {
        name: string
        description: string
        trialInfo: string
        plans: Plan[]
    }

    return (
        <section className="py-8 md:py-16">
            <div className="mx-auto max-w-6xl px-6">
                {/* Competitor description */}
                <div className="mb-12 flex items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={competitorLogos[competitorKey]}
                        alt={competitor.name}
                        width={48}
                        height={48}
                        className="size-12 rounded-xl"
                    />
                    <div>
                        <h2 className="text-xl font-semibold">{competitor.name}</h2>
                        <p className="text-muted-foreground mt-1">{competitor.description}</p>
                        <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                            <Clock className="size-4" />
                            <span>{competitor.trialInfo}</span>
                        </div>
                    </div>
                </div>

                {/* Competitor plans */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {competitor.plans.map((plan) => (
                        <div
                            key={plan.name}
                            className="flex flex-col rounded-2xl border bg-background p-6">
                            <h3 className="text-lg font-semibold">{plan.name}</h3>
                            <div className="mt-2">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                {plan.price !== '$0' && plan.price !== 'Custom' && plan.price !== 'Personalizado' && (
                                    <span className="text-muted-foreground text-sm">{t('perMonth')}</span>
                                )}
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">{plan.clientLimit}</p>
                            <div className="my-4 border-t" />
                            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('keyFeatures')}
                            </p>
                            <ul className="flex-1 space-y-2">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm">
                                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Athli section */}
                <AthliSection t={t} appUrl={APP_URL} />
            </div>
        </section>
    )
}
