"use client"

import { useParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { mockPrograms } from "@/components/app/app-shell"

const ProgramDetailPage = () => {
  const params = useParams()
  const programId = params.programId as string
  const program = mockPrograms.find((p) => p.id === programId)

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4">
          <h1 className="text-lg font-semibold mb-2 mt-2">
            {program?.program || "Program"}
          </h1>
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

