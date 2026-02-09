'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { TextEffect } from '@/components/ui/text-effect'
import { AppStoreButton, GooglePlayButton } from '@/components/base/buttons/app-store-buttons'

export interface Feature {
    key: string
    label: string
    headline: string
    description: string
    highlights: string[]
    imagePath: string
}

interface MobileAppShowcaseProps {
    appTitle: string
    tagline: string
    description: string
    features: Feature[]
    getAppTitle: string
    getAppSubtitle: string
}

function PhoneFrame({ imagePath, alt }: { imagePath: string; alt: string }) {
    return (
        <div className="relative w-[240px] md:w-[280px]">
            <div
                className="absolute inset-4 rounded-[2rem]"
                style={{ boxShadow: '0 0 30px rgba(192,132,252,0.2), 0 0 60px rgba(165,180,252,0.15)' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${imagePath}/dark.png`} alt={alt} className="relative hidden w-full dark:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${imagePath}/light.png`} alt={alt} className="relative w-full dark:hidden" />
        </div>
    )
}

function FeatureSection({ feature, index }: { feature: Feature; index: number }) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: '-80px' })
    const isReversed = index % 2 !== 0

    return (
        <section ref={ref} className="py-12 md:py-20">
            <div className="mx-auto max-w-5xl px-6">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`flex flex-col items-center gap-8 md:gap-16 ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
                    <div className="flex shrink-0 justify-center">
                        <PhoneFrame imagePath={feature.imagePath} alt={feature.headline} />
                    </div>

                    <div className="text-center md:text-left">
                        <span className="inline-block rounded-full border-2 border-purple-400/50 px-3 py-1 text-sm font-medium bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent dark:border-indigo-300/50">
                            {feature.label}
                        </span>
                        <h3 className="mt-4 text-balance text-2xl font-semibold md:text-3xl">{feature.headline}</h3>
                        <p className="text-muted-foreground mt-3 text-balance leading-relaxed">{feature.description}</p>
                        <ul className="mt-4 flex flex-wrap justify-center gap-2 text-sm md:justify-start">
                            {feature.highlights.map((item) => (
                                <li key={item} className="rounded-full border bg-muted px-3 py-1 text-muted-foreground">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default function MobileAppShowcase({ appTitle, tagline, description, features, getAppTitle, getAppSubtitle }: MobileAppShowcaseProps) {
    return (
        <>
            {/* Hero */}
            <section className="pb-16 md:pb-24">
                <div className="relative mx-auto max-w-7xl px-6">
                    <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                        <TextEffect
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            as="h1"
                            className="mx-auto max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl xl:text-[5.25rem]">
                            {appTitle}
                        </TextEffect>
                        <TextEffect
                            per="line"
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            delay={0.5}
                            as="p"
                            className="mx-auto mt-8 max-w-2xl text-balance text-lg">
                            {tagline}
                        </TextEffect>
                        <TextEffect
                            per="line"
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            delay={0.7}
                            as="p"
                            className="text-muted-foreground mx-auto mt-2 max-w-2xl text-balance">
                            {description}
                        </TextEffect>

                        <motion.div
                            initial={{ opacity: 0, y: 12, filter: 'blur(12px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: 0.6, delay: 0.75 }}
                            className="mt-12 flex items-center justify-center gap-4">
                            <AppStoreButton href="#" />
                            <GooglePlayButton href="#" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features */}
            {features.map((feature, i) => (
                <FeatureSection key={feature.key} feature={feature} index={i} />
            ))}

            {/* Bottom CTA */}
            <section className="py-16 md:py-24">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="rounded-3xl border bg-background px-6 py-12 text-center md:py-16">
                        <h2 className="text-balance text-3xl font-semibold md:text-4xl">
                            {getAppTitle}
                        </h2>
                        <p className="text-muted-foreground mt-4 text-balance">{getAppSubtitle}</p>
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <AppStoreButton href="#" />
                            <GooglePlayButton href="#" />
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
