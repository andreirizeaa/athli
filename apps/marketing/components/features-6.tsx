'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { featureKeys } from '@/lib/features-data'
import { useTranslations } from 'next-intl'

export default function FeaturesSection() {
    const [active, setActive] = useState<string>('flows')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const t = useTranslations('features')

    useEffect(() => {
        const handler = (e: CustomEvent<string>) => setActive(e.detail)
        window.addEventListener('set-feature', handler as EventListener)
        return () => window.removeEventListener('set-feature', handler as EventListener)
    }, [])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <section id="features" className="py-16 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                {/* Header - centered */}
                <div className="mx-auto max-w-2xl text-center mb-12 md:mb-16">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">{t('sectionTitle')}</h2>
                    <p className="text-muted-foreground mt-4 text-balance">{t('sectionSubtitle')}</p>
                </div>

                {/* Mobile layout - keep existing stacked approach */}
                <div className="md:hidden space-y-8">
                    {/* Mobile dropdown */}
                    <div ref={dropdownRef} className="relative mx-auto w-full max-w-xs">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex w-full cursor-pointer items-center justify-between rounded-xl border bg-muted px-4 py-3 text-sm font-medium"
                        >
                            <span>{t(`${active}.label`)}</span>
                            <ChevronDown className={`size-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {dropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border bg-background p-1 shadow-lg"
                                >
                                    {featureKeys.map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => { setActive(key); setDropdownOpen(false) }}
                                            className={`flex w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                        >
                                            {t(`${key}.label`)}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile content */}
                    <AnimatePresence mode="wait">
                        {featureKeys.map(
                            (key) =>
                                key === active && (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-center">
                                        <h3 className="text-xl font-semibold">{t(`${key}.headline`)}</h3>
                                        <p className="text-muted-foreground mt-3 text-balance">{t(`${key}.description`)}</p>
                                    </motion.div>
                                )
                        )}
                    </AnimatePresence>

                    {/* Mobile image */}
                    <div className="relative" style={{ aspectRatio: '3020 / 1640' }}>
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
                                    alt={`Athli ${t(`${active}.label`)} — ${t(`${active}.headline`)}`}
                                    fill
                                />
                                <Image
                                    src={`/features/${active}/light.png`}
                                    className="object-contain dark:hidden"
                                    alt={`Athli ${t(`${active}.label`)} — ${t(`${active}.headline`)}`}
                                    fill
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Desktop layout - feature list left, content + image right */}
                <div className="hidden md:block rounded-3xl border bg-background overflow-hidden py-4 lg:py-6">
                    <div className="grid md:grid-cols-[30%_70%] items-center">
                        {/* Left column - feature list */}
                        <div className="space-y-0 divide-y px-8 lg:px-10">
                            {featureKeys.map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setActive(key)}
                                    className="flex w-full cursor-pointer items-center justify-between py-4 text-left"
                                >
                                    <span className={`transition-colors ${active === key ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium'}`}>
                                        {t(`${key}.label`)}
                                    </span>
                                    <ChevronRight
                                        className={`size-5 text-muted-foreground transition-transform duration-200 ${active === key ? 'rotate-90' : ''}`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Right column - description + image */}
                        <div className="py-6 pr-6 lg:py-8 lg:pr-8 flex flex-col gap-4">
                            {/* Description above image */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={active}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3"
                                >
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {t(`${active}.description`)}
                                    </p>
                                    <div className="flex gap-2">
                                        {(t.raw(`${active}.highlights`) as string[]).slice(0, 2).map((item) => (
                                            <span key={item} className="w-fit rounded-full border-2 border-purple-400/50 px-2.5 py-0.5 text-xs font-medium bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent dark:border-indigo-300/50">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Image */}
                            <div className="relative overflow-hidden rounded-xl border" style={{ aspectRatio: '3020 / 1640' }}>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={active}
                                        className="absolute inset-0"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25 }}>
                                        <Image
                                            src={`/features/${active}/dark.png`}
                                            className="hidden object-contain dark:block"
                                            alt={`Athli ${t(`${active}.label`)} — ${t(`${active}.headline`)}`}
                                            fill
                                        />
                                        <Image
                                            src={`/features/${active}/light.png`}
                                            className="object-contain dark:hidden"
                                            alt={`Athli ${t(`${active}.label`)} — ${t(`${active}.headline`)}`}
                                            fill
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
