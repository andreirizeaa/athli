'use client'

import Link from 'next/link'
import { LandingAppStoreButton } from '@/components/landing/app-store-button/LandingAppStoreButton'

export default function MobileAppsSection() {
    return (
        <section id="mobile-apps" className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-12 px-6">
                <div className="mx-auto max-w-5xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">Mobile Apps</h2>
                    <p className="text-muted-foreground mt-4 text-balance">
                        Everything you can do on the web, you can do on mobile. Both the coach and client apps are built to be fast, modern, and intuitive, so managing your business or following your program feels effortless from anywhere.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-4 dark:hidden">
                        <LandingAppStoreButton appStore="ios-appstore" />
                        <LandingAppStoreButton appStore="google-playstore" />
                    </div>
                    <div className="mt-6 hidden items-center justify-center gap-4 dark:flex">
                        <LandingAppStoreButton appStore="ios-appstore" variant="white" />
                        <LandingAppStoreButton appStore="google-playstore" variant="white" />
                    </div>
                </div>

                <div className="grid gap-12 md:grid-cols-2">
                    <Link href="/mobile/coach" className="group space-y-6">
                        <h3 className="text-center text-xl font-semibold md:text-2xl">Coach</h3>
                        <div className="flex justify-center">
                            <div className="relative w-[260px] transition-transform duration-300 group-hover:scale-[1.02]">
                                <div className="absolute inset-4 rounded-[2rem]" style={{ boxShadow: '0 0 60px rgba(192,132,252,0.25), 0 0 120px rgba(165,180,252,0.2)' }} />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/mobile/coach/home/dark.png"
                                    alt="Athli Coach mobile app home screen"
                                    className="relative hidden w-full dark:block"
                                />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/mobile/coach/home/light.png"
                                    alt="Athli Coach mobile app home screen"
                                    className="relative w-full dark:hidden"
                                />
                            </div>
                        </div>
                    </Link>

                    <Link href="/mobile/client" className="group space-y-6">
                        <h3 className="text-center text-xl font-semibold md:text-2xl">Client</h3>
                        <div className="flex justify-center">
                            <div className="relative w-[260px] transition-transform duration-300 group-hover:scale-[1.02]">
                                <div className="absolute inset-4 rounded-[2rem]" style={{ boxShadow: '0 0 60px rgba(192,132,252,0.25), 0 0 120px rgba(165,180,252,0.2)' }} />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/mobile/client/home/dark.png"
                                    alt="Athli Client mobile app home screen"
                                    className="relative hidden w-full dark:block"
                                />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/mobile/client/home/light.png"
                                    alt="Athli Client mobile app home screen"
                                    className="relative w-full dark:hidden"
                                />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    )
}
