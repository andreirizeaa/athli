'use client'

import React, { useState, useEffect, useRef } from 'react'
import NextLink from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, Workflow, Sparkles, Wallet, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Lottie from 'lottie-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

type Plan = 'free' | 'pro' | 'max'
type BillingInterval = 'monthly' | 'annual'

interface AddonConfig {
    key: string
    monthlyPrice: number
    annualPrice: number
    icon: 'automations' | 'ai' | 'payments'
}

// Pro plan pricing tiers - lower base price, higher per-client at scale
const PRO_PRICING: Record<number, [number, number]> = {
    5: [15, 12],      // $3.00/client
    10: [28, 23],     // $2.80/client
    20: [48, 40],     // $2.40/client
    50: [95, 79],     // $1.90/client
    75: [130, 108],   // $1.73/client
    100: [160, 133],  // $1.60/client
    125: [185, 154],  // $1.48/client
    150: [205, 170],  // $1.37/client
    200: [240, 200],  // $1.20/client
    250: [262, 218],  // $1.05/client
    300: [280, 233],  // $0.93/client
}

// Max plan pricing tiers - higher base price (more features), but better per-client at scale
const MAX_PRICING: Record<number, [number, number]> = {
    50: [115, 96],    // $2.30/client
    75: [155, 129],   // $2.07/client
    100: [190, 158],  // $1.90/client
    150: [250, 208],  // $1.67/client
    200: [300, 250],  // $1.50/client
    250: [340, 283],  // $1.36/client
    300: [375, 312],  // $1.25/client
    350: [400, 333],  // $1.14/client
    400: [420, 350],  // $1.05/client
    450: [435, 362],  // $0.97/client
    500: [450, 375],  // $0.90/client
}

const PRO_CLIENT_OPTIONS = [5, 10, 20, 50, 75, 100, 125, 150, 200, 250, 300]
const MAX_CLIENT_OPTIONS = [50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500]

const ADDONS: AddonConfig[] = [
    { key: 'automations', monthlyPrice: 35, annualPrice: 29, icon: 'automations' },
    { key: 'aiAssistant', monthlyPrice: 20, annualPrice: 17, icon: 'ai' },
    { key: 'payments', monthlyPrice: 10, annualPrice: 8, icon: 'payments' },
]

function AddonIcon({ type, animationData }: { type: AddonConfig['icon']; animationData?: object }) {
    const iconClass = "w-8 h-8 text-muted-foreground"
    switch (type) {
        case 'automations':
            return <Workflow className={iconClass} strokeWidth={1.5} />
        case 'ai':
            return animationData ? (
                <div className="w-10 h-10 -m-1">
                    <Lottie animationData={animationData} loop autoplay />
                </div>
            ) : (
                <Sparkles className={iconClass} strokeWidth={1.5} />
            )
        case 'payments':
            return <Wallet className={iconClass} strokeWidth={1.5} />
    }
}

// Chasing border component for Pro card
function ChasingBorder({ children, className }: { children: React.ReactNode; className?: string }) {
    const borderRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dims, setDims] = useState({ w: 0, h: 0, r: 16 })

    useEffect(() => {
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
        <div ref={borderRef} className={cn("relative", className)}>
            {w > 0 && (
                <svg className="pointer-events-none absolute inset-0 z-10" width={w} height={h} fill="none">
                    <defs>
                        <linearGradient id="border-grad-pricing" x1="0.5" y1="0" x2="0.5" y2="1">
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
                        stroke="url(#border-grad-pricing)"
                        strokeWidth={2}
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
                        stroke="url(#border-grad-pricing)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeDasharray="0.15 0.85"
                        animate={{ strokeDashoffset: [-0.5, -1.5] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />
                </svg>
            )}
            <div ref={containerRef} className="h-full">
                {children}
            </div>
        </div>
    )
}

export default function Pricing({ hideHeader = false, hideAddons = false }: { hideHeader?: boolean; hideAddons?: boolean }) {
    const t = useTranslations('pricing')

    const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual')
    const [proClients, setProClients] = useState(50)
    const [maxClients, setMaxClients] = useState(100)
    const [aiAnimationData, setAiAnimationData] = useState<object | null>(null)

    useEffect(() => {
        fetch('/animations/ai-sphere-animation.json')
            .then(res => res.json())
            .then(data => setAiAnimationData(data))
            .catch(() => {})
    }, [])

    const freeFeatures = t.raw('free.features') as string[]
    const proNewFeatures = t.raw('pro.newFeatures') as string[]
    const maxNewFeatures = t.raw('max.newFeatures') as string[]

    // Get all features for a plan with indication of which are new
    const getAllFeaturesForPlan = (plan: Plan): { text: string; isNew: boolean }[] => {
        if (plan === 'free') {
            return freeFeatures.map(f => ({ text: f, isNew: false }))
        }
        if (plan === 'pro') {
            return [
                ...freeFeatures.map(f => ({ text: f, isNew: false })),
                ...proNewFeatures.map(f => ({ text: f, isNew: true })),
            ]
        }
        // max - filter out storage-related features from Pro since Max has "Unlimited File Storage"
        const proFeaturesForMax = proNewFeatures.filter(f =>
            !f.toLowerCase().includes('storage') && !f.toLowerCase().includes('almacenamiento')
        )
        return [
            ...freeFeatures.map(f => ({ text: f, isNew: false })),
            ...proFeaturesForMax.map(f => ({ text: f, isNew: false })),
            ...maxNewFeatures.map(f => ({ text: f, isNew: true })),
        ]
    }

    const getProPrice = () => {
        const pricing = PRO_PRICING[proClients]
        return pricing ? pricing[0] : 15
    }

    const getMaxPrice = () => {
        const pricing = MAX_PRICING[maxClients]
        return pricing ? pricing[0] : 95
    }

    const getProPricePerClient = () => {
        const price = getProPrice()
        return (price / proClients).toFixed(2)
    }

    const getMaxPricePerClient = () => {
        const price = getMaxPrice()
        return (price / maxClients).toFixed(2)
    }

    const getAddonPrice = (addon: AddonConfig) => {
        return addon.monthlyPrice
    }

    return (
        <section id="pricing" className="py-8 md:py-16">
            <div className="mx-auto max-w-5xl px-6">
                {!hideHeader && (
                    <div className="mx-auto max-w-2xl space-y-4 text-center">
                        <h1 className="text-center text-4xl font-semibold lg:text-5xl">{t('sectionTitle')}</h1>
                        <p className="text-muted-foreground">{t('sectionSubtitle')}</p>
                    </div>
                )}

                {/* Billing Toggle - Tab Bar Style */}
                <div className="mt-8 flex flex-col items-center gap-2">
                    <div className="inline-flex items-center rounded-full border bg-muted p-1">
                        <button
                            onClick={() => setBillingInterval('monthly')}
                            className={cn(
                                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                                billingInterval === 'monthly'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {t('monthly')}
                        </button>
                        <button
                            onClick={() => setBillingInterval('annual')}
                            className={cn(
                                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                                billingInterval === 'annual'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {t('annual')}
                        </button>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {t('twoMonthsFree')}
                    </span>
                </div>

                {/* Plan Cards */}
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    {/* Free Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0 }}
                    >
                        <Card className="relative flex flex-col h-full p-6">
                            <div>
                                <h3 className="text-xl font-semibold">{t('free.name')}</h3>
                                <p className="text-sm text-muted-foreground mt-2">{t('free.description')}</p>

                                <div className="mt-4">
                                    <span className="text-4xl font-bold">{t('free.name')}</span>
                                </div>

                                <div className="flex items-center h-10 mt-6">
                                    <p className="text-sm text-muted-foreground">
                                        {t('trainUpTo')} 5 {t('clients')}
                                    </p>
                                </div>

                                <Button asChild variant="outline" size="lg" className="w-full mt-4 rounded-xl text-base">
                                    <NextLink href={`${APP_URL}/auth/register`}>
                                        <span className="text-nowrap">{t('startTraining')}</span>
                                        <ArrowRight className="size-4" />
                                    </NextLink>
                                </Button>
                                <p className="text-xs text-muted-foreground text-center mt-2">{t('noCreditCard')}</p>

                                <hr className="border-border mt-4" />
                            </div>

                            <ul className="mt-4 space-y-3 flex-1">
                                {getAllFeaturesForPlan('free').map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm">
                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="size-3 text-white" /></span>
                                        <span className={feature.isNew ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </motion.div>

                    {/* Pro Plan with Chasing Border */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <ChasingBorder className="h-full">
                            <Card className="relative flex flex-col h-full p-6 rounded-2xl">
                                {/* Recommended badge */}
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                    <span className="bg-background border border-foreground text-foreground px-3 py-1 text-xs font-medium rounded-full">
                                        {t('popular')}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-xl font-semibold">{t('pro.name')}</h3>
                                    <p className="text-sm text-muted-foreground mt-2">{t('pro.description')}</p>

                                    <div className="mt-4">
                                        <span className="text-4xl font-bold">${getProPrice()}</span>
                                        <span className="text-muted-foreground">/{t('month')}</span>
                                    </div>

                                    {/* Client dropdown */}
                                    <div className="mt-6">
                                        <Select
                                            value={proClients.toString()}
                                            onValueChange={(value) => setProClients(parseInt(value))}
                                        >
                                            <SelectTrigger className="w-full h-10 px-3 text-sm rounded-xl focus-visible:ring-0 focus-visible:border-input">
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{proClients} {t('clients')}</span>
                                                    <span className="text-muted-foreground">${getProPricePerClient()}/{t('client')}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="w-[--radix-select-trigger-width]">
                                                {PRO_CLIENT_OPTIONS.map((num) => {
                                                    const price = PRO_PRICING[num]?.[0] || 0
                                                    const perClient = (price / num).toFixed(2)
                                                    return (
                                                        <SelectItem key={num} value={num.toString()}>
                                                            <span>{num} {t('clients')}</span>
                                                            <span className="text-muted-foreground tabular-nums ml-auto">${perClient}/{t('client')}</span>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button asChild size="lg" className="w-full mt-4 rounded-xl text-base">
                                        <NextLink href={`${APP_URL}/auth/register`}>
                                            <span className="text-nowrap">{t('summary.cta')}</span>
                                            <ArrowRight className="size-4" />
                                        </NextLink>
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center mt-2">{t('noCreditCard')}</p>

                                    <hr className="border-border mt-4" />
                                </div>

                                <ul className="mt-4 space-y-3 flex-1">
                                    {getAllFeaturesForPlan('pro').map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm">
                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="size-3 text-white" /></span>
                                            <span className={feature.isNew ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </ChasingBorder>
                    </motion.div>

                    {/* Max Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <Card className="relative flex flex-col h-full p-6">
                            <div>
                                <h3 className="text-xl font-semibold">{t('max.name')}</h3>
                                <p className="text-sm text-muted-foreground mt-2">{t('max.description')}</p>

                                <div className="mt-4">
                                    <span className="text-4xl font-bold">${getMaxPrice()}</span>
                                    <span className="text-muted-foreground">/{t('month')}</span>
                                </div>

                                {/* Client dropdown */}
                                <div className="mt-6">
                                    <Select
                                        value={maxClients.toString()}
                                        onValueChange={(value) => setMaxClients(parseInt(value))}
                                    >
                                        <SelectTrigger className="w-full h-10 px-3 text-sm rounded-xl focus-visible:ring-0 focus-visible:border-input">
                                            <div className="flex items-center justify-between w-full">
                                                <span>{maxClients} {t('clients')}</span>
                                                <span className="text-muted-foreground">${getMaxPricePerClient()}/{t('client')}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="w-[--radix-select-trigger-width]">
                                            {MAX_CLIENT_OPTIONS.map((num) => {
                                                const price = MAX_PRICING[num]?.[0] || 0
                                                const perClient = (price / num).toFixed(2)
                                                return (
                                                    <SelectItem key={num} value={num.toString()}>
                                                        <span>{num} {t('clients')}</span>
                                                        <span className="text-muted-foreground tabular-nums ml-auto">${perClient}/{t('client')}</span>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button asChild variant="outline" size="lg" className="w-full mt-4 rounded-xl text-base">
                                    <NextLink href={`${APP_URL}/auth/register`}>
                                        <span className="text-nowrap">{t('summary.cta')}</span>
                                        <ArrowRight className="size-4" />
                                    </NextLink>
                                </Button>
                                <p className="text-xs text-muted-foreground text-center mt-2">{t('noCreditCard')}</p>

                                <hr className="border-border mt-4" />
                            </div>

                            <ul className="mt-4 space-y-3 flex-1">
                                {getAllFeaturesForPlan('max').map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm">
                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="size-3 text-white" /></span>
                                        <span className={feature.isNew ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </motion.div>
                </div>

                {/* Add-ons Section - Full Width Cards */}
                {!hideAddons && (
                    <div className="mt-12 space-y-4">
                        <h2 className="text-2xl font-semibold text-center mb-6">{t('addons.afterTrial')}</h2>
                        {ADDONS.map((addon, index) => {
                            const addonFeatures = t.raw(`addons.${addon.key}.features`) as string[]

                            return (
                                <motion.div
                                    key={addon.key}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.1 * index }}
                                >
                                    <Card className="relative p-6">
                                        {/* Price - right side, vertically centered */}
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                            <div className="text-right">
                                                <span className="text-3xl font-bold">${getAddonPrice(addon)}</span>
                                                <span className="text-muted-foreground">/{t('month')}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pr-32">
                                            {/* Icon */}
                                            <div className="shrink-0 pt-0.5">
                                                <AddonIcon type={addon.icon} animationData={addon.icon === 'ai' ? aiAnimationData ?? undefined : undefined} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Title row */}
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-semibold">
                                                        {t(`addons.${addon.key}.name`)}
                                                    </h3>
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-muted text-muted-foreground">
                                                        {t('addon')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {t(`addons.${addon.key}.description`)}
                                                </p>
                                                <ul className="mt-4 space-y-2">
                                                    {addonFeatures.map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-2 text-sm">
                                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="size-3 text-white" /></span>
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}
