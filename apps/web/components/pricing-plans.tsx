'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Check, ChevronDown, ChevronUp, Workflow, Radio, Sparkles, Wallet, Loader2, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/general/utils'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import Lottie from 'lottie-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
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
    ANNUAL_DISCOUNT_PERCENT,
} from '@athli/shared-types/pricing-constants'
import { createCheckoutSession, updateAddons, cancelSubscription, reactivateSubscription, cancelAddon, reactivateAddon, createPortalSession, type AddonType } from '@/api/billing/billing-service'
import { useEntitlements, useSubscription } from '@/hooks/use-entitlements'

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

export default function PricingPlans({
    hideHeader = false,
    isUpdateMode = false,
    minClientCount = 0,
}: PricingPlansProps) {
    const t = useTranslations('pricing')
    const router = useRouter()

    // Fetch entitlements directly when in update mode
    const {
        plan: currentPlan,
        clientLimit: currentClientLimit,
        isTrial,
        hasAutomations,
        hasAiAssistant,
        hasPayments,
        isLoading: isLoadingEntitlements,
    } = useEntitlements()
    const { billingInterval: currentBillingInterval, isCancelling: isSubscriptionCancelling, cancellingAddons, isLoading: isLoadingSubscription } = useSubscription()

    // Build current addons from entitlements
    const currentAddons = useMemo(() => {
        const addons: string[] = []
        if (hasAutomations) addons.push('automations')
        if (hasAiAssistant) addons.push('ai_assistant')
        if (hasPayments) addons.push('payments')
        return addons
    }, [hasAutomations, hasAiAssistant, hasPayments])

    // Can cancel if on paid plan (pro or max, not trial)
    const canCancel = isUpdateMode && !isTrial && (currentPlan === 'pro' || currentPlan === 'max')

    // Track cancellation state - null means not cancelling, 'subscription' for main, or addon key
    const [cancellingItem, setCancellingItem] = useState<string | null>(null)
    const [isOpeningPortal, setIsOpeningPortal] = useState(false)
    // Confirmation dialog state - which item to confirm cancellation for
    const [confirmCancelItem, setConfirmCancelItem] = useState<string | null>(null)
    // Two-step confirmation - track which step (1 = first confirm, 2 = final confirm)
    const [cancelConfirmStep, setCancelConfirmStep] = useState<1 | 2>(1)
    // Disable confirm button for 1 second on step 2
    const [confirmButtonDisabled, setConfirmButtonDisabled] = useState(false)
    // Confirmation dialog state for reactivation
    const [confirmReactivateItem, setConfirmReactivateItem] = useState<string | null>(null)
    // Alert for trying to update while subscription is being cancelled
    const [showReinstateAlert, setShowReinstateAlert] = useState(false)
    // Alert for trying to reinstate an add-on while subscription is being cancelled
    const [showReinstateAddonAlert, setShowReinstateAddonAlert] = useState(false)

    // Enable confirm button after 1 second delay when step 2 is reached
    useEffect(() => {
        if (cancelConfirmStep === 2) {
            setConfirmButtonDisabled(true)
            const timer = setTimeout(() => {
                setConfirmButtonDisabled(false)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [cancelConfirmStep])

    // Map addon keys to addon types
    const addonKeyToType: Record<string, AddonType> = {
        automations: 'automations',
        aiAssistant: 'ai_assistant',
        payments: 'payments',
    }

    // Get addon display name
    const getAddonDisplayName = (addonKey: string) => {
        const addonNames: Record<string, string> = {
            automations: 'Automations',
            aiAssistant: 'AI Assistant',
            payments: 'Payments',
        }
        return addonNames[addonKey] || addonKey
    }

    // Check if an addon is scheduled for cancellation
    const isAddonCancelling = (addonKey: string): boolean => {
        const addonType = addonKeyToType[addonKey]
        return addonType ? (cancellingAddons || []).includes(addonType) : false
    }

    const handleCancelAddon = async (addonKey: string) => {
        setConfirmCancelItem(null)
        setCancellingItem(addonKey)
        try {
            const addonType = addonKeyToType[addonKey]
            if (!addonType) {
                throw new Error('Invalid addon key')
            }

            // Schedule addon for cancellation at period end
            await cancelAddon(addonType)

            toast.success('Add-on scheduled for cancellation')

            // Reload the page to reflect changes
            window.location.reload()
        } catch (error) {
            console.error('Failed to cancel addon:', error)
            toast.error('Failed to cancel add-on. Please try again.')
            setCancellingItem(null)
        }
    }

    const handleReactivateAddon = async (addonKey: string) => {
        setConfirmReactivateItem(null)
        setCancellingItem(addonKey)
        try {
            const addonType = addonKeyToType[addonKey]
            if (!addonType) {
                throw new Error('Invalid addon key')
            }

            await reactivateAddon(addonType)

            toast.success('Add-on reactivated successfully')

            // Reload the page to reflect changes
            window.location.reload()
        } catch (error) {
            console.error('Failed to reactivate addon:', error)
            toast.error('Failed to reactivate add-on. Please try again.')
            setCancellingItem(null)
        }
    }

    const handleCancelSubscription = async () => {
        setConfirmCancelItem(null)
        setCancellingItem('subscription')
        try {
            // Cancel at period end (not immediately)
            await cancelSubscription({ cancelImmediately: false })

            toast.success('Subscription scheduled for cancellation')

            // Reload the page to reflect changes
            window.location.reload()
        } catch (error) {
            console.error('Failed to cancel subscription:', error)
            toast.error('Failed to cancel subscription. Please try again.')
            setCancellingItem(null)
        }
    }

    const handleReactivateSubscription = async () => {
        setConfirmReactivateItem(null)
        setCancellingItem('subscription')
        try {
            await reactivateSubscription()

            toast.success('Subscription reactivated successfully')

            // Reload the page to reflect changes
            window.location.reload()
        } catch (error) {
            console.error('Failed to reactivate subscription:', error)
            toast.error('Failed to reactivate subscription. Please try again.')
            setCancellingItem(null)
        }
    }

    const handleManageBilling = async () => {
        setIsOpeningPortal(true)
        try {
            const { url } = await createPortalSession(window.location.href)
            window.location.href = url
        } catch (error) {
            console.error('Failed to open billing portal:', error)
            toast.error('Failed to open billing portal. Please try again.')
            setIsOpeningPortal(false)
        }
    }

    // State initialization - only set once when entitlements load
    const [isInitialized, setIsInitialized] = useState(false)
    const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
    const [selectedPlan, setSelectedPlan] = useState<Plan>('pro')
    const [totalClients, setTotalClients] = useState(50)
    const [selectedAddons, setSelectedAddons] = useState<string[]>([])
    const [featuresExpanded, setFeaturesExpanded] = useState(true)
    const [aiAnimationData, setAiAnimationData] = useState<object | null>(null)
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
    const [showSavingsPopup, setShowSavingsPopup] = useState(false)
    const toggleRef = useRef<HTMLDivElement>(null)

    // Initialize state from entitlements when they load (only once)
    useEffect(() => {
        if (isUpdateMode && !isLoadingEntitlements && !isLoadingSubscription && !isInitialized) {
            // Set billing interval
            if (currentBillingInterval) {
                setBillingInterval(currentBillingInterval === 'year' ? 'annual' : 'monthly')
            }

            // Set plan
            if (currentPlan && (currentPlan === 'starter' || currentPlan === 'pro' || currentPlan === 'max')) {
                setSelectedPlan(currentPlan as Plan)
            }

            // Set client limit
            if (currentClientLimit) {
                setTotalClients(currentClientLimit)
            } else if (minClientCount > 0) {
                const proOption = PRO_CLIENT_OPTIONS.find(num => num >= minClientCount)
                setTotalClients(proOption ?? PRO_CLIENT_OPTIONS[PRO_CLIENT_OPTIONS.length - 1])
            }

            // Set addons
            const addonTypeToKey: Record<string, string> = {
                automations: 'automations',
                ai_assistant: 'aiAssistant',
                payments: 'payments',
            }
            const addonKeys = currentAddons.map(type => addonTypeToKey[type] || type).filter(Boolean)
            setSelectedAddons(addonKeys)

            setIsInitialized(true)
        }
    }, [isUpdateMode, isLoadingEntitlements, isLoadingSubscription, isInitialized, currentPlan, currentClientLimit, currentBillingInterval, currentAddons, minClientCount])

    // Check if anything has changed from current subscription (in update mode)
    const hasChanges = useMemo(() => {
        if (!isUpdateMode) return true // Always allow checkout in non-update mode

        // Compare current selection with original values
        const originalInterval = currentBillingInterval === 'year' ? 'annual' : 'monthly'
        const originalAddonsKeys = (currentAddons || []).map(type => {
            const addonTypeToKey: Record<string, string> = {
                automations: 'automations',
                ai_assistant: 'aiAssistant',
                payments: 'payments',
            }
            return addonTypeToKey[type] || type
        }).sort()
        const currentAddonsKeys = [...selectedAddons].sort()

        const planChanged = selectedPlan !== currentPlan
        const clientsChanged = totalClients !== currentClientLimit
        const intervalChanged = billingInterval !== originalInterval
        const addonsChanged = JSON.stringify(originalAddonsKeys) !== JSON.stringify(currentAddonsKeys)

        return planChanged || clientsChanged || intervalChanged || addonsChanged
    }, [isUpdateMode, selectedPlan, currentPlan, totalClients, currentClientLimit, billingInterval, currentBillingInterval, selectedAddons, currentAddons])

    useEffect(() => {
        fetch('/animations/ai-sphere-animation.json')
            .then(res => res.json())
            .then(data => setAiAnimationData(data))
            .catch(() => {})
    }, [])

    // Handle billing interval change with confetti celebration
    const handleBillingChange = (checked: boolean) => {
        const newInterval = checked ? 'annual' : 'monthly'
        setBillingInterval(newInterval)

        // Fire confetti when switching to annual
        if (newInterval === 'annual') {
            // Get the position of the toggle for confetti origin
            if (toggleRef.current) {
                const rect = toggleRef.current.getBoundingClientRect()
                const x = (rect.left + rect.width / 2) / window.innerWidth
                const y = (rect.top + rect.height / 2 + 50) / window.innerHeight

                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { x, y },
                    colors: ['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#f97316'],
                    zIndex: 99999,
                })
            }

            // Show savings popup
            setShowSavingsPopup(true)

            // Auto-hide after 2 seconds
            setTimeout(() => {
                setShowSavingsPopup(false)
            }, 2000)
        }
    }

    // Hide popup on click anywhere
    useEffect(() => {
        if (!showSavingsPopup) return

        const handleClick = () => setShowSavingsPopup(false)
        window.addEventListener('click', handleClick)
        return () => window.removeEventListener('click', handleClick)
    }, [showSavingsPopup])

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
        // If subscription is being cancelled, show alert to reinstate first
        if (isSubscriptionCancelling) {
            setShowReinstateAlert(true)
            return
        }

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

            // Open Stripe checkout in new tab
            if (url) {
                window.open(url, '_blank')
            }
            setIsCheckoutLoading(false)
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
                <div className="mt-8 flex flex-col items-center gap-2 relative">
                    <div ref={toggleRef} className="relative inline-flex items-center gap-3 rounded-full border bg-muted px-4 py-2">
                        <span className={cn(
                            'text-sm font-medium transition-colors',
                            billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                            {t('monthly')}
                        </span>
                        <Switch
                            checked={billingInterval === 'annual'}
                            onCheckedChange={handleBillingChange}
                        />
                        <span className={cn(
                            'text-sm font-medium transition-colors',
                            billingInterval === 'annual' ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                            {t('annual')}
                        </span>
                    </div>

                    {/* Savings Badge - always visible */}
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {t('twoMonthsFree')}
                    </span>

                    {/* Animated Savings Popup */}
                    <AnimatePresence>
                        {showSavingsPopup && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-full mt-4 z-50"
                            >
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl shadow-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">🎉</span>
                                        <div>
                                            <p className="font-bold text-lg">You're saving {ANNUAL_DISCOUNT_PERCENT}%!</p>
                                            <p className="text-emerald-100 text-sm">Great choice with annual billing</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                                        <h3 className="text-2xl font-semibold">{t('starter.name')}</h3>
                                        <p className="text-base text-muted-foreground mt-2 pr-6">{t('starter.description')}</p>

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
                                        <h3 className="text-2xl font-semibold">{t('pro.name')}</h3>
                                        <p className="text-base text-muted-foreground mt-2 pr-6">{t('pro.description')}</p>

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
                                        <div className="flex items-baseline justify-between">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold">${selectedPlan === 'pro' ? getPrice('pro', totalClients) : getPrice('pro', PLANS.pro.baseClients)}</span>
                                                <span className="text-muted-foreground">/{t('month')}</span>
                                            </div>
                                            {billingInterval === 'annual' && (
                                                <span className="text-xs text-muted-foreground">{t('summary.billedAnnually')}</span>
                                            )}
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
                                        <h3 className="text-2xl font-semibold">{t('max.name')}</h3>
                                        <p className="text-base text-muted-foreground mt-2 pr-6">{t('max.description')}</p>

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
                                        <div className="flex items-baseline justify-between">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold">${selectedPlan === 'max' ? getPrice('max', totalClients) : getPrice('max', PLANS.max.baseClients)}</span>
                                                <span className="text-muted-foreground">/{t('month')}</span>
                                            </div>
                                            {billingInterval === 'annual' && (
                                                <span className="text-xs text-muted-foreground">{t('summary.billedAnnually')}</span>
                                            )}
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
                                className="relative z-20"
                            >
                                <Card className="p-6">
                                    <div className="text-center space-y-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-lg">{t('chooseClients.title')}</span>
                                            <Select
                                                value={totalClients.toString()}
                                                onValueChange={(value) => {
                                                    const parsed = parseInt(value)
                                                    if (!isNaN(parsed)) {
                                                        handleClientChange(parsed)
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-[140px] h-10 border-0 border-b-2 border-primary bg-transparent rounded-none text-lg text-primary font-semibold focus:ring-0 focus-visible:ring-0 [&_svg]:!text-primary [&_svg]:!opacity-100">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent position="popper" sideOffset={4} className="z-[10000]">
                                                    {availableClientOptions.map((num) => (
                                                        <SelectItem key={num} value={num.toString()}>
                                                            {num} {t('clients')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <p className="text-base text-muted-foreground -mt-1">
                                            {t('chooseClients.growBusiness', { limit: PLANS[selectedPlan].maxClients })}
                                        </p>

                                        {/* Slider - snaps to specific values */}
                                        <div className="pt-4 pb-2">
                                            <Slider
                                                value={[Math.max(0, availableClientOptions.indexOf(totalClients))]}
                                                onValueChange={([index]) => {
                                                    const value = availableClientOptions[index]
                                                    if (value !== undefined) {
                                                        handleClientChange(value)
                                                    }
                                                }}
                                                min={0}
                                                max={Math.max(0, availableClientOptions.length - 1)}
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

                                    // Check if this addon is currently subscribed (in update mode)
                                    const addonTypeToKey: Record<string, string> = {
                                        automations: 'automations',
                                        ai_assistant: 'aiAssistant',
                                        payments: 'payments',
                                    }
                                    const currentAddonKeys = (currentAddons || []).map(type => addonTypeToKey[type] || type)
                                    const isCurrentlySubscribed = isUpdateMode && currentAddonKeys.includes(addon.key)

                                    return (
                                        <motion.div
                                            key={addon.key}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: 0.1 * index }}
                                        >
                                            <Card
                                                className={cn(
                                                    'relative p-6 transition-all bg-card',
                                                    !isCurrentlySubscribed && 'cursor-pointer hover:shadow-md',
                                                    isSelected && 'ring-2 ring-primary'
                                                )}
                                                onClick={() => !isCurrentlySubscribed && toggleAddon(addon.key)}
                                            >
                                                {/* Top right: Cancel/Reactivate button for subscribed addons, checkbox for others */}
                                                <div className="absolute top-4 right-6">
                                                    {isCurrentlySubscribed ? (
                                                        <Button
                                                            variant="outline"
                                                            className="border-primary text-primary hover:bg-primary/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                // If subscription is being cancelled, addon will be cancelled too - show alert to reinstate subscription first
                                                                if (isSubscriptionCancelling) {
                                                                    setShowReinstateAddonAlert(true)
                                                                } else if (isAddonCancelling(addon.key)) {
                                                                    setConfirmReactivateItem(addon.key)
                                                                } else {
                                                                    setConfirmCancelItem(addon.key)
                                                                }
                                                            }}
                                                            disabled={cancellingItem !== null}
                                                        >
                                                            {cancellingItem === addon.key ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (isSubscriptionCancelling || isAddonCancelling(addon.key)) ? (
                                                                "Don't Cancel"
                                                            ) : (
                                                                'Cancel Add-on'
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <div className={cn(
                                                            'h-6 w-6 rounded-full border-2 flex items-center justify-center',
                                                            isSelected ? 'border-primary' : 'border-muted-foreground/30'
                                                        )}>
                                                            {isSelected && (
                                                                <div className="h-3 w-3 rounded-full bg-primary" />
                                                            )}
                                                        </div>
                                                    )}
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
                                                                'px-2.5 py-0.5 text-sm font-medium rounded-sm border',
                                                                isCurrentlySubscribed
                                                                    ? 'bg-[#dcfce7] text-[#14532d] border-[#bbf7d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                                                                    : isSelected
                                                                        ? 'bg-primary/20 text-primary border-primary/30'
                                                                        : 'bg-muted text-muted-foreground border-muted-foreground/20'
                                                            )}>
                                                                {isCurrentlySubscribed ? 'Active' : t('addon')}
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
                                <Card className="flex flex-col p-6 pt-[22px]">
                                    {/* Title - same position as plan card titles */}
                                    <h3 className="text-2xl font-semibold leading-tight">{t('summary.title')}</h3>
                                    <hr className="border-border -mx-6 mt-3" />
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
                                                ${billingInterval === 'annual'
                                                    ? ((priceBreakdown.planCost + priceBreakdown.extraClientsCost) * 12).toFixed(0)
                                                    : (priceBreakdown.planCost + priceBreakdown.extraClientsCost).toFixed(2)}
                                                <span className="font-normal text-muted-foreground">/{billingInterval === 'annual' ? t('year') : t('month')}</span>
                                            </p>
                                            {billingInterval === 'annual' && (
                                                <p className="text-xs text-muted-foreground">{t('summary.billedAnnually')}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Add-ons section - only show if add-ons are selected */}
                                    {selectedAddons.length > 0 && (
                                        <>
                                            <hr className="border-border -mx-6" />
                                            <div className="py-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('summary.addons')}</p>
                                                <div className="space-y-2">
                                                    {selectedAddons.map(addonKey => {
                                                        const addon = ADDONS.find(a => a.key === addonKey)
                                                        if (!addon) return null
                                                        return (
                                                            <div key={addonKey} className="flex items-start justify-between">
                                                                <p className="text-sm font-semibold text-primary">{t(`addons.${addonKey}.name`)}</p>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-semibold">
                                                                        ${billingInterval === 'annual'
                                                                            ? (getBilledAddonPrice(addon) * 12).toFixed(0)
                                                                            : getBilledAddonPrice(addon).toFixed(2)}
                                                                        <span className="font-normal text-muted-foreground">/{billingInterval === 'annual' ? t('year') : t('month')}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Footer - Total & CTA */}
                                    <div className="pt-3 border-t -mx-6 px-6 space-y-2">
                                        {/* Total */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xl font-bold">{t('summary.total')}</p>
                                            <div className="text-right">
                                                <p className="text-xl font-bold">
                                                    ${priceBreakdown.total.toFixed(2)}
                                                    <span className="text-sm font-normal text-muted-foreground">/{t('month')}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {billingInterval === 'annual' && priceBreakdown.total > 0 && (
                                            <p className="text-sm text-muted-foreground text-right">
                                                ${(priceBreakdown.total * 12).toFixed(2)}/{t('year')} {t('summary.billedAnnually')}
                                            </p>
                                        )}

                                        {/* CTA Button */}
                                        <Button
                                            size="lg"
                                            className="w-full rounded-xl text-base mt-2"
                                            onClick={handleCheckout}
                                            disabled={isCheckoutLoading || selectedPlan === 'starter' || (isUpdateMode && !hasChanges)}
                                        >
                                            {isCheckoutLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <span className="text-nowrap">{isUpdateMode ? 'Update plan' : t('summary.cta')}</span>
                                                    <ArrowRight className="size-4" />
                                                </>
                                            )}
                                        </Button>

                                        {/* Cancel/Reactivate Subscription Button - only in update mode for paid plans */}
                                        {canCancel && (
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="w-full rounded-xl text-base border-primary text-primary hover:bg-primary/10"
                                                onClick={() => isSubscriptionCancelling ? setConfirmReactivateItem('subscription') : setConfirmCancelItem('subscription')}
                                                disabled={cancellingItem !== null || isOpeningPortal}
                                            >
                                                {cancellingItem === 'subscription' ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : isSubscriptionCancelling ? (
                                                    "Don't Cancel"
                                                ) : (
                                                    'Cancel Subscription'
                                                )}
                                            </Button>
                                        )}

                                        {/* Manage Billing Button - opens Stripe customer portal */}
                                        {isUpdateMode && (
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="w-full rounded-xl text-base border-primary text-primary hover:bg-primary/10"
                                                onClick={handleManageBilling}
                                                disabled={cancellingItem !== null || isOpeningPortal}
                                            >
                                                {isOpeningPortal ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    'Manage Billing'
                                                )}
                                            </Button>
                                        )}

                                        {/* USD Note */}
                                        <p className="text-sm text-center text-muted-foreground">
                                            {t('summary.pricesInUSD')}
                                        </p>
                                    </div>
                                </Card>

                                {/* Terms */}
                                <p className="text-sm text-center text-muted-foreground mt-4">
                                    By continuing, you agree to our{' '}
                                    <Link href="/terms-of-use" className="underline hover:text-foreground">
                                        Terms of Service
                                    </Link>{' '}
                                    and{' '}
                                    <Link href="/privacy-policy" className="underline hover:text-foreground">
                                        Privacy Policy
                                    </Link>
                                </p>

                                {/* Powered by Stripe */}
                                <div className="flex items-center justify-center gap-2 mt-3">
                                    <span className="text-sm text-muted-foreground">Powered by</span>
                                    <img src="/icons/stripe.png" alt="Stripe" className="h-12" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Add-on Confirmation Dialog - Two Step */}
            <Dialog
                open={confirmCancelItem !== null && confirmCancelItem !== 'subscription'}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmCancelItem(null)
                        setCancelConfirmStep(1)
                    }
                }}
            >
                <DialogContent className="z-[10000]" overlayClassName="z-[10000]">
                    <DialogHeader className="min-h-[72px]">
                        <DialogTitle>
                            {cancelConfirmStep === 1
                                ? `Cancel ${confirmCancelItem ? getAddonDisplayName(confirmCancelItem) : ''} Add-on`
                                : 'Confirm Cancellation'
                            }
                        </DialogTitle>
                        <DialogDescription>
                            {cancelConfirmStep === 1
                                ? 'Are you sure you want to cancel this add-on? The cancellation will take effect at the end of your billing period.'
                                : 'Please confirm one more time to cancel this add-on.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="min-w-[100px]"
                            onClick={() => {
                                if (cancelConfirmStep === 2) {
                                    setCancelConfirmStep(1)
                                } else {
                                    setConfirmCancelItem(null)
                                    setCancelConfirmStep(1)
                                }
                            }}
                        >
                            {cancelConfirmStep === 1 ? 'Keep Add-on' : 'Go Back'}
                        </Button>
                        <Button
                            variant="destructive"
                            className="min-w-[140px]"
                            disabled={cancelConfirmStep === 2 && confirmButtonDisabled}
                            onClick={() => {
                                if (cancelConfirmStep === 1) {
                                    setCancelConfirmStep(2)
                                } else {
                                    confirmCancelItem && handleCancelAddon(confirmCancelItem)
                                }
                            }}
                        >
                            {cancelConfirmStep === 1 ? 'Cancel Add-on' : 'Confirm Cancellation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Subscription Confirmation Dialog - Two Step */}
            <Dialog
                open={confirmCancelItem === 'subscription'}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmCancelItem(null)
                        setCancelConfirmStep(1)
                    }
                }}
            >
                <DialogContent className="z-[10000]" overlayClassName="z-[10000]">
                    <DialogHeader className="min-h-[96px]">
                        <DialogTitle>
                            {cancelConfirmStep === 1 ? 'Cancel Subscription' : 'Confirm Cancellation'}
                        </DialogTitle>
                        <DialogDescription>
                            {cancelConfirmStep === 1
                                ? <>Are you sure you want to cancel your subscription? Your subscription will remain active until the end of your current billing period.{currentAddons.length > 0 && ' All add-ons will also be cancelled.'}</>
                                : 'Please confirm one more time to cancel your subscription.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="min-w-[140px]"
                            onClick={() => {
                                if (cancelConfirmStep === 2) {
                                    setCancelConfirmStep(1)
                                } else {
                                    setConfirmCancelItem(null)
                                    setCancelConfirmStep(1)
                                }
                            }}
                        >
                            {cancelConfirmStep === 1 ? 'Keep Subscription' : 'Go Back'}
                        </Button>
                        <Button
                            variant="destructive"
                            className="min-w-[160px]"
                            disabled={cancelConfirmStep === 2 && confirmButtonDisabled}
                            onClick={() => {
                                if (cancelConfirmStep === 1) {
                                    setCancelConfirmStep(2)
                                } else {
                                    handleCancelSubscription()
                                }
                            }}
                        >
                            {cancelConfirmStep === 1 ? 'Cancel Subscription' : 'Confirm Cancellation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reactivate Add-on Confirmation Dialog */}
            <Dialog open={confirmReactivateItem !== null && confirmReactivateItem !== 'subscription'} onOpenChange={(open) => !open && setConfirmReactivateItem(null)}>
                <DialogContent className="z-[10000]" overlayClassName="z-[10000]">
                    <DialogHeader>
                        <DialogTitle>Reactivate {confirmReactivateItem ? getAddonDisplayName(confirmReactivateItem) : ''} Add-on</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reactivate this add-on? The scheduled cancellation will be removed and you will continue to be billed for this add-on.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmReactivateItem(null)}>
                            Keep Cancellation
                        </Button>
                        <Button
                            onClick={() => confirmReactivateItem && handleReactivateAddon(confirmReactivateItem)}
                        >
                            Reactivate Add-on
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reactivate Subscription Confirmation Dialog */}
            <Dialog open={confirmReactivateItem === 'subscription'} onOpenChange={(open) => !open && setConfirmReactivateItem(null)}>
                <DialogContent className="z-[10000]" overlayClassName="z-[10000]">
                    <DialogHeader>
                        <DialogTitle>Reactivate Subscription</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reactivate your subscription? The scheduled cancellation will be removed and you will continue to be billed as normal.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmReactivateItem(null)}>
                            Keep Cancellation
                        </Button>
                        <Button
                            onClick={handleReactivateSubscription}
                        >
                            Reactivate Subscription
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reinstate Alert - shown when trying to update while subscription is being cancelled */}
            <Dialog open={showReinstateAlert} onOpenChange={setShowReinstateAlert}>
                <DialogContent className="z-[10000]" overlayClassName="z-[10000]">
                    <DialogHeader>
                        <DialogTitle>Subscription Set to be Cancelled</DialogTitle>
                        <DialogDescription>
                            Your subscription is currently scheduled for cancellation. Please reinstate your subscription first before making any changes.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowReinstateAlert(false)}>
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reinstate Add-on Alert - shown when trying to reinstate an add-on while subscription is being cancelled */}
            <Dialog open={showReinstateAddonAlert} onOpenChange={setShowReinstateAddonAlert}>
                <DialogContent className="z-[10000]" overlayClassName="z-[10000]">
                    <DialogHeader>
                        <DialogTitle>Subscription Set to be Cancelled</DialogTitle>
                        <DialogDescription>
                            Please reinstate your subscription first before reinstating an add-on. Reinstating your subscription will also reinstate all add-ons.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowReinstateAddonAlert(false)}>
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    )
}
