"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

const LibraryPage = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace("/app/library/workouts")

    if (typeof window !== "undefined") {
      const newHash = "#/app/library/workouts"
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }
  }, [router])

  return null
}

export default LibraryPage

