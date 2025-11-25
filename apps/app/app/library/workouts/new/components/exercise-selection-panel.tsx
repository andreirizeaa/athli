"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { GripVertical, Play, Search, X } from "lucide-react"
import { Card, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { searchExercises, type Exercise } from "@/lib/exercise-search"

type ExerciseSelectionPanelProps = {
  onExerciseClick?: (exercise: Exercise) => void
  onDragStart?: (exercise: Exercise) => void
  onDragEnd?: () => void
}

export const ExerciseSelectionPanel = ({
  onExerciseClick,
  onDragStart,
  onDragEnd,
}: ExerciseSelectionPanelProps) => {
  const [searchQuery, setSearchQuery] = useState<string>("")

  const exerciseResults = useMemo(() => searchExercises(searchQuery), [searchQuery])

  const handleExerciseClick = (exercise: Exercise) => {
    if (onExerciseClick) {
      onExerciseClick(exercise)
    }
  }

  return (
    <div className="mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search for exercises.."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn("pl-9 w-full", searchQuery && "pr-9")}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {exerciseResults.slice(0, 40).map((exercise) => (
          <Card
            key={exercise.exerciseId}
            draggable
            onDragStart={() => onDragStart?.(exercise)}
            onDragEnd={onDragEnd}
            role="button"
            tabIndex={0}
            className="cursor-grab active:cursor-grabbing transition-colors hover:bg-accent overflow-hidden h-[75px] rounded-md shadow-none"
            aria-label={`Select ${exercise.name} exercise`}
          >
            <div className="flex items-center gap-2 py-2 px-3 h-full">
              <div
                className="relative w-16 h-16 flex-shrink-0 rounded cursor-pointer"
                onClick={() => handleExerciseClick(exercise)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleExerciseClick(exercise)
                  }
                }}
                aria-label={`Play video for ${exercise.name}`}
              >
                <Image
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  fill
                  className="object-cover rounded"
                />
                <div
                  className="absolute bottom-1 left-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExerciseClick(exercise)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      handleExerciseClick(exercise)
                    }
                  }}
                  aria-label={`Play video for ${exercise.name}`}
                >
                  <div className="bg-black/60 rounded-full p-1">
                    <Play className="size-3 text-white fill-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">{exercise.name}</CardTitle>
              </div>
              <GripVertical className="size-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

