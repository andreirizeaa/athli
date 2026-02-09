'use client'

import NextLink from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

export default function Pricing({ hideHeader = false }: { hideHeader?: boolean }) {
    const t = useTranslations('pricing')

    const freeFeatures = t.raw('free.features') as string[]
    const proFeatures = t.raw('pro.features') as string[]
    const startupFeatures = t.raw('startup.features') as string[]

    return (
        <section id="pricing" className="py-16 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                {!hideHeader && (
                    <div className="mx-auto max-w-2xl space-y-6 text-center">
                        <h1 className="text-center text-4xl font-semibold lg:text-5xl">{t('sectionTitle')}</h1>
                        <p>{t('sectionSubtitle')}</p>
                    </div>
                )}

                <div className="mt-8 grid gap-6 md:mt-20 md:grid-cols-3">
                    <motion.div
                        initial={{ opacity: 0, filter: 'blur(12px)', y: 12 }}
                        whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, delay: 0 }}
                    >
                        <Card className="flex flex-col h-full">
                            <CardHeader>
                                <CardTitle className="font-medium">{t('free.name')}</CardTitle>
                                <span className="my-3 block text-2xl font-semibold">{t('free.price')}</span>
                                <CardDescription className="text-sm">{t('perEditor')}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <hr className="border-dashed" />

                                <ul className="list-outside space-y-3 text-sm">
                                    {freeFeatures.map((item, index) => (
                                        <li
                                            key={index}
                                            className="flex items-center gap-2">
                                            <Check className="size-3" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="mt-auto">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full">
                                    <NextLink href="">{t('getStarted')}</NextLink>
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, filter: 'blur(12px)', y: 12 }}
                        whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <Card className="relative h-full">
                            <span className="bg-linear-to-br/increasing absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full from-purple-400 to-amber-300 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5">{t('popular')}</span>

                            <div className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="font-medium">{t('pro.name')}</CardTitle>
                                    <span className="my-3 block text-2xl font-semibold">{t('pro.price')}</span>
                                    <CardDescription className="text-sm">{t('perEditor')}</CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <hr className="border-dashed" />
                                    <ul className="list-outside space-y-3 text-sm">
                                        {proFeatures.map((item, index) => (
                                            <li
                                                key={index}
                                                className="flex items-center gap-2">
                                                <Check className="size-3" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter>
                                    <Button
                                        asChild
                                        className="w-full">
                                        <NextLink href="">{t('getStarted')}</NextLink>
                                    </Button>
                                </CardFooter>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, filter: 'blur(12px)', y: 12 }}
                        whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Card className="flex flex-col h-full">
                            <CardHeader>
                                <CardTitle className="font-medium">{t('startup.name')}</CardTitle>
                                <span className="my-3 block text-2xl font-semibold">{t('startup.price')}</span>
                                <CardDescription className="text-sm">{t('perEditor')}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <hr className="border-dashed" />

                                <ul className="list-outside space-y-3 text-sm">
                                    {startupFeatures.map((item, index) => (
                                        <li
                                            key={index}
                                            className="flex items-center gap-2">
                                            <Check className="size-3" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="mt-auto">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full">
                                    <NextLink href="">{t('getStarted')}</NextLink>
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
