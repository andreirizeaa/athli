'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
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
            <div className="mx-auto max-w-5xl space-y-12 px-6">
                <div className="mx-auto max-w-xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">{t('sectionTitle')}</h2>
                    <p className="text-muted-foreground mt-4 text-balance">{t('sectionSubtitle')}</p>
                </div>

                {/* Mobile dropdown */}
                <div ref={dropdownRef} className="relative mx-auto w-full max-w-xs md:hidden">
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

                {/* Desktop pill bar */}
                <div className="mx-auto hidden w-fit rounded-full border bg-muted p-1 md:flex">
                    {featureKeys.map((key) => (
                        <button
                            key={key}
                            onClick={() => setActive(key)}
                            className="relative cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors">
                            {active === key && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 rounded-full bg-primary"
                                    transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                                />
                            )}
                            <span className={`relative z-10 ${active === key ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                {t(`${key}.label`)}
                            </span>
                        </button>
                    ))}
                </div>
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
                                    className="mx-auto max-w-5xl text-center">
                                    <h3 className="text-xl font-semibold md:text-2xl">{t(`${key}.headline`)}</h3>
                                    <p className="text-muted-foreground mt-3 text-balance">{t(`${key}.description`)}</p>
                                    <ul className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
                                        {(t.raw(`${key}.highlights`) as string[]).map((item) => (
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
        </section>
    )
}
