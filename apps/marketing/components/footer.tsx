'use client'

import { useState, useEffect } from 'react'
import { AthliLogo } from '@/components/athli-logo'
import { AppStoreButton, GooglePlayButton } from '@/components/base/buttons/app-store-buttons'
import { Link, useRouter, usePathname } from '@/lib/i18n/navigation'
import { routing } from '@/lib/i18n/routing'
import { localeMetadata } from '@/lib/i18n/locale-metadata'
import { useLocale, useTranslations } from 'next-intl'
import { featureKeys } from '@/lib/features-data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronDown, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'

const themeOptions = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
] as const

function ThemeSelector() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const current = themeOptions.find((o) => o.value === (mounted ? theme : 'system')) ?? themeOptions[2]
    const CurrentIcon = current.icon

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-primary transition-colors duration-150 cursor-pointer">
                    <CurrentIcon className="size-3.5" />
                    <span>{current.label}</span>
                    <ChevronDown className="size-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-44 p-1">
                {themeOptions.map(({ value, icon: Icon, label }) => {
                    const isActive = mounted && theme === value
                    return (
                        <button
                            key={value}
                            onClick={() => setTheme(value)}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors duration-150 cursor-pointer hover:bg-muted ${isActive ? 'bg-muted' : ''}`}
                        >
                            <Icon className="size-4" />
                            <span className="flex-1">{label}</span>
                            {isActive && <Check className="size-4 text-primary" />}
                        </button>
                    )
                })}
            </PopoverContent>
        </Popover>
    )
}

function LanguageSelector() {
    const router = useRouter()
    const pathname = usePathname()
    const currentLocale = useLocale()
    const currentMeta = localeMetadata[currentLocale] ?? localeMetadata[routing.defaultLocale]

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-primary transition-colors duration-150 cursor-pointer">
                    <span>{currentMeta.flag}</span>
                    <span>{currentMeta.label}</span>
                    <ChevronDown className="size-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-52 p-1">
                {routing.locales.map((locale) => {
                    const meta = localeMetadata[locale]
                    const isActive = locale === currentLocale
                    return (
                        <button
                            key={locale}
                            onClick={() => router.replace(pathname, { locale })}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors duration-150 cursor-pointer hover:bg-muted ${isActive ? 'bg-muted' : ''}`}
                        >
                            <span className="text-base leading-none">{meta.flag}</span>
                            <span className="flex-1">{meta.label}</span>
                            {isActive && <Check className="size-4 text-primary" />}
                        </button>
                    )
                })}
            </PopoverContent>
        </Popover>
    )
}

export default function FooterSection() {
    const t = useTranslations('footer')
    const tf = useTranslations('features')

    return (
        <footer className="border-b pt-20">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-12 md:grid-cols-5">
                    <div className="flex flex-col justify-between md:col-span-2">
                        <Link
                            href="/"
                            aria-label="go home"
                            className="block size-fit">
                            <AthliLogo />
                        </Link>
                        <div className="mt-6 flex items-center gap-3">
                            <AppStoreButton href="#" size="md" />
                            <GooglePlayButton href="#" size="md" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-3 md:grid-cols-4">
                        <div className="space-y-4 text-sm">
                            <span className="block font-medium">{t('features')}</span>
                            {featureKeys.map((key) => (
                                <Link
                                    key={key}
                                    href={`/features/${key}`}
                                    className="text-muted-foreground hover:text-primary block duration-150">
                                    <span>{tf(`${key}.label`)}</span>
                                </Link>
                            ))}
                        </div>
                        <div className="space-y-4 text-sm">
                            <span className="block font-medium">{t('company')}</span>
                            <Link
                                href="/faqs"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('faqs')}</span>
                            </Link>
                            <Link
                                href="/pricing"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('pricing')}</span>
                            </Link>
                            <Link
                                href="/how-we-compare"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('howWeCompare')}</span>
                            </Link>
                            <a
                                href="mailto:hello@athli.app"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('contact')}</span>
                            </a>
                        </div>
                        <div className="space-y-4 text-sm">
                            <span className="block font-medium">{t('mobileApp')}</span>
                            <Link
                                href="/mobile/coach"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('coach')}</span>
                            </Link>
                            <Link
                                href="/mobile/client"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('client')}</span>
                            </Link>
                        </div>
                        <div className="space-y-4 text-sm">
                            <span className="block font-medium">{t('legal')}</span>
                            <Link
                                href="/privacy-policy"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('privacy')}</span>
                            </Link>
                            <Link
                                href="/terms-of-use"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>{t('terms')}</span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="mt-12 flex flex-col items-start gap-4 border-t py-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <ThemeSelector />
                        <LanguageSelector />
                    </div>
                    <span className="text-muted-foreground text-sm">&copy; {new Date().getFullYear()} {t('copyright')}</span>
                </div>
            </div>
        </footer>
    )
}
