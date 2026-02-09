'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'

export default function FAQsTwo() {
    const faqItems = [
        {
            id: 'item-1',
            question: 'How many clients can I manage on Athli?',
            answer: 'There is no hard limit. Athli is built to scale with your business — whether you coach 5 clients or 500. Your plan determines the number of active client slots available.',
        },
        {
            id: 'item-2',
            question: 'What does the AI assistant actually do?',
            answer: 'It helps you create workout programs, meal plans, and training templates in seconds. You can also use it to analyse client progress, generate exercise variations, and draft check-in responses — all from a single chat interface.',
        },
        {
            id: 'item-3',
            question: 'Can my clients use the app too?',
            answer: 'Yes. Clients get their own mobile app where they can view programs, log workouts, submit check-ins, complete questionnaires, and communicate with you directly.',
        },
        {
            id: 'item-4',
            question: 'How do client check-ins work?',
            answer: 'You configure a check-in schedule and your clients receive reminders to submit updates including progress photos, measurements, and notes. All submissions appear in your dashboard for easy review.',
        },
        {
            id: 'item-5',
            question: 'Can I import my existing clients and programs?',
            answer: 'Yes. You can bulk-invite clients via email and import existing training programs from spreadsheets. Our onboarding flow guides you through the entire setup.',
        },
        {
            id: 'item-6',
            question: 'Is my data and my clients\' data secure?',
            answer: 'Absolutely. All data is encrypted in transit and at rest. We use industry-standard authentication and never share your data with third parties. You own your data completely.',
        },
        {
            id: 'item-7',
            question: 'What integrations does Athli support?',
            answer: 'Athli integrates with WhatsApp for client messaging, Google Docs and Excel for import/export, and supports connections to popular tools via Zapier. More integrations are added regularly.',
        },
        {
            id: 'item-8',
            question: 'Can I cancel or change my plan at any time?',
            answer: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time from your account settings. Changes take effect at the start of your next billing cycle.',
        },
    ]

    return (
        <section className="py-16 md:py-24">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="mx-auto max-w-xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground mt-4 text-balance">Discover quick and comprehensive answers to common questions about our platform, services, and features.</p>
                </div>

                <div className="mx-auto mt-12 max-w-xl">
                    <Accordion
                        type="single"
                        collapsible
                        className="bg-card ring-muted w-full rounded-2xl border px-8 py-3 shadow-sm ring-4 dark:ring-0">
                        {faqItems.map((item) => (
                            <AccordionItem
                                key={item.id}
                                value={item.id}
                                className="border-dashed">
                                <AccordionTrigger className="cursor-pointer text-base hover:no-underline">{item.question}</AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-base">{item.answer}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <p className="text-muted-foreground mt-6 px-8">
                        Can't find what you're looking for? Contact our{' '}
                        <Link
                            href="#"
                            className="text-primary font-medium hover:underline">
                            customer support team
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
