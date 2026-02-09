'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'

const features = [
    {
        key: 'flows',
        label: 'Flows',
        headline: 'Automated accountability, beyond just check-ins',
        description: 'Set up custom flows that trigger automatically when clients fall behind. Whether it\'s a missed session, an overdue check-in, or a stalled habit, predefined automations step in so nothing slips through the cracks.',
        highlights: ['Custom trigger conditions', 'Predefined automated sequences', 'Keeps clients on track without manual follow-up'],
    },
    {
        key: 'forms',
        label: 'Forms',
        headline: 'Fully customizable forms that feed your data',
        description: 'Build forms tailored to any question you need answered. Responses connect directly to client metrics and progress photos, so every submission automatically updates their profile. You design the questions, and your clients fill them in on schedule.',
        highlights: ['Connect responses to metrics and progress photos', 'Automated submission schedules', 'Coach review dashboard for all responses'],
    },
    {
        key: 'inbox',
        label: 'Inbox',
        headline: 'Message clients with their full profile in view',
        description: 'A built-in inbox with a client power panel right alongside the conversation. See their metrics, progress, and profile without switching screens, so you can give informed, contextual advice without ever leaving the chat.',
        highlights: ['Client profile panel beside every conversation', 'Metrics and progress at a glance', 'Everything in one window'],
    },
    {
        key: 'metrics',
        label: 'Metrics',
        headline: 'Track any metric that matters to you',
        description: 'Define and track any metric, from body measurements to sleep quality, energy levels, or anything unique to your coaching method. Every metric is fully customizable, giving you the data you need to make better decisions for your clients.',
        highlights: ['Define unlimited custom metrics', 'Track anything relevant to your coaching', 'Clear visualizations over time'],
    },
    {
        key: 'progress',
        label: 'Progress',
        headline: 'Detailed tracking across every exercise and variant',
        description: 'Every set, rep, and variation is tracked and clearly presented. See detailed performance data for all exercise types, compare progress across sessions, and identify trends so you and your clients always know what\'s improving.',
        highlights: ['Track all exercise types and variants', 'Session-by-session comparisons', 'Clear progress visualizations'],
    },
    {
        key: 'training',
        label: 'Training',
        headline: 'Plan everything from one calendar view',
        description: 'A clear, drag-and-drop calendar where you can plan, copy, and rearrange workouts with ease. View past sessions and future plans side by side, so programming an entire training block takes minutes, not hours.',
        highlights: ['Drag-and-drop calendar', 'Copy and reuse workouts across days', 'View past and future sessions in one place'],
    },
    {
        key: 'workouts',
        label: 'Workouts',
        headline: 'Over 1,700 exercises, fully customizable',
        description: 'Access an extensive library of 1,734 exercises and build workouts exactly how you want. Every section type is supported, and every detail is fully customizable to match your programming style.',
        highlights: ['1,734 exercises built in', 'AMRAPs, EMOMs, tabatas, HIITs, and circuits', 'Fully customizable sections and structure'],
    },
]

export default function FeaturesSection() {
    const [active, setActive] = useState('flows')

    useEffect(() => {
        const handler = (e: CustomEvent<string>) => setActive(e.detail)
        window.addEventListener('set-feature', handler as EventListener)
        return () => window.removeEventListener('set-feature', handler as EventListener)
    }, [])

    return (
        <section id="features" className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-12 px-6">
                <div className="mx-auto max-w-xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">Our features</h2>
                    <p className="text-muted-foreground mt-4 text-balance">Keep your clients accountable and simplify your business</p>
                </div>
                <div className="mx-auto flex w-fit rounded-full border bg-muted p-1">
                    {features.map((feature) => (
                        <button
                            key={feature.key}
                            onClick={() => setActive(feature.key)}
                            className="relative cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors">
                            {active === feature.key && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 rounded-full bg-primary"
                                    transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                                />
                            )}
                            <span className={`relative z-10 ${active === feature.key ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                {feature.label}
                            </span>
                        </button>
                    ))}
                </div>
                <AnimatePresence mode="wait">
                    {features.map(
                        (feature) =>
                            feature.key === active && (
                                <motion.div
                                    key={feature.key}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.25 }}
                                    className="mx-auto max-w-5xl text-center">
                                    <h3 className="text-xl font-semibold md:text-2xl">{feature.headline}</h3>
                                    <p className="text-muted-foreground mt-3 text-balance">{feature.description}</p>
                                    <ul className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
                                        {feature.highlights.map((item) => (
                                            <li key={item} className="rounded-full border-2 border-purple-400/50 px-3 py-1 font-medium bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent dark:border-indigo-300/50">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )
                    )}
                </AnimatePresence>
                <div className="relative md:-mx-8" style={{ aspectRatio: '3020 / 1640' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active}
                            className="absolute inset-0 overflow-hidden rounded-xl border"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}>
                            <Image
                                src={`/features/${active}/dark.png`}
                                className="hidden object-contain dark:block"
                                alt={`Athli ${features.find((f) => f.key === active)?.label} — ${features.find((f) => f.key === active)?.headline}`}
                                fill
                            />
                            <Image
                                src={`/features/${active}/light.png`}
                                className="object-contain dark:hidden"
                                alt={`Athli ${features.find((f) => f.key === active)?.label} — ${features.find((f) => f.key === active)?.headline}`}
                                fill
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    )
}
