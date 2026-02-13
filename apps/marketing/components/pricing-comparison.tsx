'use client'

import React from 'react'
import { Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Tier = 'starter' | 'pro' | 'max'

const tiers: { key: Tier; highlighted?: boolean }[] = [
    { key: 'starter' },
    { key: 'pro' },
    { key: 'max' },
]

// Feature values: true = included, false = not included, string = custom text (e.g., "5GB")
// Order must match pricingComparison.sections[*].features
type FeatureValue = boolean | string

const availability: Record<Tier, FeatureValue[]> = {
    starter: [
        // Mobile Apps
        true, true,  // Coach App, Client App
        // Core Features
        true, true, true, true,  // Training, Calendar, Exercise Library, Messaging
        // Advanced Features
        false, false, false,  // AI Workout Builder, Custom Exercises, Custom Sections
        // Client Management
        false, false, false, false, false, false,  // Questionnaires, Check-ins, Habits, Metrics, Photo Tracking, Exercise History
        // Storage & Support
        false, false, false, false,  // Files, AI Todo, Broadcast, Priority Support
    ],
    pro: [
        // Mobile Apps
        true, true,  // Coach App, Client App
        // Core Features
        true, true, true, true,  // Training, Calendar, Exercise Library, Messaging
        // Advanced Features
        true, true, true,  // AI Workout Builder, Custom Exercises, Custom Sections
        // Client Management
        true, true, true, true, true, true,  // Questionnaires, Check-ins, Habits, Metrics, Photo Tracking, Exercise History
        // Storage & Support
        '5GB', false, false, false,  // Files (5GB), AI Todo, Broadcast, Priority Support
    ],
    max: [
        // Mobile Apps
        true, true,  // Coach App, Client App
        // Core Features
        true, true, true, true,  // Training, Calendar, Exercise Library, Messaging
        // Advanced Features
        true, true, true,  // AI Workout Builder, Custom Exercises, Custom Sections
        // Client Management
        true, true, true, true, true, true,  // Questionnaires, Check-ins, Habits, Metrics, Photo Tracking, Exercise History
        // Storage & Support
        true, true, true, true,  // Files (Unlimited), AI Todo, Broadcast, Priority Support
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

function TextValue({ value }: { value: string }) {
    return (
        <span className="text-sm font-medium">{value}</span>
    )
}

function FeatureCell({ value }: { value: FeatureValue }) {
    if (typeof value === 'string') {
        return <TextValue value={value} />
    }
    return value ? <CheckMark /> : <CrossMark />
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
                                            <span className="text-xs text-muted-foreground">{pt(`${tier.key}.priceShort`)}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Client Limits Row */}
                            <tr>
                                <td className="sticky left-0 z-10 border-b bg-background p-4 text-sm font-medium">
                                    {t('clientsIncluded')}
                                </td>
                                <td className="border-b p-4 text-center">
                                    <span className="text-sm font-semibold">5</span>
                                </td>
                                <td className="border-b p-4 text-center">
                                    <span className="text-sm font-semibold">5-300</span>
                                    <span className="block text-xs text-muted-foreground">Dynamic pricing</span>
                                </td>
                                <td className="border-b p-4 text-center">
                                    <span className="text-sm font-semibold">50-500</span>
                                    <span className="block text-xs text-muted-foreground">Dynamic pricing</span>
                                </td>
                            </tr>

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
                                                        <FeatureCell value={availability[tier.key][idx]} />
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
