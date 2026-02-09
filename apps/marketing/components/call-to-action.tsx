'use client'

import { AthliLogo } from '@/components/athli-logo'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import NextLink from 'next/link'
import { useTranslations } from 'next-intl'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

export default function CallToAction() {
    const t = useTranslations('cta')
    return (
        <section className="px-6 py-16">
            <div className="mx-auto max-w-5xl rounded-3xl border bg-background px-6 py-12 md:py-20 lg:py-32">
                <div className="flex flex-col items-center text-center">
                    <AthliLogo />
                    <h2 className="mt-6 text-balance text-4xl font-semibold lg:text-5xl">{t('title')}</h2>
                    <p className="text-muted-foreground mt-4 text-balance">{t('subtitle')}</p>

                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <Button
                            asChild
                            size="lg">
                            <NextLink href={`${APP_URL}/auth/register`}>
                                <span>{t('button')}</span>
                                <ArrowRight className="size-4" />
                            </NextLink>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
