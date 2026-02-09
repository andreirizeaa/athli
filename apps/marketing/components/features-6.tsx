import { Cpu, Lock, Sparkles, Zap } from 'lucide-react'
import Image from 'next/image'

export default function FeaturesSection() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-12 px-6">
                <div className="mx-auto max-w-xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">Our features</h2>
                    <p className="text-muted-foreground mt-4 text-balance">Keep your clients accountable and simplifiy your business</p>
                </div>
                <div className="relative mx-auto grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <button className="cursor-pointer rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted">
                        <div className="flex items-center gap-2">
                            <Zap className="size-4" />
                            <h3 className="text-sm font-medium">Faaast</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">It supports an entire helping developers and innovate.</p>
                    </button>
                    <button className="cursor-pointer rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted">
                        <div className="flex items-center gap-2">
                            <Cpu className="size-4" />
                            <h3 className="text-sm font-medium">Powerful</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">It supports an entire helping developers and businesses.</p>
                    </button>
                    <button className="cursor-pointer rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted">
                        <div className="flex items-center gap-2">
                            <Lock className="size-4" />
                            <h3 className="text-sm font-medium">Security</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">It supports an helping developers businesses innovate.</p>
                    </button>
                    <button className="cursor-pointer rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4" />
                            <h3 className="text-sm font-medium">AI Powered</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">It supports an helping developers businesses innovate.</p>
                    </button>
                </div>
                <div className="px-3 pt-3 md:-mx-8">
                    <div className="aspect-88/36 mask-b-from-75% mask-b-to-95% relative">
                        <Image
                            src="/mail-upper.png"
                            className="absolute inset-0 z-10"
                            alt="payments illustration dark"
                            width={2797}
                            height={1137}
                        />
                        <Image
                            src="/mail-back.png"
                            className="hidden dark:block"
                            alt="payments illustration dark"
                            width={2797}
                            height={1137}
                        />
                        <Image
                            src="/mail-back-light.png"
                            className="dark:hidden"
                            alt="payments illustration light"
                            width={2797}
                            height={1137}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
