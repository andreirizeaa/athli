'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, ChevronDown, ChevronUp, Workflow, Radio, Sparkles, Wallet, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/general/utils'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import Lottie from 'lottie-react'
import { toast } from 'sonner'
import {
    type Plan,
    type BillingInterval,
    type PlanConfig,
    type AddonConfig,
    PLANS,
    PRO_PRICING,
    MAX_PRICING,
    PRO_CLIENT_OPTIONS,
    MAX_CLIENT_OPTIONS,
    ADDONS,
} from '@athli/shared-types/pricing-constants'
import { createCheckoutSession, type AddonType } from '@/api/billing/billing-service'

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

interface PricingPlansProps {
    hideHeader?: boolean;
    isUpdateMode?: boolean;
    /** Minimum number of clients required (based on active client count) */
    minClientCount?: number;
}

export default function PricingPlans({ hideHeader = false, isUpdateMode = false, minClientCount = 0 }: PricingPlansProps) {
    const t = useTranslations('pricing')
    const router = useRouter()

    const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual')
    const [selectedPlan, setSelectedPlan] = useState<Plan>('pro')
    // Initialize with min client count rounded up to nearest tier, or default to 50
    const getInitialClientCount = () => {
        if (minClientCount <= 0) return 50
        // Find the first tier >= minClientCount
        const proOption = PRO_CLIENT_OPTIONS.find(num => num >= minClientCount)
        return proOption ?? PRO_CLIENT_OPTIONS[PRO_CLIENT_OPTIONS.length - 1]
    }
    const [totalClients, setTotalClients] = useState(getInitialClientCount)
    const [selectedAddons, setSelectedAddons] = useState<string[]>([])
    const [featuresExpanded, setFeaturesExpanded] = useState(false)
    const [aiAnimationData, setAiAnimationData] = useState<object | null>(null)
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)

    useEffect(() => {
        fetch('/animations/ai-sphere-animation.json')
            .then(res => res.json())
            .then(data => setAiAnimationData(data))
            .catch(() => {})
    }, [])

    // Adjust totalClients when minClientCount changes (e.g., after clients load)
    useEffect(() => {
        if (selectedPlan === 'starter' || minClientCount <= 0) return

        const planOptions = selectedPlan === 'pro' ? PRO_CLIENT_OPTIONS : MAX_CLIENT_OPTIONS
        const minForPlan = planOptions.find(num => num >= minClientCount) ?? planOptions[planOptions.length - 1]

        if (totalClients < minForPlan) {
            setTotalClients(minForPlan)
        }
    }, [minClientCount, selectedPlan])

    const starterFeatures = t.raw('starter.features') as string[]
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
        if (selectedPlan === 'starter') return
        setSelectedAddons(prev =>
            prev.includes(addonKey)
                ? prev.filter(k => k !== addonKey)
                : [...prev, addonKey]
        )
    }

    const extraClients = useMemo(() => {
        if (selectedPlan === 'starter') return 0
        const base = PLANS[selectedPlan].baseClients
        return Math.max(0, totalClients - base)
    }, [selectedPlan, totalClients])

    const priceBreakdown = useMemo(() => {
        if (selectedPlan === 'starter') {
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
        // Prevent selecting Starter if they have more than 5 active clients
        if (plan === 'starter' && minClientCount > PLANS.starter.baseClients) {
            toast.error(`You have ${minClientCount} active clients. Archive some clients to downgrade to Starter.`)
            return
        }

        setSelectedPlan(plan)
        if (plan === 'starter') {
            setTotalClients(5)
            setSelectedAddons([])
        } else {
            // Get the minimum valid client count for this plan
            const planOptions = plan === 'pro' ? PRO_CLIENT_OPTIONS : MAX_CLIENT_OPTIONS
            const minForPlan = minClientCount > 0
                ? planOptions.find(num => num >= minClientCount) ?? planOptions[planOptions.length - 1]
                : PLANS[plan].baseClients

            if (totalClients < minForPlan) {
                setTotalClients(minForPlan)
            }
        }
    }

    const handleClientChange = (value: number) => {
        setTotalClients(value)
        if (value > 5 && selectedPlan === 'starter') {
            setSelectedPlan('pro')
        }
        if (value > PLANS.pro.maxClients && selectedPlan === 'pro') {
            setSelectedPlan('max')
        }
    }

    // Filter client options based on minimum required (active client count)
    // Only show options >= minClientCount
    const baseClientOptions = selectedPlan === 'pro' ? PRO_CLIENT_OPTIONS : MAX_CLIENT_OPTIONS
    const availableClientOptions = useMemo(() => {
        if (minClientCount <= 0) return baseClientOptions
        return baseClientOptions.filter(num => num >= minClientCount)
    }, [baseClientOptions, minClientCount])

    // Get the minimum valid client count for current plan
    const minValidClientCount = useMemo(() => {
        if (minClientCount <= 0) return baseClientOptions[0]
        // Find the first option that's >= minClientCount
        const minOption = baseClientOptions.find(num => num >= minClientCount)
        return minOption ?? baseClientOptions[baseClientOptions.length - 1]
    }, [baseClientOptions, minClientCount])

    const toggleFeaturesExpanded = () => {
        setFeaturesExpanded(prev => !prev)
    }

    // Get all features for a plan with indication of which are new
    const getAllFeaturesForPlan = (plan: Plan): { text: string; isNew: boolean }[] => {
        if (plan === 'starter') {
            return starterFeatures.map(f => ({ text: f, isNew: false }))
        }
        if (plan === 'pro') {
            return [
                ...starterFeatures.map(f => ({ text: f, isNew: false })),
                ...proNewFeatures.map(f => ({ text: f, isNew: true })),
            ]
        }
        // max - filter out storage-related features from Pro since Max has "Unlimited On Demand Files"
        const proFeaturesForMax = proNewFeatures.filter(f =>
            !f.toLowerCase().includes('storage') && !f.toLowerCase().includes('almacenamiento') && !f.toLowerCase().includes('on demand files')
        )
        return [
            ...starterFeatures.map(f => ({ text: f, isNew: false })),
            ...proFeaturesForMax.map(f => ({ text: f, isNew: false })),
            ...maxNewFeatures.map(f => ({ text: f, isNew: true })),
        ]
    }

    // Handle checkout - create Stripe checkout session
    const handleCheckout = async () => {
        if (selectedPlan === 'starter') {
            // Starter plan - no checkout needed, just redirect
            router.push('/settings/billing')
            return
        }

        setIsCheckoutLoading(true)

        try {
            // Map addon keys to AddonType (aiAssistant -> ai_assistant)
            const addonMap: Record<string, AddonType> = {
                automations: 'automations',
                aiAssistant: 'ai_assistant',
                payments: 'payments',
            }

            const mappedAddons = selectedAddons
                .map(key => addonMap[key])
                .filter(Boolean) as AddonType[]

            const { url } = await createCheckoutSession({
                plan: selectedPlan,
                clientLimit: totalClients,
                interval: billingInterval === 'annual' ? 'year' : 'month',
                addons: mappedAddons.length > 0 ? mappedAddons : undefined,
                successUrl: `${window.location.origin}/settings/billing?success=true`,
                cancelUrl: `${window.location.origin}/settings/billing/update`,
            })

            // Redirect to Stripe checkout
            if (url) {
                window.location.href = url
            }
        } catch (error: any) {
            console.error('Checkout error:', error)
            toast.error('Failed to start checkout. Please try again.')
            setIsCheckoutLoading(false)
        }
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

                {/* Billing Toggle */}
                <div className="mt-8 flex flex-col items-center gap-2">
                    <div className="inline-flex items-center gap-3 rounded-full border bg-muted px-4 py-2">
                        <span className={cn(
                            'text-sm font-medium transition-colors',
                            billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                            {t('monthly')}
                        </span>
                        <Switch
                            checked={billingInterval === 'annual'}
                            onCheckedChange={(checked) => setBillingInterval(checked ? 'annual' : 'monthly')}
                        />
                        <span className={cn(
                            'text-sm font-medium transition-colors',
                            billingInterval === 'annual' ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                            {t('annual')}
                        </span>
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
                            {/* Starter Plan */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0 }}
                            >
                                {/* Starter is unavailable if they have more than 5 active clients */}
                                {(() => {
                                    const starterUnavailable = minClientCount > PLANS.starter.baseClients
                                    return (
                                <Card
                                    className={cn(
                                        'relative flex flex-col h-full min-h-[280px] p-6 transition-all',
                                        starterUnavailable
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer hover:shadow-md',
                                        selectedPlan === 'starter' ? 'ring-2 ring-primary' : 'border'
                                    )}
                                    onClick={() => !starterUnavailable && handlePlanSelect('starter')}
                                >
                                    {/* Radio indicator */}
                                    <div className="absolute top-4 right-4">
                                        <div className={cn(
                                            'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                                            selectedPlan === 'starter' ? 'border-primary' : 'border-muted-foreground/30'
                                        )}>
                                            {selectedPlan === 'starter' && (
                                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold">{t('starter.name')}</h3>
                                        <p className="text-sm text-muted-foreground mt-2 pr-6">{t('starter.description')}</p>

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
                                                    {getAllFeaturesForPlan('starter').map((feature, idx) => (
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
                                            {t('starter.name')}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('upTo')} <span className="font-semibold">{PLANS.starter.baseClients} {t('clients')}</span>
                                        </p>
                                        {starterUnavailable && (
                                            <p className="text-xs text-destructive mt-2">
                                                You have {minClientCount} clients
                                            </p>
                                        )}
                                    </div>
                                </Card>
                                    )
                                })()}
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
                        {selectedPlan !== 'starter' && (
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
                                                value={[Math.max(0, availableClientOptions.indexOf(totalClients))]}
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
                        {selectedPlan !== 'starter' && (
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
                                        <Button
                                            className="w-full"
                                            onClick={handleCheckout}
                                            disabled={isCheckoutLoading || selectedPlan === 'starter'}
                                        >
                                            {isCheckoutLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                isUpdateMode ? 'Update plan' : t('summary.cta')
                                            )}
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
