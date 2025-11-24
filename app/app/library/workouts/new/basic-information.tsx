"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const WORKOUT_TYPES = [
  "Weightlifting",
  "Cardio",
  "HIIT",
  "Yoga",
  "Pilates",
  "CrossFit",
  "Bodyweight",
  "Running",
  "Cycling",
  "Swimming",
  "Other",
] as const

type BasicInformationProps = {
  workoutName: string
  setWorkoutName: (value: string) => void
  workoutType: string
  setWorkoutType: (value: string) => void
  description: string
  setDescription: (value: string) => void
  nameError: string | null
  setNameError: (error: string | null) => void
  typeError: string | null
  setTypeError: (error: string | null) => void
  selectedBuilder: "standard" | "ai" | null
  setSelectedBuilder: (builder: "standard" | "ai" | null) => void
  onContinue: () => void
}

export const BasicInformation = ({
  workoutName,
  setWorkoutName,
  workoutType,
  setWorkoutType,
  description,
  setDescription,
  nameError,
  setNameError,
  typeError,
  setTypeError,
  selectedBuilder,
  setSelectedBuilder,
  onContinue,
}: BasicInformationProps) => {
  const handleStandardBuilderClick = () => {
    setSelectedBuilder("standard")
  }

  const handleAIBuilderClick = () => {
    setSelectedBuilder("ai")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full max-w-lg mx-auto">
      <Card className="w-full bg-background">
        <div className="w-full flex flex-col gap-6 px-6 py-4">
          <h2 className="text-xl font-semibold text-center">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="workout-name" className="text-sm font-medium">
                Workout Name
              </label>
              <Input
                id="workout-name"
                type="text"
                placeholder="Name..."
                value={workoutName}
                onChange={(e) => {
                  setWorkoutName(e.target.value)
                  if (nameError) {
                    setNameError(null)
                  }
                }}
                className={cn(nameError && "border-destructive aria-invalid:border-destructive")}
                aria-invalid={!!nameError}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="workout-type" className="text-sm font-medium">
                Type
              </label>
              <Select
                value={workoutType}
                onValueChange={(value) => {
                  setWorkoutType(value)
                  if (typeError) {
                    setTypeError(null)
                  }
                }}
              >
                <SelectTrigger
                  id="workout-type"
                  className={cn("w-full", typeError && "border-destructive aria-invalid:border-destructive")}
                  aria-invalid={!!typeError}
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeError && (
                <p className="text-sm text-destructive">{typeError}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="workout-description" className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Textarea
              id="workout-description"
              placeholder="Add a description for your workout..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Select how you wish to start</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleStandardBuilderClick}
                className={cn(
                  "relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left",
                  selectedBuilder === "standard"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "bg-background hover:bg-accent/30"
                )}
                aria-label="Manually build workout"
              >
                <p className="text-sm font-semibold mb-1">Standard Builder</p>
                <p className={cn(
                  "text-xs",
                  selectedBuilder === "standard" ? "text-foreground/80" : "text-muted-foreground"
                )}>
                  Manually build your workout
                </p>
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2",
                    selectedBuilder === "standard"
                      ? "border-primary bg-primary/10"
                      : "border-input bg-background"
                  )}
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      selectedBuilder === "standard" ? "bg-primary" : "bg-transparent"
                    )}
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={handleAIBuilderClick}
                className={cn(
                  "relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left",
                  selectedBuilder === "ai"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "bg-background hover:bg-accent/30"
                )}
                aria-label="Use OneNinety AI to build workout"
              >
                <p className="text-sm font-semibold mb-1">OneNinety AI</p>
                <p className={cn(
                  "text-xs",
                  selectedBuilder === "ai" ? "text-foreground/80" : "text-muted-foreground"
                )}>
                  AI Workout Builder
                </p>
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2",
                    selectedBuilder === "ai"
                      ? "border-primary bg-primary/10"
                      : "border-input bg-background"
                  )}
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      selectedBuilder === "ai" ? "bg-primary" : "bg-transparent"
                    )}
                  />
                </div>
              </button>
            </div>
          </div>
          <Button
            onClick={onContinue}
            className="w-full"
            disabled={!workoutName.trim() || !workoutType || !selectedBuilder}
          >
            Continue
          </Button>
        </div>
      </Card>
    </div>
  )
}

