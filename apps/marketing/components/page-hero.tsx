'use client'

import { TextEffect } from '@/components/ui/text-effect'

export default function PageHero({ title, titleLine2, subtitle }: { title: string; titleLine2?: string; subtitle: string }) {
    return (
        <section className="pb-8 md:pb-12">
            <div className="relative mx-auto max-w-7xl px-6">
                <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                    <TextEffect
                        preset="fade-in-blur"
                        speedSegment={0.3}
                        as="h1"
                        className="mx-auto max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl xl:text-[5.25rem]">
                        {title}
                    </TextEffect>
                    {titleLine2 && (
                        <TextEffect
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            delay={0.25}
                            as="p"
                            className="mx-auto max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl xl:text-[5.25rem]">
                            {titleLine2}
                        </TextEffect>
                    )}
                    <TextEffect
                        per="line"
                        preset="fade-in-blur"
                        speedSegment={0.3}
                        delay={0.5}
                        as="p"
                        className="text-muted-foreground mx-auto mt-8 max-w-2xl text-balance text-lg">
                        {subtitle}
                    </TextEffect>
                </div>
            </div>
        </section>
    )
}
