"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { X, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { BasicInformation } from "./basic-information"
import { StandardBuilder } from "./standard-builder"

const TOTAL_STEPS = 3

const CreateWorkoutPage = () => {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [workoutName, setWorkoutName] = useState("")
  const [workoutType, setWorkoutType] = useState<string>("")
  const [description, setDescription] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [typeError, setTypeError] = useState<string | null>(null)
  const [selectedBuilder, setSelectedBuilder] = useState<"standard" | "ai" | null>(null)

  const handleCancel = () => {
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

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Save workout")
  }


  const handleContinue = () => {
    if (!workoutName.trim()) {
      setNameError("Workout name is required")
      return
    }
    if (!workoutType) {
      setTypeError("Workout type is required")
      return
    }
    if (!selectedBuilder) {
      return
    }
    setNameError(null)
    setTypeError(null)
    setCurrentStep(2)
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate step 1 before proceeding
      if (!workoutName.trim()) {
        setNameError("Workout name is required")
        return
      }
      if (!workoutType) {
        setTypeError("Workout type is required")
        return
      }
      setNameError(null)
      setTypeError(null)
    }
    
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    }
  }

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === TOTAL_STEPS

  const canProceedFromCurrentStep = () => {
    if (currentStep === 1) {
      return workoutName.trim() !== "" && workoutType.length > 0 && selectedBuilder !== null
    }
    // Add validation for other steps as needed
    return true
  }


  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-lg font-semibold flex-1 min-w-0 truncate pr-4">
            {workoutName.trim() ? `New workout: ${workoutName}` : "New workout"}
          </h1>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
            {/* Step Navigation */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousStep}
                disabled={isFirstStep}
                className="h-8 w-8"
                aria-label="Previous step"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Step {currentStep} of {TOTAL_STEPS}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>
                    {currentStep === 1 && "Basic Information"}
                    {currentStep === 2 && "Exercises"}
                    {currentStep === 3 && "Review"}
                  </span>
                </div>
                <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-800 dark:bg-primary transition-all duration-300"
                    style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextStep}
                disabled={isLastStep || !canProceedFromCurrentStep()}
                className="h-8 w-8"
                aria-label="Next step"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
              onClick={handleSave}
              className="gap-2 bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-800 dark:hover:bg-gray-100"
              aria-label="Save workout"
            >
              <Check className="size-4" />
              <span>Save</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className={cn("w-full flex-1 overflow-auto bg-sidebar", currentStep === 2 ? "" : "px-4 py-4")}>
        {currentStep === 1 && (
          <BasicInformation
            workoutName={workoutName}
            setWorkoutName={setWorkoutName}
            workoutType={workoutType}
            setWorkoutType={setWorkoutType}
            description={description}
            setDescription={setDescription}
            nameError={nameError}
            setNameError={setNameError}
            typeError={typeError}
            setTypeError={setTypeError}
            selectedBuilder={selectedBuilder}
            setSelectedBuilder={setSelectedBuilder}
            onContinue={handleContinue}
          />
        )}
        {currentStep === 2 && (
          <StandardBuilder />
        )}
        {currentStep > 2 && (
          <div className="flex items-center justify-center min-h-full">
            <p className="text-muted-foreground">Step {currentStep} content coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateWorkoutPage

