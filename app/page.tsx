'use client'

import HeroSection from '@/components/hero-section'
import Features from '@/components/features-4'
import Footer from '@/components/footer'
import FAQsTwo from '@/components/faqs-2'
import Pricing from '@/components/pricing'

export default function Home() {
  return (
    <>
      <HeroSection />
      <Features />
      <FAQsTwo />
      <Pricing />
      <Footer />
    </>
  )
}
