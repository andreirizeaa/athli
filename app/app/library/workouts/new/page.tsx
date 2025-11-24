"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Check, ChevronLeft, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import { StandardBuilder } from "./standard-builder"
import type { WorkoutProgramPayload } from "./workout-schema"
import { DiscardChangesDialog } from "./components/discard-changes-dialog"

type WorkoutMeta = {
  title: string
  description: string
  type: string
  difficulty: string
}

const CreateWorkoutPage = () => {
  const router = useRouter()
  const [workoutMeta, setWorkoutMeta] = useState<WorkoutMeta | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [saveSignal, setSaveSignal] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem("oneninety_new_workout_meta")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as WorkoutMeta
      setWorkoutMeta(parsed)
    } catch {
      // ignore invalid stored meta
    }
  }, [])

  const navigateBackToWorkouts = () => {
    router.push("/app/library/workouts")

    if (typeof window !== "undefined") {
      const newHash = "#/app/library/workouts"
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true)
      return
    }

    navigateBackToWorkouts()
  }

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false)
    setHasUnsavedChanges(false)
    navigateBackToWorkouts()
  }

  const handleSaveClick = () => {
    // Signal the builder to attempt a save; builder will handle validation and call onSaveSuccess
    setSaveSignal((prev) => prev + 1)
  }

  const handleSaveSuccess = (payload: WorkoutProgramPayload) => {
    // Styled console.log with green background
    // eslint-disable-next-line no-console
    console.log("%cWorkout payload", "background: #16a34a; color: white; padding: 4px 8px; border-radius: 4px;")
    // eslint-disable-next-line no-console
    console.log(payload)

    toast.success(`Push workout "${payload.title}" has been saved`, {
      style: {
        background: "rgb(220 252 231)",
        color: "rgb(20 83 45)",
        border: "1px solid rgb(187 247 208)",
      },
    })

    setHasUnsavedChanges(false)
    navigateBackToWorkouts()
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8"
              aria-label="Back to workouts"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h1 className="text-[22px] font-semibold truncate">
              New workout
            </h1>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="secondary"
              onClick={handleCancel}
              className="gap-2"
              aria-label="Cancel creating workout"
            >
              <X className="size-4" />
              <span>Cancel</span>
            </Button>
            <ButtonGroupSeparator />
            <Button
              onClick={handleSaveClick}
              className="gap-2"
              aria-label="Save workout"
            >
              <Check className="size-4" />
              <span>Save</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto bg-sidebar">
        <StandardBuilder
          meta={workoutMeta}
          onDirtyChange={() => setHasUnsavedChanges(true)}
          saveSignal={saveSignal}
          onSaveSuccess={handleSaveSuccess}
        />
      </div>
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  )
}

export default CreateWorkoutPage

