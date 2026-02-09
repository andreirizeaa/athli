'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function FAQsTwo({ hideHeader = false }: { hideHeader?: boolean }) {
    const t = useTranslations('faqs')
    const faqItems = t.raw('items') as { question: string; answer: string }[]

    return (
        <section className="py-16 md:py-24">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                {!hideHeader && (
                    <div className="mx-auto max-w-xl text-center">
                        <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">{t('sectionTitle')}</h2>
                        <p className="text-muted-foreground mt-4 text-balance">{t('sectionSubtitle')}</p>
                    </div>
                )}

                <div className="mx-auto mt-12 max-w-xl">
                    <Accordion
                        type="single"
                        collapsible
                        className="bg-card ring-muted w-full rounded-2xl border px-8 py-3 shadow-sm ring-4 dark:ring-0">
                        {faqItems.map((item, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border-dashed">
                                <AccordionTrigger className="cursor-pointer text-base hover:no-underline">{item.question}</AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-base">{item.answer}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <div className="mt-6 px-8 text-center">
                        <p className="text-muted-foreground">{t('cantFind')}</p>
                        <a href="mailto:support@athli.io">
                            <Button className="mt-3">{t('reachOut')} <ArrowRight className="size-4" /></Button>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
