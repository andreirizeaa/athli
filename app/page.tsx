'use client'

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

import HeroSection from "@/components/hero-section"
import Features from "@/components/features-4"
import Footer from "@/components/footer"
import FAQsTwo from "@/components/faqs-2"
import Pricing from "@/components/pricing"
import { hashPathToRoutePath } from "@/lib/hash-routing"

export default function Home() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return
    }

    if (typeof window === "undefined") {
      return
    }

    const hashPath = window.location.hash.slice(1)

    // If hash is exactly /app, redirect to /app/home
    if (hashPath === "/app") {
      router.replace("/app/home")
      return
    }

    const routePath = hashPathToRoutePath(hashPath)

    if (routePath) {
      router.replace(routePath)
    }
  }, [isLoaded, isSignedIn, router])

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
