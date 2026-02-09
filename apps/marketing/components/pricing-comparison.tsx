'use client'

import React from 'react'
import { Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Tier = 'free' | 'pro' | 'startup'

const tiers: { key: Tier; highlighted?: boolean }[] = [
    { key: 'free' },
    { key: 'pro', highlighted: true },
    { key: 'startup' },
]

// true = included, false = not included
// Order matches pricingComparison.sections[*].features
const availability: Record<Tier, boolean[]> = {
    free: [
        // AI & Automation
        false, false, false,
        // Training & Programming
        true, true, false, true,
        // Client Management
        true, true, false, false,
        // Accountability & Data
        true, false, false,
        // Communication
        true, false,
        // Platform
        false, false, false,
    ],
    pro: [
        // AI & Automation
        true, true, true,
        // Training & Programming
        true, true, true, true,
        // Client Management
        true, true, true, true,
        // Accountability & Data
        true, true, true,
        // Communication
        true, true,
        // Platform
        true, true, false,
    ],
    startup: [
        // AI & Automation
        true, true, true,
        // Training & Programming
        true, true, true, true,
        // Client Management
        true, true, true, true,
        // Accountability & Data
        true, true, true,
        // Communication
        true, true,
        // Platform
        true, true, true,
    ],
}

const proColor = 'rgb(192,132,252)'

const proColumnStyle: React.CSSProperties = {
    borderLeftColor: proColor,
    borderRightColor: proColor,
    borderLeftWidth: '2px',
    borderRightWidth: '2px',
    borderLeftStyle: 'solid',
    borderRightStyle: 'solid',
}

const proColumnTopStyle: React.CSSProperties = {
    ...proColumnStyle,
    borderTopColor: proColor,
    borderTopWidth: '2px',
    borderTopStyle: 'solid',
    boxShadow: '0 0 40px rgba(192,132,252,0.16), 0 0 40px rgba(165,180,252,0.16)',
}

const proColumnBottomStyle: React.CSSProperties = {
    ...proColumnStyle,
    borderBottomColor: proColor,
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
}

function CheckMark() {
    return (
        <div className="mx-auto flex size-7 items-center justify-center rounded-full bg-emerald-500">
            <Check className="size-4 text-white" />
        </div>
    )
}

function CrossMark() {
    return (
        <div className="mx-auto flex size-7 items-center justify-center rounded-full bg-zinc-300 dark:bg-zinc-600">
            <X className="size-4 text-white" />
        </div>
    )
}

export default function PricingComparison() {
    const t = useTranslations('pricingComparison')
    const pt = useTranslations('pricing')
    const sections = t.raw('sections') as { title: string; features: string[] }[]

    let featureIndex = 0
    const totalFeatures = sections.reduce((sum, s) => sum + s.features.length, 0)

    return (
        <section className="py-8 md:py-16">
            <div className="mx-auto max-w-4xl px-6">
                <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
                    <h2 className="text-3xl font-semibold lg:text-4xl">{t('title')}</h2>
                    <p className="text-muted-foreground">{t('subtitle')}</p>
                </div>
                <div className="overflow-x-auto rounded-2xl border bg-background">
                    <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 min-w-[200px] border-b bg-background p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t('featuresHeader')}
                                </th>
                                {tiers.map((tier) => (
                                    <th
                                        key={tier.key}
                                        className="min-w-[120px] border-b bg-background p-4 text-center"
                                        style={tier.highlighted ? proColumnTopStyle : undefined}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-sm font-semibold">{pt(`${tier.key}.name`)}</span>
                                            <span className="text-xs text-muted-foreground">{pt(`${tier.key}.price`)}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sections.map((section) => (
                                <React.Fragment key={section.title}>
                                    <tr>
                                        <td className="bg-muted/50 px-4 py-3 text-sm font-semibold">
                                            {section.title}
                                        </td>
                                        {tiers.map((tier) => (
                                            <td
                                                key={tier.key}
                                                className="bg-muted/50"
                                                style={tier.highlighted ? proColumnStyle : undefined}
                                            />
                                        ))}
                                    </tr>
                                    {section.features.map((feature) => {
                                        const idx = featureIndex++
                                        const isLast = idx === totalFeatures - 1
                                        return (
                                            <tr key={feature}>
                                                <td className="sticky left-0 z-10 border-b bg-background p-4 text-sm font-medium">
                                                    {feature}
                                                </td>
                                                {tiers.map((tier) => (
                                                    <td
                                                        key={tier.key}
                                                        className="border-b p-4 text-center"
                                                        style={tier.highlighted ? (isLast ? proColumnBottomStyle : proColumnStyle) : undefined}
                                                    >
                                                        {availability[tier.key][idx] ? <CheckMark /> : <CrossMark />}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
