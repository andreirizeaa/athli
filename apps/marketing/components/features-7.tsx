import { Cpu, Lock, Sparkles, Zap } from 'lucide-react'
import Image from 'next/image'

export default function FeaturesSection() {
    return (
        <section className="overflow-hidden py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-4xl font-semibold lg:text-4xl">Athli is designed to save you time</h2>
                    <p className="mt-6 text-lg">Build custom workouts and programs through text. No more manual work needed!</p>
                </div>
                <div className="mask-b-from-75% mask-l-from-75% mask-b-to-95% mask-l-to-95% relative -mx-4 pr-3 pt-3 md:-mx-12">
                    <div className="perspective-midrange">
                        <div className="rotate-x-6 -skew-2">
                            <div className="aspect-88/36 relative">
                                <Image
                                    src="/exercise-creation-dark.png"
                                    className="hidden dark:block"
                                    alt="Exercise creation illustration dark"
                                    width={2797}
                                    height={1137}
                                />
                                <Image
                                    src="/exercise-creation-light.png"
                                    className="dark:hidden"
                                    alt="Exercise creation illustration light"
                                    width={2797}
                                    height={1137}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
