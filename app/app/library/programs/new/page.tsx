"use client"

import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { X, Check } from "lucide-react"

const CreateProgramPage = () => {
  const router = useRouter()

  const handleCancel = () => {
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

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Save program")
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-lg font-semibold">
            Create a program
          </h1>
          <ButtonGroup>
            <Button
              variant="secondary"
              onClick={handleCancel}
              className="gap-2"
              aria-label="Cancel creating program"
            >
              <X className="size-4" />
              <span>Cancel</span>
            </Button>
            <ButtonGroupSeparator />
            <Button
              onClick={handleSave}
              className="gap-2 bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-800 dark:hover:bg-gray-100"
              aria-label="Save program"
            >
              <Check className="size-4" />
              <span>Save</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 bg-sidebar">
        {/* Create program form content */}
      </div>
    </div>
  )
}

export default CreateProgramPage

