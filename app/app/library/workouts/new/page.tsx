"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const NewWorkoutRedirectPage = () => {
  const router = useRouter()

  useEffect(() => {
    router.push("/app/library/workouts")

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

export default NewWorkoutRedirectPage
