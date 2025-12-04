'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export default function Features() {
    const t = useTranslations();
    return (
        <section className="dark:bg-muted/25 bg-zinc-50">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto grid gap-2 sm:grid-cols-5">
                    <Card className="group overflow-hidden shadow-zinc-950/5 sm:col-span-3 sm:rounded-none sm:rounded-tl-xl bg-background">
                        <CardHeader >
                            <p className="max-w-md text-balance px-6 text-left text-lg font-semibold sm:text-2xl">{t('features.manageClients')}</p>
                        </CardHeader>

                        <div className="mask-b-from-75% mask-b-to-95% mask-r-from-80% mask-r-to-100% relative h-fit pl-6 md:pl-12">
                            <div className="bg-background overflow-hidden rounded-tl-lg border-l border-t dark:bg-zinc-950">
                                <Image
                                    src="/athletes-overview-dark.png"
                                    className="hidden dark:block"
                                    alt="athletes overview illustration dark"
                                    width={1207}
                                    height={929}
                                />
                                <Image
                                    src="/athletes-overview-light.png"
                                    className="shadow dark:hidden"
                                    alt="athletes overview illustration light"
                                    width={1207}
                                    height={929}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="group flex flex-col overflow-hidden shadow-zinc-950/5 sm:col-span-2 sm:rounded-none sm:rounded-tr-xl bg-background">
                        <p className="mx-auto max-w-md text-balance px-6 text-center text-lg font-semibold sm:text-2xl">{t('features.assignSchedule')}</p>

                        <CardContent className="mt-auto h-fit p-0">
                            <div className="mask-l-from-80% mask-l-to-95% mask-b-from-80% mask-b-to-95% relative pr-6 md:pr-12">
                                <div className="aspect-76/59 overflow-hidden rounded-bl-lg border-b border-l">
                                    <Image
                                        src="/assign-dark.png"
                                        className="hidden dark:block"
                                        alt="assign illustration dark"
                                        width={1207}
                                        height={929}
                                    />
                                    <Image
                                        src="/assign-light.png"
                                        className="shadow dark:hidden"
                                        alt="assign illustration light"
                                        width={1207}
                                        height={929}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="group overflow-hidden shadow-zinc-950/5 sm:col-span-2 sm:rounded-none sm:rounded-bl-xl bg-background">
                        <div className="mask-t-from-80% mask-t-to-95% mask-r-from-80% mask-r-to-95% relative h-fit pl-6 pt-1 md:pl-12">
                            <div className="bg-background max-h-[240] max-w-md overflow-hidden rounded-tr-lg border-r border-t dark:bg-zinc-950">
                                <Image
                                    src="/create-dark.png"
                                    className="hidden dark:block h-auto w-full object-cover"
                                    alt="create illustration dark"
                                    width={1207}
                                    height={929}
                                />
                                <Image
                                    src="/create-light.png"
                                    className="shadow dark:hidden h-auto w-full object-cover"
                                    alt="create illustration light"
                                    width={1207}
                                    height={929}
                                />
                            </div>
                        </div>
                        <CardHeader className="pt-3">
                            <p className="max-w-md text-balance px-6 text-center text-lg font-semibold sm:text-2xl">{t('features.customExercises')}</p>
                        </CardHeader>
                    </Card>
                    <Card className="group overflow-hidden shadow-zinc-950/5 sm:col-span-3 sm:rounded-none sm:rounded-br-xl bg-background">
                        <div className="mask-t-from-75% mask-t-to-95% mask-l-from-80% mask-l-to-100% relative h-fit">
                            <div className="bg-background max-w-md overflow-hidden rounded-tl-lg border-l border-t dark:bg-zinc-950">
                                <Image
                                    src="/exercise-creation-dark.png"
                                    className="hidden dark:block"
                                    alt="exercise creation illustration dark"
                                    width={1207}
                                    height={929}
                                />
                                <Image
                                    src="/exercise-creation-light.png"
                                    className="shadow dark:hidden"
                                    alt="exercise creation illustration light"
                                    width={1207}
                                    height={929}
                                />
                            </div>
                        </div>
                        <CardHeader className="pt-3">
                            <p className="ml-auto max-w-md text-balance px-6 text-right text-lg font-semibold sm:text-2xl">{t('features.messageAthletes')}</p>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </section>
    )
}
