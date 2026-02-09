'use client'

import { AthliLogo } from '@/components/athli-logo'
import Link from 'next/link'

const featureItems = ['Flows', 'Forms', 'Inbox', 'Metrics', 'Progress', 'Training', 'Workouts']

const legalItems = [
    { title: 'Privacy', href: '/privacy-policy' },
    { title: 'Terms', href: '/terms-of-use' },
]

export default function FooterSection() {
    const handleFeatureClick = (title: string) => {
        window.dispatchEvent(new CustomEvent('set-feature', { detail: title.toLowerCase() }))
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <footer className="border-b pt-20">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-12 md:grid-cols-5">
                    <div className="md:col-span-2">
                        <Link
                            href="/"
                            aria-label="go home"
                            className="block size-fit">
                            <AthliLogo />
                        </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-6 md:col-span-3">
                        <div className="space-y-4 text-sm">
                            <span className="block font-medium">Features</span>
                            {featureItems.map((title) => (
                                <button
                                    key={title}
                                    onClick={() => handleFeatureClick(title)}
                                    className="text-muted-foreground hover:text-primary block cursor-pointer duration-150">
                                    <span>{title}</span>
                                </button>
                            ))}
                        </div>
                        <div className="space-y-4 text-sm">
                            <span className="block font-medium">Mobile App</span>
                            <Link
                                href="/mobile/coach"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>Coach</span>
                            </Link>
                            <Link
                                href="/mobile/client"
                                className="text-muted-foreground hover:text-primary block duration-150">
                                <span>Client</span>
                            </Link>
                        </div>
                        <div className="space-y-4 text-sm">
                            <span className="block font-medium">Legal</span>
                            {legalItems.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className="text-muted-foreground hover:text-primary block duration-150">
                                    <span>{item.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-12 flex items-center justify-between border-t py-6">
                    <span className="text-muted-foreground text-sm">© {new Date().getFullYear()} Athli, All rights reserved</span>
                </div>
            </div>
        </footer>
    )
}
