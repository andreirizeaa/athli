"use client"

import { useParams, useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { mockPrograms } from "@/components/app/app-shell"

const ProgramDetailPage = () => {
  const router = useRouter()
  const params = useParams()
  const programId = params.programId as string
  const program = mockPrograms.find((p) => p.id === programId)

  const handleBackToPrograms = () => {
    router.push("/app/library/programs")

    if (typeof window !== "undefined") {
      const newHash = "#/app/library/programs"
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleBackToPrograms}
              className="h-8 w-8"
              aria-label="Back to programs"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h1 className="text-[22px] font-semibold truncate">
            {program?.program || "Program"}
          </h1>
          </div>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4">
        {/* Program detail content */}
      </div>
    </div>
  )
}

export default ProgramDetailPage

