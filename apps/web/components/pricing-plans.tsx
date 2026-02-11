'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, ChevronDown, ChevronUp, Workflow, Radio, Sparkles, Wallet } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/general/utils'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Lottie from 'lottie-react'

type Plan = 'free' | 'pro' | 'max'
type BillingInterval = 'monthly' | 'annual'

interface PlanConfig {
    monthlyPrice: number
    annualPrice: number
    baseClients: number
    extraClientPrice: number
    maxClients: number
}

interface AddonConfig {
    key: string
    monthlyPrice: number
    annualPrice: number
    icon: 'automations' | 'broadcast' | 'ai' | 'payments'
}

const PLANS: Record<Plan, PlanConfig> = {
    free: { monthlyPrice: 0, annualPrice: 0, baseClients: 5, extraClientPrice: 0, maxClients: 5 },
    pro: { monthlyPrice: 15, annualPrice: 12, baseClients: 5, extraClientPrice: 2, maxClients: 300 },
    max: { monthlyPrice: 79, annualPrice: 66, baseClients: 50, extraClientPrice: 1, maxClients: 500 },
}

// Pro plan pricing tiers - price decreases per client as volume increases
// Capped at $280 for 300 clients
// Format: { clients: [monthlyPrice, annualPrice] }
const PRO_PRICING: Record<number, [number, number]> = {
    5: [15, 12],
    10: [28, 23],
    20: [48, 40],
    50: [95, 79],
    75: [130, 108],
    100: [160, 133],
    125: [185, 154],
    150: [205, 170],
    200: [240, 200],
    250: [262, 218],
    300: [280, 233],
}

// Max plan pricing tiers - higher base price (more features), but better per-client at scale
// Format: { clients: [monthlyPrice, annualPrice] }
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
        case 'broadcast':
            return <Radio className={iconClass} strokeWidth={1.5} />
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

export default function PricingPlans({ hideHeader = false, isUpdateMode = false }: { hideHeader?: boolean; isUpdateMode?: boolean }) {
    const t = useTranslations('pricing')

    const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual')
    const [selectedPlan, setSelectedPlan] = useState<Plan>('pro')
    const [totalClients, setTotalClients] = useState(50)
    const [selectedAddons, setSelectedAddons] = useState<string[]>([])
    const [featuresExpanded, setFeaturesExpanded] = useState(false)
    const [aiAnimationData, setAiAnimationData] = useState<object | null>(null)

    useEffect(() => {
        fetch('/animations/ai-sphere-animation.json')
            .then(res => res.json())
            .then(data => setAiAnimationData(data))
            .catch(() => {})
    }, [])

    const freeFeatures = t.raw('free.features') as string[]
    const proFeatures = t.raw('pro.features') as string[]
    const maxFeatures = t.raw('max.features') as string[]

    // New features for each plan (these are shown in bold)
    const proNewFeatures = t.raw('pro.newFeatures') as string[]
    const maxNewFeatures = t.raw('max.newFeatures') as string[]

    // Always returns monthly price for display in cards
    const getPrice = (plan: Plan, clients?: number) => {
        if (plan === 'pro' && clients) {
            const pricing = PRO_PRICING[clients]
            if (pricing) {
                return pricing[0] // Always monthly for display
            }
        }
        if (plan === 'max' && clients) {
            const pricing = MAX_PRICING[clients]
            if (pricing) {
                return pricing[0] // Always monthly for display
            }
        }
        const config = PLANS[plan]
        return config.monthlyPrice // Always monthly for display
    }

    // Always returns monthly price for display in add-on cards
    const getAddonPrice = (addon: AddonConfig) => {
        return addon.monthlyPrice // Always monthly for display
    }

    // Returns price based on billing interval for summary calculations
    const getBilledPrice = (plan: Plan, clients: number) => {
        if (plan === 'pro') {
            const pricing = PRO_PRICING[clients]
            if (pricing) {
                return billingInterval === 'monthly' ? pricing[0] : pricing[1]
            }
        }
        if (plan === 'max') {
            const pricing = MAX_PRICING[clients]
            if (pricing) {
                return billingInterval === 'monthly' ? pricing[0] : pricing[1]
            }
        }
        const config = PLANS[plan]
        return billingInterval === 'monthly' ? config.monthlyPrice : config.annualPrice
    }

    const getBilledAddonPrice = (addon: AddonConfig) => {
        return billingInterval === 'monthly' ? addon.monthlyPrice : addon.annualPrice
    }

    const toggleAddon = (addonKey: string) => {
        if (selectedPlan === 'free') return
        setSelectedAddons(prev =>
            prev.includes(addonKey)
                ? prev.filter(k => k !== addonKey)
                : [...prev, addonKey]
        )
    }

    const extraClients = useMemo(() => {
        if (selectedPlan === 'free') return 0
        const base = PLANS[selectedPlan].baseClients
        return Math.max(0, totalClients - base)
    }, [selectedPlan, totalClients])

    const priceBreakdown = useMemo(() => {
        if (selectedPlan === 'free') {
            return { planCost: 0, extraClientsCost: 0, addonsCost: 0, total: 0 }
        }

        let planCost: number

        if (selectedPlan === 'pro') {
            // Pro uses dynamic all-inclusive pricing based on client count
            const pricing = PRO_PRICING[totalClients]
            planCost = pricing ? (billingInterval === 'monthly' ? pricing[0] : pricing[1]) : 0
        } else {
            // Max uses dynamic all-inclusive pricing based on client count
            const pricing = MAX_PRICING[totalClients]
            planCost = pricing ? (billingInterval === 'monthly' ? pricing[0] : pricing[1]) : 0
        }

        const addonsCost = selectedAddons.reduce((sum, addonKey) => {
            const addon = ADDONS.find(a => a.key === addonKey)
            if (!addon) return sum
            return sum + (billingInterval === 'monthly' ? addon.monthlyPrice : addon.annualPrice)
        }, 0)

        return {
            planCost,
            extraClientsCost: 0,
            addonsCost,
            total: planCost + addonsCost,
        }
    }, [selectedPlan, billingInterval, selectedAddons, totalClients])

    const handlePlanSelect = (plan: Plan) => {
        setSelectedPlan(plan)
        if (plan === 'free') {
            setTotalClients(5)
            setSelectedAddons([])
        } else {
            const base = PLANS[plan].baseClients
            if (totalClients < base) {
                setTotalClients(base)
            }
        }
    }

    const handleClientChange = (value: number) => {
        setTotalClients(value)
        if (value > 5 && selectedPlan === 'free') {
            setSelectedPlan('pro')
        }
        if (value > PLANS.pro.maxClients && selectedPlan === 'pro') {
            setSelectedPlan('max')
        }
    }

    const availableClientOptions = selectedPlan === 'pro' ? PRO_CLIENT_OPTIONS : MAX_CLIENT_OPTIONS

    const toggleFeaturesExpanded = () => {
        setFeaturesExpanded(prev => !prev)
    }

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

    return (
        <section id="pricing" className="py-8 md:py-16">
            <div className="mx-auto max-w-7xl px-6">
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

                {/* Main Layout: Plans + Summary */}
                <div className="mt-8 flex flex-col lg:flex-row gap-8">
                    {/* Left Side: Plans, Clients, Add-ons */}
                    <div className="flex-1 space-y-6">
                        {/* Plan Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {/* Free Plan */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0 }}
                            >
                                <Card
                                    className={cn(
                                        'relative flex flex-col h-full min-h-[280px] p-6 cursor-pointer transition-all hover:shadow-md',
                                        selectedPlan === 'free' ? 'ring-2 ring-primary' : 'border'
                                    )}
                                    onClick={() => handlePlanSelect('free')}
                                >
                                    {/* Radio indicator */}
                                    <div className="absolute top-4 right-4">
                                        <div className={cn(
                                            'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                                            selectedPlan === 'free' ? 'border-primary' : 'border-muted-foreground/30'
                                        )}>
                                            {selectedPlan === 'free' && (
                                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold">{t('free.name')}</h3>
                                        <p className="text-sm text-muted-foreground mt-2 pr-6">{t('free.description')}</p>

                                        {/* Expandable features */}
                                        {!featuresExpanded ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleFeaturesExpanded() }}
                                                className="flex items-center gap-1 text-sm text-primary mt-3 hover:underline"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                                {t('showFeatures')}
                                            </button>
                                        ) : (
                                            <>
                                                <hr className="border-border mt-3" />
                                                <motion.ul
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-3 space-y-3"
                                                >
                                                    {getAllFeaturesForPlan('free').map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-2 text-sm">
                                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="size-3 text-white" /></span>
                                                            <span className={feature.isNew ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                                                {feature.text}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </motion.ul>
                                            </>
                                        )}
                                    </div>

                                    {/* Hide features button - pinned above price */}
                                    {featuresExpanded && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleFeaturesExpanded() }}
                                            className="flex items-center gap-1 text-sm text-primary mt-3 hover:underline"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                            {t('hideFeatures')}
                                        </button>
                                    )}

                                    <div className="mt-auto pt-6">
                                        <div className="text-4xl font-bold">
                                            {t('free.name')}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('upTo')} <span className="font-semibold">{PLANS.free.baseClients} {t('clients')}</span>
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Pro Plan */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                            >
                                <Card
                                    className={cn(
                                        'relative flex flex-col h-full min-h-[280px] p-6 cursor-pointer transition-all hover:shadow-md',
                                        selectedPlan === 'pro' ? 'ring-2 ring-primary' : 'border'
                                    )}
                                    onClick={() => handlePlanSelect('pro')}
                                >
                                    {/* Recommended badge */}
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-full">
                                            {t('popular')}
                                        </span>
                                    </div>

                                    {/* Radio indicator */}
                                    <div className="absolute top-4 right-4">
                                        <div className={cn(
                                            'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                                            selectedPlan === 'pro' ? 'border-primary' : 'border-muted-foreground/30'
                                        )}>
                                            {selectedPlan === 'pro' && (
                                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold">{t('pro.name')}</h3>
                                        <p className="text-sm text-muted-foreground mt-2 pr-6">{t('pro.description')}</p>

                                        {/* Expandable features */}
                                        {!featuresExpanded ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleFeaturesExpanded() }}
                                                className="flex items-center gap-1 text-sm text-primary mt-3 hover:underline"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                                {t('showFeatures')}
                                            </button>
                                        ) : (
                                            <>
                                                <hr className="border-border mt-3" />
                                                <motion.ul
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-3 space-y-3"
                                                >
                                                    {getAllFeaturesForPlan('pro').map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-2 text-sm">
                                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="size-3 text-white" /></span>
                                                            <span className={feature.isNew ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                                                {feature.text}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </motion.ul>
                                            </>
                                        )}
                                    </div>

                                    {/* Hide features button - pinned above price */}
                                    {featuresExpanded && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleFeaturesExpanded() }}
                                            className="flex items-center gap-1 text-sm text-primary mt-3 hover:underline"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                            {t('hideFeatures')}
                                        </button>
                                    )}

                                    <div className="mt-auto pt-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold">${selectedPlan === 'pro' ? getPrice('pro', totalClients) : getPrice('pro', PLANS.pro.baseClients)}</span>
                                            <span className="text-muted-foreground">/{t('month')}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('upTo')} <span className="font-semibold">{selectedPlan === 'pro' ? totalClients : PLANS.pro.baseClients} {t('clients')}</span>
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Max Plan */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                            >
                                <Card
                                    className={cn(
                                        'relative flex flex-col h-full min-h-[280px] p-6 cursor-pointer transition-all hover:shadow-md',
                                        selectedPlan === 'max' ? 'ring-2 ring-primary' : 'border'
                                    )}
                                    onClick={() => handlePlanSelect('max')}
                                >
                                    {/* Radio indicator */}
                                    <div className="absolute top-4 right-4">
                                        <div className={cn(
                                            'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                                            selectedPlan === 'max' ? 'border-primary' : 'border-muted-foreground/30'
                                        )}>
                                            {selectedPlan === 'max' && (
                                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold">{t('max.name')}</h3>
                                        <p className="text-sm text-muted-foreground mt-2 pr-6">{t('max.description')}</p>

                                        {/* Expandable features */}
                                        {!featuresExpanded ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleFeaturesExpanded() }}
                                                className="flex items-center gap-1 text-sm text-primary mt-3 hover:underline"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                                {t('showFeatures')}
                                            </button>
                                        ) : (
                                            <>
                                                <hr className="border-border mt-3" />
                                                <motion.ul
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-3 space-y-3"
                                                >
                                                    {getAllFeaturesForPlan('max').map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-2 text-sm">
                                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="size-3 text-white" /></span>
                                                            <span className={feature.isNew ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                                                {feature.text}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </motion.ul>
                                            </>
                                        )}
                                    </div>

                                    {/* Hide features button - pinned above price */}
                                    {featuresExpanded && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleFeaturesExpanded() }}
                                            className="flex items-center gap-1 text-sm text-primary mt-3 hover:underline"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                            {t('hideFeatures')}
                                        </button>
                                    )}

                                    <div className="mt-auto pt-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold">${selectedPlan === 'max' ? getPrice('max', totalClients) : getPrice('max', PLANS.max.baseClients)}</span>
                                            <span className="text-muted-foreground">/{t('month')}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('upTo')} <span className="font-semibold">{selectedPlan === 'max' ? totalClients : PLANS.max.baseClients} {t('clients')}</span>
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Client Selection Card - Only show for paid plans */}
                        {selectedPlan !== 'free' && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <Card className="p-6">
                                    <div className="text-center space-y-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-lg">{t('chooseClients.title')}</span>
                                            <Select
                                                value={totalClients.toString()}
                                                onValueChange={(value) => handleClientChange(parseInt(value))}
                                            >
                                                <SelectTrigger className="w-auto border-0 shadow-none bg-transparent text-lg text-primary font-semibold p-0 h-auto gap-1 focus:ring-0 focus-visible:ring-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableClientOptions.map((num) => (
                                                        <SelectItem key={num} value={num.toString()}>
                                                            {num} {t('clients')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {t('chooseClients.growBusiness', { limit: PLANS[selectedPlan].maxClients })}
                                        </p>

                                        {/* Slider - snaps to specific values */}
                                        <div className="pt-4 pb-2">
                                            <Slider
                                                value={[availableClientOptions.indexOf(totalClients)]}
                                                onValueChange={([index]) => handleClientChange(availableClientOptions[index])}
                                                min={0}
                                                max={availableClientOptions.length - 1}
                                                step={1}
                                                className="w-full"
                                            />
                                            <div className="relative h-5 mt-2 mx-2.5">
                                                {availableClientOptions.map((num, index) => {
                                                    const percentage = (index / (availableClientOptions.length - 1)) * 100
                                                    return (
                                                        <span
                                                            key={num}
                                                            className="absolute text-xs text-muted-foreground -translate-x-1/2"
                                                            style={{ left: `${percentage}%` }}
                                                        >
                                                            {num}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* Add-ons - Full Width Cards - Only show for paid plans */}
                        {selectedPlan !== 'free' && (
                            <div className="space-y-4">
                                {ADDONS.map((addon, index) => {
                                    const isSelected = selectedAddons.includes(addon.key)
                                    const addonFeatures = t.raw(`addons.${addon.key}.features`) as string[]

                                    return (
                                        <motion.div
                                            key={addon.key}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: 0.1 * index }}
                                        >
                                            <Card
                                                className={cn(
                                                    'relative p-6 cursor-pointer transition-all hover:shadow-md bg-card',
                                                    isSelected && 'ring-2 ring-primary'
                                                )}
                                                onClick={() => toggleAddon(addon.key)}
                                            >
                                                {/* Radio indicator - top right */}
                                                <div className="absolute top-4 right-6">
                                                    <div className={cn(
                                                        'h-6 w-6 rounded-full border-2 flex items-center justify-center',
                                                        isSelected ? 'border-primary' : 'border-muted-foreground/30'
                                                    )}>
                                                        {isSelected && (
                                                            <div className="h-3 w-3 rounded-full bg-primary" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price - bottom right, vertically centered */}
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
                                                            <span className={cn(
                                                                'px-2 py-0.5 text-xs font-medium rounded-md',
                                                                isSelected
                                                                    ? 'bg-primary/20 text-primary'
                                                                    : 'bg-muted text-muted-foreground'
                                                            )}>
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

                    {/* Right Side: Plan Summary (Sticky) */}
                    <div className="lg:w-[320px] lg:shrink-0">
                        <div className="lg:sticky lg:top-24">
                            {/* Plan Summary */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                            >
                                <Card className="flex flex-col min-h-[280px] p-6 pt-[22px]">
                                    {/* Title - same position as plan card titles */}
                                    <h3 className="text-xl font-semibold leading-tight">{t('summary.title')}</h3>
                                    <hr className="border-border -mx-6 -mt-1" />
                                    {/* Selected Plan */}
                                    <div className="flex items-start justify-between py-2">
                                        <div>
                                            <p className="text-sm font-semibold text-primary">{t(`${selectedPlan}.name`)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {totalClients} {t('clients')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold">
                                                ${(priceBreakdown.planCost + priceBreakdown.extraClientsCost).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">/{t('month')}</p>
                                        </div>
                                    </div>

                                    {/* Add-ons section - only show if add-ons are selected */}
                                    {selectedAddons.length > 0 && (
                                        <>
                                            <hr className="border-border -mx-6" />
                                            <div className="flex-1 py-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('summary.addons')}</p>
                                                <div className="space-y-2">
                                                    {selectedAddons.map(addonKey => {
                                                        const addon = ADDONS.find(a => a.key === addonKey)
                                                        if (!addon) return null
                                                        return (
                                                            <div key={addonKey} className="flex items-start justify-between">
                                                                <p className="text-sm font-semibold text-primary">{t(`addons.${addonKey}.name`)}</p>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-semibold">${getBilledAddonPrice(addon).toFixed(2)}</p>
                                                                    <p className="text-xs text-muted-foreground">/{t('month')}</p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Spacer when no add-ons */}
                                    {selectedAddons.length === 0 && <div className="flex-1" />}

                                    {/* Footer - Total & CTA */}
                                    <div className="mt-auto pt-3 border-t -mx-6 px-6 space-y-2">
                                        {/* Total */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">{t('summary.total')}</p>
                                            <div className="text-right">
                                                <p className="text-xl font-bold">
                                                    ${priceBreakdown.total.toFixed(2)}
                                                    <span className="text-xs font-normal text-muted-foreground">/{t('month')}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {billingInterval === 'annual' && priceBreakdown.total > 0 && (
                                            <p className="text-xs text-muted-foreground text-right">
                                                ${(priceBreakdown.total * 12).toFixed(2)}/{t('year')} {t('summary.billedAnnually')}
                                            </p>
                                        )}

                                        {/* CTA Button */}
                                        <Button asChild className="w-full">
                                            <Link href="">{isUpdateMode ? 'Update plan' : t('summary.cta')}</Link>
                                        </Button>

                                        {/* USD Note */}
                                        <p className="text-xs text-center text-muted-foreground">
                                            {t('summary.pricesInUSD')}
                                        </p>

                                        <hr className="border-border -mx-6" />

                                        {/* Terms */}
                                        <p className="text-xs text-center text-muted-foreground pt-2 pb-4">
                                            {t('summary.termsPrefix')}{' '}
                                            <Link href="/terms-of-use" className="underline hover:text-foreground">
                                                {t('summary.termsLink')}
                                            </Link>{' '}
                                            {t('summary.and')}{' '}
                                            <Link href="/privacy-policy" className="underline hover:text-foreground">
                                                {t('summary.privacyLink')}
                                            </Link>
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
