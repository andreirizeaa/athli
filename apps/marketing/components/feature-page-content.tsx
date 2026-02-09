'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import type { FeaturePageData } from '@/lib/features-data'

export default function FeaturePageContent({ feature }: { feature: FeaturePageData }) {
    return (
        <section className="pb-16 md:pb-24">
            <div className="mx-auto max-w-5xl px-6">
                {/* Screenshot */}
                <div className="relative md:-mx-8" style={{ aspectRatio: '3020 / 1640' }}>
                    <div className="absolute inset-0 overflow-hidden rounded-xl border">
                        <Image
                            src={`/features/${feature.key}/dark.png`}
                            className="hidden object-contain dark:block"
                            alt={`${feature.label} feature screenshot`}
                            fill
                        />
                        <Image
                            src={`/features/${feature.key}/light.png`}
                            className="object-contain dark:hidden"
                            alt={`${feature.label} feature screenshot`}
                            fill
                        />
                    </div>
                </div>

                {/* Highlights */}
                <div className="mt-10 flex flex-wrap justify-center gap-2 text-sm">
                    {feature.highlights.map((item) => (
                        <span
                            key={item}
                            className="rounded-full border-2 border-purple-400/50 px-3 py-1 font-medium bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent dark:border-indigo-300/50">
                            {item}
                        </span>
                    ))}
                </div>

                {/* Description */}
                <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-center text-balance text-lg">
                    {feature.description}
                </p>

                {/* Benefit cards */}
                <div className="mt-16 grid gap-6 md:grid-cols-3">
                    {feature.benefits.map((benefit, i) => (
                        <motion.div
                            key={benefit.title}
                            initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            viewport={{ once: true, margin: '-60px' }}
                            className="rounded-2xl border bg-background p-6">
                            <h3 className="text-lg font-semibold">{benefit.title}</h3>
                            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{benefit.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
