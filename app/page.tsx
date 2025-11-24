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

    // Prevent direct deep links to create pages; send users to the list views instead.
    if (hashPath === "/app/library/workouts/new") {
      const targetHash = "/app/library/workouts"
      router.replace("/app/library/workouts")
      window.history.replaceState(null, "", `/#${targetHash}`)
      return
    }

    if (hashPath === "/app/library/programs/new") {
      const targetHash = "/app/library/programs"
      router.replace("/app/library/programs")
      window.history.replaceState(null, "", `/#${targetHash}`)
      return
    }

    // Support deep links like /#/app/messaging/1 where the final segment is
    // the contact ID. We navigate to the base /app/messaging route and let the
    // messaging page read the contact ID from sessionStorage or the hash.
    if (hashPath.startsWith("/app/messaging/")) {
      const segments = hashPath.split("/")
      const contactId = segments[3] || null

      if (contactId) {
        try {
          window.sessionStorage.setItem("messagingSelectedContactId", contactId)
        } catch {
          // Ignore storage errors so navigation still succeeds
        }
      }

      router.replace("/app/messaging")
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
