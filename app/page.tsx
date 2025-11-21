'use client'

import { SignInButton, UserButton } from '@clerk/nextjs'
import { Authenticated, Unauthenticated } from 'convex/react'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useTranslations } from 'next-intl'
import HeroSection from '@/components/hero-section'
import Features from '@/components/features-4'
import Footer from '@/components/footer'
import FAQsTwo from '@/components/faqs-2'

export default function Home() {
  return (
    <>
      <HeroSection />
      <Features />
      <FAQsTwo />
      <Footer />
    </>
  )
}

function Content() {
  const t = useTranslations('home')
  const messages = useQuery(api.messages.getForCurrentUser)

  return (
    <div>
      {t('authenticatedContent')}: {messages?.length}
    </div>
  )
}
