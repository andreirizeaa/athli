"use client"

import { useEffect, useState, useMemo } from "react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Image from "next/image"
import { Dumbbell, GripVertical, Info, Link2, Link2Off, NotebookPen, Play, Plus, Timer, Trash2, Search, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { searchExercises, type Exercise } from "@/lib/exercise-search"
import { ExerciseCard } from "./components/exercise-card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ExerciseWithSuperset = Exercise & {
  supersetGroupId?: string | null
}

type WorkoutSchema = {
  sections: Array<{
    id: string
    type: "regular" | "amrap" | "timed"
    exercises?: ExerciseWithSuperset[]
    roundDurationSec?: number
    targetRounds?: number
    roundExercises?: Array<unknown>
  }>
}

type ActiveOverviewItem =
  | {
      type: "section"
      sectionId: string
    }
  | {
      type: "exerciseGroup"
      sectionId: string
      startIndex: number
      length: number
    }

type OverviewSectionCardProps = {
  section: WorkoutSchema["sections"][number]
  children: React.ReactNode
}

const OverviewSectionCard = ({ section, children }: OverviewSectionCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${section.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          "border rounded-lg bg-card/80 shadow-sm mb-2 select-none",
          isDragging && "opacity-80"
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.type}{" "}
            <span className="font-normal">
              ({section.exercises ? section.exercises.length : 0})
            </span>
          </div>
          <button
            type="button"
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -mr-1 rounded select-none text-muted-foreground hover:text-foreground"
            aria-label="Reorder section"
          >
            <GripVertical className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

type OverviewExerciseRowProps = {
  sectionId: string
  exercise: ExerciseWithSuperset
  isLinkedToPrev: boolean
  isLinkedToNext: boolean
}

const OverviewExerciseRow = ({
  sectionId,
  exercise,
  isLinkedToPrev,
  isLinkedToNext,
}: OverviewExerciseRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `exercise-|${sectionId}|${exercise.exerciseId}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        {...listeners}
        className={cn(
          "flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs select-none cursor-grab active:cursor-grabbing",
          isLinkedToPrev && "rounded-t-none border-t-0",
          isLinkedToNext && "rounded-b-none border-b-0",
          isDragging && "opacity-80 shadow-sm"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span className="text-xs">
            {exercise.name || "Untitled exercise"}
          </span>
        </div>
        <GripVertical className="size-3 text-muted-foreground" />
      </div>

      {/* Superset visual link */}
      {isLinkedToNext && (
        <div className="flex items-center justify-end px-3">
          <div className="flex-1 h-px bg-border mr-1" />
          <Link2 className="size-3 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export const StandardBuilder = () => {
  const [workoutSchema, setWorkoutSchema] = useState<WorkoutSchema>({
    sections: [
      {
        id: `sec_regular_${Date.now()}`,
        type: "regular",
        exercises: [],
      },
    ],
  })
  const [builderMode, setBuilderMode] = useState<"exercise" | "section">(
    "exercise"
  )
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{
    sectionId: string
    slotIndex: number
  } | null>(null)
  // DnD Kit state for overview panel
  const [activeOverviewItem, setActiveOverviewItem] = useState<ActiveOverviewItem | null>(null)

  const exerciseResults = useMemo(() => {
    return searchExercises(searchQuery)
  }, [searchQuery])

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setIsVideoModalOpen(true)
  }

  useEffect(() => {
    console.log("Workout Schema:", JSON.stringify(workoutSchema, null, 2))
  }, [workoutSchema])

  const handleSectionSelect = (type: "regular" | "amrap" | "timed") => {
    const newSection = {
      id: `sec_${type}_${Date.now()}`,
      type,
      ...(type === "regular" && { exercises: [] }),
      ...(type === "amrap" && { roundExercises: [] }),
      ...(type === "timed" && { roundExercises: [] }),
    }

    setWorkoutSchema((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }))
  }

  const handleKeyDown = (
    e: React.KeyboardEvent,
    type: "regular" | "amrap" | "timed"
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleSectionSelect(type)
    }
  }

  const handleDeleteSection = (sectionId: string) => {
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }))
  }

  const handleDeleteKeyDown = (
    e: React.KeyboardEvent,
    sectionId: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleDeleteSection(sectionId)
    }
  }

  const getSectionDescription = (type: "regular" | "amrap" | "timed"): string => {
    switch (type) {
      case "regular":
        return "Exercise for exercise. Follow the sets and reps specified."
      case "amrap":
        return "Track the total amount of rounds completed in the allocated time."
      case "timed":
        return "Track total duration until completion of assigned rounds."
      default:
        return ""
    }
  }

  const handleDragStart = (exercise: Exercise) => {
    setDraggedExercise(exercise)
  }

  const handleDragEnd = () => {
    setDraggedExercise(null)
    setDragOverSectionId(null)
    setDragOverSlot(null)
  }

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    setDragOverSectionId(sectionId)
  }

  const handleDragLeave = () => {
    setDragOverSectionId(null)
  }

  // Fallback drop handler used for empty sections or when no specific slot is active.
  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    if (draggedExercise) {
      setWorkoutSchema((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id === sectionId) {
            const exercises = section.exercises || []
            const exerciseWithSuperset: ExerciseWithSuperset = {
              ...draggedExercise,
              supersetGroupId: null,
            }
            return {
              ...section,
              exercises: [...exercises, exerciseWithSuperset],
            }
          }
          return section
        }),
      }))
    }
    setDraggedExercise(null)
    setDragOverSectionId(null)
    setDragOverSlot(null)
  }

  // Higher-level drop handler for the whole section content.
  // If the user drops over the general area (not directly on a slot),
  // use the last active slot as the insertion point so the order matches
  // where they released the drag.
  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()

    if (dragOverSlot && dragOverSlot.sectionId === sectionId) {
      // Delegate to slot-based drop so we respect the intended index.
      handleSlotDrop(e, sectionId, dragOverSlot.slotIndex)
      return
    }

    // Fallback: no slot was active, so append to the end of the section.
    handleDrop(e, sectionId)
  }

  const handleAddExercise = (sectionId: string) => {
    const emptyExercise: ExerciseWithSuperset = {
      exerciseId: `empty_${Date.now()}`,
      name: "",
      imageUrl: "",
      videoUrl: "",
      equipments: [],
      bodyParts: [],
      exerciseType: "weight_reps",
      targetMuscles: [],
      secondaryMuscles: [],
      keywords: [],
      overview: "",
      instructions: [],
      exerciseTips: [],
      variations: [],
      relatedExerciseIds: [],
      supersetGroupId: null,
    }

    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          return {
            ...section,
            exercises: [...section.exercises, emptyExercise],
          }
        }
        return section
      }),
    }))
  }

  const handleSlotDragOver = (
    e: React.DragEvent,
    sectionId: string,
    slotIndex: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedExercise) return
    setDragOverSlot({ sectionId, slotIndex })
  }

  const handleSlotDragLeave = (_e: React.DragEvent) => {
    // Intentionally no-op to avoid flicker when moving within the slot.
  }

  const handleSlotDrop = (
    e: React.DragEvent,
    sectionId: string,
    slotIndex: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedExercise) return

    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section

        const exercises = section.exercises || []
        const exerciseWithSuperset: ExerciseWithSuperset = {
          ...draggedExercise,
          supersetGroupId: null,
        }

        const updatedExercises = [...exercises]
        const safeIndex = Math.min(Math.max(slotIndex, 0), updatedExercises.length)
        updatedExercises.splice(safeIndex, 0, exerciseWithSuperset)

        return {
          ...section,
          exercises: updatedExercises,
        }
      }),
    }))

    setDraggedExercise(null)
    setDragOverSectionId(null)
    setDragOverSlot(null)
  }

  // DnD – overview handlers
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleOverviewDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = active.id as string

    if (activeId.startsWith("section-")) {
      const sectionId = activeId.replace("section-", "")
      setActiveOverviewItem({ type: "section", sectionId })
      return
    }

    if (activeId.startsWith("exercise-")) {
      const [, sectionId, exerciseId] = activeId.split("|")
      const section = workoutSchema.sections.find((s) => s.id === sectionId)
      if (!section || !section.exercises) {
        return
      }

      const exercises = section.exercises
      const centerIndex = exercises.findIndex((ex) => ex.exerciseId === exerciseId)
      if (centerIndex === -1) {
        return
      }

      const groupId = exercises[centerIndex].supersetGroupId
      let startIndex = centerIndex
      let endIndex = centerIndex

      if (groupId) {
        // Extend upwards to include entire contiguous superset chain
        while (
          startIndex > 0 &&
          exercises[startIndex - 1].supersetGroupId === groupId
        ) {
          startIndex -= 1
        }

        // Extend downwards to include entire contiguous superset chain
        while (
          endIndex < exercises.length - 1 &&
          exercises[endIndex + 1].supersetGroupId === groupId
        ) {
          endIndex += 1
        }
      }

      setActiveOverviewItem({
        type: "exerciseGroup",
        sectionId,
        startIndex,
        length: endIndex - startIndex + 1,
      })
    }
  }

  const handleOverviewDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || !activeOverviewItem) {
      setActiveOverviewItem(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Reorder sections
    if (activeOverviewItem.type === "section") {
      if (!overId.startsWith("section-")) {
        setActiveOverviewItem(null)
        return
      }

      const activeSectionId = activeOverviewItem.sectionId
      const overSectionId = overId.replace("section-", "")

      if (activeSectionId === overSectionId) {
        setActiveOverviewItem(null)
        return
      }

      setWorkoutSchema((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s.id === activeSectionId)
        const newIndex = prev.sections.findIndex((s) => s.id === overSectionId)
        if (oldIndex === -1 || newIndex === -1) return prev

        return {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        }
      })

      setActiveOverviewItem(null)
      return
    }

    // Reorder / move exercise groups (including supersets)
    if (activeOverviewItem.type === "exerciseGroup") {
      // overId can be either a section container or another exercise
      let targetSectionId = activeOverviewItem.sectionId
      let targetExerciseId: string | null = null

      if (overId.startsWith("section-")) {
        targetSectionId = overId.replace("section-", "")
      } else if (overId.startsWith("exercise-")) {
        const [, sectionId, exerciseId] = overId.split("|")
        targetSectionId = sectionId
        targetExerciseId = exerciseId
      }

      const sourceSectionId = activeOverviewItem.sectionId
      const { startIndex, length } = activeOverviewItem

      setWorkoutSchema((prev) => {
        const sections = [...prev.sections]
        const sourceSectionIndex = sections.findIndex((s) => s.id === sourceSectionId)
        const targetSectionIndex = sections.findIndex((s) => s.id === targetSectionId)
        if (sourceSectionIndex === -1 || targetSectionIndex === -1) return prev

        const sourceSection = sections[sourceSectionIndex]
        const targetSection = sections[targetSectionIndex]
        if (!sourceSection.exercises) return prev

        const sourceExercises = [...sourceSection.exercises]

        // Guard: if group indices are out of bounds, do nothing
        if (
          startIndex < 0 ||
          startIndex >= sourceExercises.length ||
          startIndex + length > sourceExercises.length
        ) {
          return prev
        }

        const groupExercises = sourceExercises.slice(startIndex, startIndex + length)
        const groupExerciseIds = new Set(groupExercises.map((ex) => ex.exerciseId))

        // Remove the entire group from the source section
        sourceExercises.splice(startIndex, length)

        // If dropping on one of the group's own exercises, treat as no-op
        if (targetExerciseId && groupExerciseIds.has(targetExerciseId)) {
          sections[sourceSectionIndex] = {
            ...sourceSection,
            exercises: sourceExercises,
          }

          return {
            ...prev,
            sections,
          }
        }

        // Determine insertion target exercises
        let targetExercises = [...(targetSection.exercises || [])]
        let toIndex = targetExercises.length

        if (targetExerciseId) {
          const existingIndex = targetExercises.findIndex(
            (ex) => ex.exerciseId === targetExerciseId
          )
          if (existingIndex !== -1) {
            toIndex = existingIndex
          }
        }

        if (sourceSectionId === targetSectionId) {
          // Reorder within same section
          targetExercises = [...sourceExercises]

          // Find updated insertion index after removal
          if (targetExerciseId) {
            const existingIndex = targetExercises.findIndex(
              (ex) => ex.exerciseId === targetExerciseId
            )
            if (existingIndex !== -1) {
              toIndex = existingIndex
            } else {
              toIndex = targetExercises.length
            }
          } else {
            toIndex = targetExercises.length
          }

          targetExercises.splice(toIndex, 0, ...groupExercises)

          sections[sourceSectionIndex] = {
            ...sourceSection,
            exercises: targetExercises,
          }
        } else {
          // Move across sections
          targetExercises.splice(toIndex, 0, ...groupExercises)

          sections[sourceSectionIndex] = {
            ...sourceSection,
            exercises: sourceExercises,
          }
          sections[targetSectionIndex] = {
            ...targetSection,
            exercises: targetExercises,
          }
        }

        return {
          ...prev,
          sections,
        }
      })
    }

    setActiveOverviewItem(null)
  }

  const handleSupersetLink = (sectionId: string, exerciseIndex: number) => {
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          const exercises = [...section.exercises]
          const currentExercise = exercises[exerciseIndex]
          const nextExercise = exercises[exerciseIndex + 1]

          if (currentExercise && nextExercise) {
            // Determine the contiguous block we are (or will be) linking
            let start = exerciseIndex
            let end = exerciseIndex + 1

            // Extend upwards while part of any existing superset chain
            while (start > 0 && exercises[start - 1].supersetGroupId) {
              start -= 1
            }

            // Extend downwards while part of any existing superset chain
            while (end < exercises.length - 1 && exercises[end + 1].supersetGroupId) {
              end += 1
            }

            // Use an existing group id if present, otherwise create a new one
            const existingGroupId =
              currentExercise.supersetGroupId ||
              nextExercise.supersetGroupId ||
              exercises[start].supersetGroupId ||
              exercises[end].supersetGroupId

            const supersetGroupId =
              existingGroupId || `superset_${sectionId}_${exerciseIndex}_${Date.now()}`

            // Assign the same supersetGroupId to the entire contiguous block
            for (let i = start; i <= end; i += 1) {
              exercises[i] = {
                ...exercises[i],
                supersetGroupId,
              }
            }
          }

          return {
            ...section,
            exercises,
          }
        }
        return section
      }),
    }))
  }

  const handleSupersetUnlink = (sectionId: string, exerciseIndex: number) => {
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          const exercises = [...section.exercises]
          const currentExercise = exercises[exerciseIndex]
          const nextExercise = exercises[exerciseIndex + 1]

          if (
            currentExercise &&
            nextExercise &&
            currentExercise.supersetGroupId &&
            currentExercise.supersetGroupId === nextExercise.supersetGroupId
          ) {
            const groupId = currentExercise.supersetGroupId

            // We want to break the chain only at the selected boundary:
            // - Keep the chain above exerciseIndex as one superset group
            // - Keep the chain below exerciseIndex+1 as a separate superset group (if 2+ cards)

            // Find contiguous segment ABOVE including exerciseIndex that belongs to this group
            let upperStart = exerciseIndex
            while (upperStart > 0 && exercises[upperStart - 1].supersetGroupId === groupId) {
              upperStart -= 1
            }
            const upperEnd = exerciseIndex

            // Find contiguous segment BELOW starting at exerciseIndex + 1 that belongs to this group
            let lowerStart = exerciseIndex + 1
            let lowerEnd = lowerStart
            while (
              lowerEnd < exercises.length - 1 &&
              exercises[lowerEnd + 1].supersetGroupId === groupId
            ) {
              lowerEnd += 1
            }

            // Upper segment stays with the original groupId (no change needed)

            // Lower segment becomes either a new superset group (if at least 2 exercises)
            // or is fully unlinked if it's only a single exercise.
            const lowerLength = lowerEnd - lowerStart + 1
            const newGroupId =
              lowerLength >= 2 ? `superset_${sectionId}_${lowerStart}_${Date.now()}` : null

            for (let i = lowerStart; i <= lowerEnd; i += 1) {
              exercises[i] = {
                ...exercises[i],
                supersetGroupId: newGroupId,
              }
            }
          }

          return {
            ...section,
            exercises,
          }
        }
        return section
      }),
    }))
  }

  return (
    <div className="flex h-full">
      <div className="flex-[1.5] bg-background h-full overflow-y-auto">
        <div className="p-4">
          <h2 className="text-left">Standard builder</h2>
        <div className="mt-4">
          <Tabs
            value={builderMode}
            onValueChange={(value) => {
              if (value) setBuilderMode(value as "exercise" | "section")
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger
                value="exercise"
                disabled={workoutSchema.sections.length === 0}
                className="flex-1 data-[state=active]:bg-neutral-800 data-[state=active]:text-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
              >
                Exercise
              </TabsTrigger>
              <TabsTrigger
                value="section"
                className="flex-1 data-[state=active]:bg-neutral-800 data-[state=active]:text-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
              >
                Section
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {builderMode === "exercise" && (
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
          </div>
        )}
        {builderMode === "section" ? (
          <div className="mt-4 flex flex-col gap-4">
              <Card
                role="button"
                tabIndex={0}
                onClick={() => handleSectionSelect("regular")}
                onKeyDown={(e) => handleKeyDown(e, "regular")}
                className="cursor-pointer transition-colors hover:bg-accent"
                aria-label="Select Regular section type"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="size-4 text-foreground" />
                    Regular
                  </CardTitle>
                  <CardDescription>
                    Exercise for exercise. Follow the sets and reps specified.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                onClick={() => handleSectionSelect("amrap")}
                onKeyDown={(e) => handleKeyDown(e, "amrap")}
                className="cursor-pointer transition-colors hover:bg-accent"
                aria-label="Select AMRAP section type"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <NotebookPen className="size-4 text-foreground" />
                    AMRAP
                  </CardTitle>
                  <CardDescription>
                    Track the total amount of rounds completed in the allocated
                    time.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                onClick={() => handleSectionSelect("timed")}
                onKeyDown={(e) => handleKeyDown(e, "timed")}
                className="cursor-pointer transition-colors hover:bg-accent"
                aria-label="Select Timed section type"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="size-4 text-foreground" />
                    Timed
                  </CardTitle>
                  <CardDescription>
                    Track total duration until completion of assigned rounds.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              {exerciseResults.slice(0, 40).map((exercise) => (
                <Card
                  key={exercise.exerciseId}
                  draggable
                  onDragStart={() => handleDragStart(exercise)}
                  onDragEnd={handleDragEnd}
                  role="button"
                  tabIndex={0}
                  className="cursor-grab active:cursor-grabbing transition-colors hover:bg-accent overflow-hidden"
                  aria-label={`Select ${exercise.name} exercise`}
                >
                  <div 
                    className="relative w-full aspect-video cursor-pointer"
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
                      className="object-cover"
                    />
                    <div 
                      className="absolute top-2 left-2 cursor-pointer"
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
                  <div className="px-3">
                    <CardTitle className="text-sm font-medium">{exercise.name}</CardTitle>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
      <Separator orientation="vertical" />
      <div className="flex-[4] p-4 h-full overflow-y-auto">
        {workoutSchema.sections.length > 0 ? (
          <div className="flex flex-col gap-6 w-full">
            {workoutSchema.sections.map((section) => (
              <div
                key={section.id}
                className="relative flex w-full items-stretch min-h-[300px] flex-shrink-0"
              >
                <Card className="bg-card w-full flex flex-col relative min-h-[300px]">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    className="absolute -top-2 -right-2 rounded-full z-10 bg-[oklch(0.704_0.191_22.216)] dark:bg-[oklch(0.704_0.191_22.216)] hover:bg-[oklch(0.55_0.22_22.216)] dark:hover:bg-[oklch(0.55_0.22_22.216)]"
                    onClick={() => handleDeleteSection(section.id)}
                    onKeyDown={(e) => handleDeleteKeyDown(e, section.id)}
                    aria-label={`Delete ${section.type} section`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <CardHeader>
                    <CardTitle className="capitalize flex items-center gap-2">
                      {section.type}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-4 text-foreground translate-y-[1px]" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {getSectionDescription(section.type)}
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                  </CardHeader>
                  <CardContent 
                    className={cn(
                      "flex-1 flex p-6",
                      section.exercises && section.exercises.length > 0 
                        ? "items-start justify-start pt-4" 
                        : "items-center justify-center"
                    )}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleSectionDrop(e, section.id)}
                  >
                    {section.exercises && section.exercises.length > 0 ? (
                      <div className="w-full flex flex-col gap-0">
                        {/* Slot before the first exercise */}
                        <div
                          onDragOver={(e) => handleSlotDragOver(e, section.id, 0)}
                          onDragLeave={handleSlotDragLeave}
                          onDrop={(e) => handleSlotDrop(e, section.id, 0)}
                          className={cn(
                            "transition-all w-full",
                            draggedExercise &&
                              dragOverSlot &&
                              dragOverSlot.sectionId === section.id &&
                              dragOverSlot.slotIndex === 0
                              ? "my-1 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm"
                              : "h-1"
                          )}
                        >
                          {draggedExercise &&
                            dragOverSlot &&
                            dragOverSlot.sectionId === section.id &&
                            dragOverSlot.slotIndex === 0 && (
                              <span>Drop your exercise here</span>
                            )}
                        </div>

                        {section.exercises.map((exercise, exerciseIndex) => {
                          const nextExercise = section.exercises?.[exerciseIndex + 1]
                          const prevExercise =
                            exerciseIndex > 0 ? section.exercises?.[exerciseIndex - 1] : null

                          const isLinkedToNext =
                            !!(
                              exercise.supersetGroupId &&
                              nextExercise?.supersetGroupId === exercise.supersetGroupId
                            )

                          const isLinkedToPrev =
                            !!(
                              exercise.supersetGroupId &&
                              prevExercise?.supersetGroupId === exercise.supersetGroupId
                            )

                          const wrapperClasses = cn(
                            "flex flex-col",
                            isLinkedToNext ? "gap-0" : "gap-2",
                            exerciseIndex === 0
                              ? ""
                              : isLinkedToPrev
                                ? "-mt-px"
                                : isLinkedToNext
                                  ? "mt-0"
                                  : "mt-1"
                          )

                          return (
                            <div key={exercise.exerciseId} className={wrapperClasses}>
                              <ExerciseCard
                                exercise={exercise}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                onVideoClick={handleExerciseClick}
                                onExerciseChange={(newExercise) => {
                                  setWorkoutSchema((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((sec) => {
                                      if (sec.id === section.id && sec.exercises) {
                                        const updatedExercises: ExerciseWithSuperset[] = [
                                          ...sec.exercises,
                                        ]
                                        updatedExercises[exerciseIndex] = {
                                          ...(newExercise as ExerciseWithSuperset),
                                          supersetGroupId: exercise.supersetGroupId,
                                        }
                                        return {
                                          ...sec,
                                          exercises: updatedExercises,
                                        }
                                      }
                                      return sec
                                    }),
                                  }))
                                }}
                                onDelete={() => {
                                  setWorkoutSchema((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((sec) => {
                                      if (sec.id === section.id && sec.exercises) {
                                        const updatedExercises = sec.exercises.filter(
                                          (_, idx) => idx !== exerciseIndex
                                        )
                                        return {
                                          ...sec,
                                          exercises: updatedExercises,
                                        }
                                      }
                                      return sec
                                    }),
                                  }))
                                }}
                              />

                              {/* Slot between this exercise and the next */}
                              <div
                                onDragOver={(e) =>
                                  handleSlotDragOver(e, section.id, exerciseIndex + 1)
                                }
                                onDragLeave={handleSlotDragLeave}
                                onDrop={(e) => handleSlotDrop(e, section.id, exerciseIndex + 1)}
                                className={cn(
                                  "transition-all w-full",
                                  draggedExercise &&
                                    dragOverSlot &&
                                    dragOverSlot.sectionId === section.id &&
                                    dragOverSlot.slotIndex === exerciseIndex + 1
                                    ? "my-1 min-h-14 border-2 border-dashed border-primary bg-primary/5 rounded-lg flex items-center justify-center text-primary text-sm"
                                    : isLinkedToNext
                                      ? "h-0"
                                      : "h-1"
                                )}
                              >
                                {draggedExercise &&
                                  dragOverSlot &&
                                  dragOverSlot.sectionId === section.id &&
                                  dragOverSlot.slotIndex === exerciseIndex + 1 && (
                                    <span>Drop your exercise here</span>
                                  )}
                              </div>
                              {section.exercises && exerciseIndex < section.exercises.length - 1 && (
                                <>
                                  {isLinkedToNext ? (
                                    <div className="relative flex items-center justify-center bg-background border-x py-1">
                                      <Separator className="absolute w-full" />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-background z-10"
                                        onClick={() => handleSupersetUnlink(section.id, exerciseIndex)}
                                      >
                                        <Link2Off className="size-4" />
                                        Unlink
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center mt-1 mb-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => handleSupersetLink(section.id, exerciseIndex)}
                                      >
                                        <Link2 className="size-4" />
                                        Superset
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                        <div className="flex justify-center mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleAddExercise(section.id)}
                            className="gap-2"
                          >
                            <Plus className="size-4" />
                            Add Exercise
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          "flex items-center justify-center w-full h-full border-2 border-dashed rounded-lg transition-colors",
                          dragOverSectionId === section.id
                            ? "border-primary bg-primary/5"
                            : "border-muted"
                        )}
                      >
                        <p className="text-muted-foreground text-sm text-center">
                          Drag exercises from<br />the left to add
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
            <div className="flex items-center justify-center py-2 mb-[100px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    aria-label="Add new section"
                  >
                    <Plus className="size-4" />
                    <span>Add section</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleSectionSelect("regular")}>
                    <Dumbbell className="mr-2 size-4 text-foreground" />
                    Regular
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSectionSelect("amrap")}>
                    <NotebookPen className="mr-2 size-4 text-foreground" />
                    AMRAP
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSectionSelect("timed")}>
                    <Timer className="mr-2 size-4 text-foreground" />
                    Timed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="h-[300px] flex-shrink-0" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-muted-foreground text-center">
              Add your first section to start building your workout.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  aria-label="Add new section"
                >
                  <Plus className="size-4" />
                  <span>Add section</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => handleSectionSelect("regular")}>
                  <Dumbbell className="mr-2 size-4 text-foreground" />
                  Regular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSectionSelect("amrap")}>
                  <NotebookPen className="mr-2 size-4 text-foreground" />
                  AMRAP
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSectionSelect("timed")}>
                  <Timer className="mr-2 size-4 text-foreground" />
                  Timed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <Separator orientation="vertical" />
      <div className="flex-[1.5] bg-background h-full overflow-y-auto">
        <div className="p-4">
          <h2 className="text-left mb-3">Overview</h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleOverviewDragStart}
            onDragEnd={handleOverviewDragEnd}
          >
            <SortableContext
              items={workoutSchema.sections.map((section) => `section-${section.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3">
                {workoutSchema.sections.length > 0 ? (
                  workoutSchema.sections.map((section) => (
                    <OverviewSectionCard key={section.id} section={section}>
                      <div className="p-2 flex flex-col gap-1">
                        {section.exercises && section.exercises.length > 0 ? (
                          <SortableContext
                            items={section.exercises.map(
                              (exercise) => `exercise-|${section.id}|${exercise.exerciseId}`
                            )}
                            strategy={verticalListSortingStrategy}
                          >
                            {section.exercises.map((exercise, exerciseIndex) => {
                            const nextExercise =
                              section.exercises?.[exerciseIndex + 1]
                            const prevExercise =
                              exerciseIndex > 0
                                ? section.exercises?.[exerciseIndex - 1]
                                : null

                              const isLinkedToNext =
                                !!(
                                  exercise.supersetGroupId &&
                                  nextExercise?.supersetGroupId ===
                                    exercise.supersetGroupId
                                )
                              const isLinkedToPrev =
                                !!(
                                  exercise.supersetGroupId &&
                                  prevExercise?.supersetGroupId ===
                                    exercise.supersetGroupId
                                )

                              return (
                                <OverviewExerciseRow
                                  key={exercise.exerciseId}
                                  sectionId={section.id}
                                  exercise={exercise}
                                  isLinkedToPrev={isLinkedToPrev}
                                  isLinkedToNext={isLinkedToNext}
                                />
                              )
                            })}
                          </SortableContext>
                        ) : (
                          <div
                            className={cn(
                              "text-xs text-muted-foreground px-1 py-2 border-2 border-dashed border-transparent rounded transition-all",
                              "border-primary/30 bg-primary/5 text-muted-foreground"
                            )}
                          >
                            No exercises yet.
                          </div>
                        )}
                      </div>
                    </OverviewSectionCard>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sections will appear here once created.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="w-full max-w-4xl flex flex-col" showCloseButton={false}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">
                {selectedExercise?.name}
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          {selectedExercise && (
            <div className="mt-4 w-full aspect-video">
              <video
                src={selectedExercise.videoUrl}
                controls
                autoPlay
                className="w-full h-full rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

