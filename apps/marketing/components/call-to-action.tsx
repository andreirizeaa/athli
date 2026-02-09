import { Button } from '@/components/ui/button'
import Link from 'next/link'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

export default function CallToAction() {
    return (
        <section className="py-16">
            <div className="mx-auto max-w-5xl rounded-3xl border bg-background px-6 py-12 md:py-20 lg:py-32">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl">Start Building</h2>
                    <p className="mt-4">Libero sapiente aliquam quibusdam aspernatur.</p>

                    <div className="mt-12 flex flex-wrap justify-center gap-4">
                        <Button
                            asChild
                            size="lg">
                            <Link href={`${APP_URL}/auth/register`}>
                                <span>Get Started</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
