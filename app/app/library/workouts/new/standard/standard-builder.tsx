"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { searchExercises, type Exercise } from "@/lib/exercise-search"
import { toast } from "sonner"
import type {
  ExerciseGroupPayload,
  ExerciseType,
  RegularExercisePayload,
  RoundExercisePayload,
  SetPayload,
  WorkoutProgramPayload,
  WorkoutSectionPayload,
} from "../workout-schema"
import type { SetData } from "../components/exercise-card"
import { ExerciseCard } from "../components/exercise-card"
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
  instanceId: string
  sets?: SetData[]
}

type WorkoutSchema = {
  sections: Array<{
    id: string
    type: "regular" | "amrap" | "timed"
    exercises?: ExerciseWithSuperset[]
    roundDurationSec?: number
    targetRounds?: number
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

type WorkoutMeta = {
  title: string
  description: string
  type: string
  difficulty: string
}

type StandardBuilderProps = {
  meta: WorkoutMeta | null
  onDirtyChange?: () => void
  saveSignal?: number
  onSaveSuccess?: (payload: WorkoutProgramPayload) => void
}

// Helper used only for payload building – groups consecutive exercises that share a superset id
const groupExercisesBySupersetForPayload = (exercises: ExerciseWithSuperset[]) => {
  const groups: Array<ExerciseWithSuperset[]> = []
  let currentGroup: ExerciseWithSuperset[] = []
  let currentGroupId: string | null = null

  exercises.forEach((exercise) => {
    if (exercise.supersetGroupId) {
      if (exercise.supersetGroupId === currentGroupId) {
        currentGroup.push(exercise)
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
        }
        currentGroup = [exercise]
        currentGroupId = exercise.supersetGroupId
      }
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
        currentGroup = []
        currentGroupId = null
      }
      groups.push([exercise])
    }
  })

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

const buildWorkoutPayload = (
  workoutSchema: WorkoutSchema,
  meta: WorkoutMeta | null
): WorkoutProgramPayload | null => {
  if (!meta) {
    return null
  }

  const parseNumberOrNull = (value?: string): number | null => {
    if (!value) return null
    const n = Number(value)
    return Number.isNaN(n) ? null : n
  }

  const parseStages = (value?: string): number[] | null => {
    if (!value) return null
    const parts = value
      .split("-")
      .map((part) => Number(part.trim()))
      .filter((n) => !Number.isNaN(n))
    return parts.length > 0 ? parts : null
  }

  const mapSetDataToPayload = (set: SetData): SetPayload => {
    const isDropset = set.type === "dropset"

    if (isDropset) {
      const weightStages = parseStages(set.weight)
      const repStages = parseStages(set.reps)

      return {
        setNumber: set.setNumber,
        isDropset: true,
        weight: null,
        reps: null,
        distance: parseNumberOrNull(set.distance),
        durationSec: parseNumberOrNull(set.duration),
        restSec: parseNumberOrNull(set.rest),
        weightStages,
        repStages,
      }
    }

    return {
      setNumber: set.setNumber,
      isDropset: false,
      weight: parseNumberOrNull(set.weight),
      reps: parseNumberOrNull(set.reps),
      distance: parseNumberOrNull(set.distance),
      durationSec: parseNumberOrNull(set.duration),
      restSec: parseNumberOrNull(set.rest),
      weightStages: null,
      repStages: null,
    }
  }

  const sections: WorkoutSectionPayload[] = workoutSchema.sections.map((section) => {
    if (section.type === "regular") {
      const groups = groupExercisesBySupersetForPayload(section.exercises || [])

      const exercises: ExerciseGroupPayload[] = groups.map((group) => {
        const mapped = group.map<RegularExercisePayload>((exercise) => ({
          id: exercise.exerciseId,
          name: exercise.name,
          exerciseType: exercise.exerciseType as ExerciseType,
          sets: (exercise.sets || []).map(mapSetDataToPayload),
        }))

        const isSuperset = mapped.length > 1

        return {
          isSuperset,
          exercises: mapped,
        }
      })

      return {
        id: section.id,
        type: "regular",
        exercises,
      }
    }

    if (section.type === "amrap") {
      const exercises: RoundExercisePayload[] = (section.exercises || []).map(
        (exercise: any) => ({
          id: exercise.exerciseId ?? exercise.id,
          name: exercise.name,
          exerciseType: exercise.exerciseType,
          weight: exercise.weight ?? null,
          reps: exercise.reps ?? null,
          distance: exercise.distance ?? null,
          durationSec: exercise.durationSec ?? null,
          restSec: exercise.restSec ?? null,
        })
      )

      return {
        id: section.id,
        type: "amrap",
        durationSec: section.roundDurationSec || 0,
        exercises,
      }
    }

    const exercises: RoundExercisePayload[] = (section.exercises || []).map(
      (exercise: any) => ({
        id: exercise.exerciseId ?? exercise.id,
        name: exercise.name,
        exerciseType: exercise.exerciseType,
        weight: exercise.weight ?? null,
        reps: exercise.reps ?? null,
        distance: exercise.distance ?? null,
        durationSec: exercise.durationSec ?? null,
        restSec: exercise.restSec ?? null,
      })
    )

    return {
      id: section.id,
      type: "timed",
      targetRounds: section.targetRounds || 0,
      exercises,
    }
  })

  return {
    title: meta.title,
    description: meta.description,
    type: meta.type,
    difficulty: meta.difficulty,
    sections,
  }
}

type OverviewSectionCardProps = {
  section: WorkoutSchema["sections"][number]
  children: React.ReactNode
  onDelete: (sectionId: string) => void
}

const OverviewSectionCard = ({ section, children, onDelete }: OverviewSectionCardProps) => {
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
          <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.type}{" "}
            <span className="font-normal">
              ({section.exercises ? section.exercises.length : 0})
            </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(section.id)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete(section.id)
                }
              }}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label={`Delete ${section.type} section`}
              data-no-row-link="true"
            >
              <Trash2 className="size-4" />
            </button>
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
  onDelete: (sectionId: string, exerciseId: string) => void
}

const OverviewExerciseRow = ({
  sectionId,
  exercise,
  onDelete,
}: OverviewExerciseRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `exercise-|${sectionId}|${exercise.instanceId}`,
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
          isDragging && "opacity-80 shadow-sm"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span className="text-xs">
            {exercise.name || "Untitled exercise"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(sectionId, exercise.exerciseId)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                onDelete(sectionId, exercise.exerciseId)
              }
            }}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label={`Delete ${exercise.name || "exercise"}`}
            data-no-row-link="true"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
        <GripVertical className="size-3 text-muted-foreground" />
      </div>
    </div>
  )
}

type OverviewSupersetRowProps = {
  sectionId: string
  exercises: ExerciseWithSuperset[]
  onDelete: (sectionId: string, exerciseIds: string[]) => void
}

const OverviewSupersetRow = ({
  sectionId,
  exercises,
  onDelete,
}: OverviewSupersetRowProps) => {
  // Use the first exercise's ID for the sortable ID (the drag handler already groups them)
  const firstExerciseId = exercises[0]?.instanceId
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `exercise-|${sectionId}|${firstExerciseId}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const exerciseNames = exercises.map((ex) => ex.name || "Untitled exercise").join(", ")

  const handleDelete = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    const exerciseIds = exercises.map((ex) => ex.exerciseId)
    onDelete(sectionId, exerciseIds)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      handleDelete(e)
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          "rounded-md border bg-background text-xs select-none",
          isDragging && "opacity-80 shadow-sm"
        )}
      >
        <div className="flex items-start justify-between px-3 py-2.5">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {exercises.map((exercise, index) => (
                <div key={exercise.instanceId} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                    <span className="text-xs">
                      {exercise.name || "Untitled exercise"}
                    </span>
                  </div>
                  {index < exercises.length - 1 && (
                    <div className="flex items-center justify-center py-0.5">
                      <Link2 className="size-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div
            {...listeners}
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
          >
            <button
              type="button"
              onClick={handleDelete}
              onKeyDown={handleKeyDown}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
              aria-label={`Delete superset group: ${exerciseNames}`}
              data-no-row-link="true"
            >
              <Trash2 className="size-3" />
            </button>
            <GripVertical className="size-3 text-muted-foreground flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}

type SetFieldValidation = {
  reps?: boolean
  weight?: boolean
  distance?: boolean
  duration?: boolean
  rest?: boolean
}

type ValidationErrors = Record<string, Record<number, SetFieldValidation>>

type SectionValidation = {
  missingConfig?: boolean
  emptyExercises?: boolean
}

type SectionValidationErrors = Record<string, SectionValidation>

export const StandardBuilder = ({
  meta,
  onDirtyChange,
  saveSignal,
  onSaveSuccess,
}: StandardBuilderProps) => {
  const [workoutSchema, setWorkoutSchema] = useState<WorkoutSchema>({
    sections: [
      {
        id: `sec_regular_${Date.now()}`,
        type: "regular",
        exercises: [],
      },
    ],
  })
  const [builderMode, setBuilderMode] = useState<"exercise" | "section">("exercise")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{
    sectionId: string
    slotIndex: number
  } | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [sectionValidationErrors, setSectionValidationErrors] = useState<SectionValidationErrors>({})
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const pendingScrollTopRef = useRef<number | null>(null)
  // DnD Kit state for overview panel
  const [activeOverviewItem, setActiveOverviewItem] = useState<ActiveOverviewItem | null>(null)

  const exerciseResults = useMemo(() => searchExercises(searchQuery), [searchQuery])

  const uniqueEquipment = useMemo(() => {
    const equipmentSet = new Set<string>()
    workoutSchema.sections.forEach((section) => {
      section.exercises?.forEach((exercise) => {
        exercise.equipments?.forEach((equipment) => {
          if (equipment && equipment.trim() !== "") {
            equipmentSet.add(equipment)
          }
        })
      })
    })
    return Array.from(equipmentSet).sort()
  }, [workoutSchema])

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setIsVideoModalOpen(true)
  }

  const recomputeExerciseValidation = (
    exerciseInstanceId: string,
    exerciseType: "weight_reps" | "reps" | "distance_duration",
    sets: SetData[] | undefined
  ) => {
    // Do not show validation until the user has clicked Save at least once
    if (!hasAttemptedSave) {
      return
    }

    setValidationErrors((prev) => {
      const next: ValidationErrors = { ...prev }
      const exerciseErrors: Record<number, SetFieldValidation> = {}

      if (sets && sets.length > 0) {
        sets.forEach((set, index) => {
          const setErrors: SetFieldValidation = {}

          const hasRest = !!set.rest && set.rest.trim() !== ""
          if (!hasRest) {
            setErrors.rest = true
          }

          if (exerciseType === "distance_duration") {
            const hasDistance = !!set.distance && set.distance.trim() !== ""
            const hasDuration = !!set.duration && set.duration.trim() !== ""

            if (!hasDistance && !hasDuration) {
              setErrors.distance = true
              setErrors.duration = true
            }
          } else {
            if (set.type === "dropset") {
              // For dropsets, at least one drop stage is required in reps or weight
              const hasReps = !!set.reps && set.reps.trim() !== ""
              const hasWeight = exerciseType === "weight_reps" && !!set.weight && set.weight.trim() !== ""
              if (!hasReps && !hasWeight) {
                setErrors.reps = true
                if (exerciseType === "weight_reps") {
                  setErrors.weight = true
                }
              }
            } else {
              // Reps are required only for normal/warmUp (not dropset or failure)
              if (set.type !== "failure") {
                const hasReps = !!set.reps && set.reps.trim() !== ""
                if (!hasReps) {
                  setErrors.reps = true
                }
              }

              // Weight is required for all weight_reps sets except dropsets
              if (exerciseType === "weight_reps") {
                const hasWeight = !!set.weight && set.weight.trim() !== ""
                if (!hasWeight) {
                  setErrors.weight = true
                }
              }
            }
          }

          if (Object.keys(setErrors).length > 0) {
            exerciseErrors[index] = setErrors
          }
        })
      }

      if (Object.keys(exerciseErrors).length === 0) {
        delete next[exerciseInstanceId]
      } else {
        next[exerciseInstanceId] = exerciseErrors
      }

      return next
    })
  }

  const clearSetValidationField = (
    exerciseInstanceId: string,
    setIndex: number,
    field: keyof SetFieldValidation
  ) => {
    setValidationErrors((prev) => {
      const exerciseErrors = prev[exerciseInstanceId]
      if (!exerciseErrors) return prev

      const setErrors = exerciseErrors[setIndex]
      if (!setErrors || !setErrors[field]) return prev

      const nextSetErrors: SetFieldValidation = { ...setErrors }
      delete nextSetErrors[field]

      const nextExerciseErrors: Record<number, SetFieldValidation> = { ...exerciseErrors }
      if (Object.keys(nextSetErrors).length === 0) {
        delete nextExerciseErrors[setIndex]
      } else {
        nextExerciseErrors[setIndex] = nextSetErrors
      }

      const nextValidationErrors: ValidationErrors = { ...prev }
      if (Object.keys(nextExerciseErrors).length === 0) {
        delete nextValidationErrors[exerciseInstanceId]
      } else {
        nextValidationErrors[exerciseInstanceId] = nextExerciseErrors
      }

      return nextValidationErrors
    })
  }

  useEffect(() => {
    if (!saveSignal || saveSignal === 0) {
      return
    }

    setHasAttemptedSave(true)

    const nextErrors: ValidationErrors = {}
    const nextSectionErrors: SectionValidationErrors = {}

    workoutSchema.sections.forEach((section) => {
      const sectionErrors: SectionValidation = {}

      if (section.type === "amrap") {
        if (!section.roundDurationSec || section.roundDurationSec <= 0) {
          sectionErrors.missingConfig = true
        }
      }

      if (section.type === "timed") {
        if (!section.targetRounds || section.targetRounds <= 0) {
          sectionErrors.missingConfig = true
        }
      }

      if (!section.exercises || section.exercises.length === 0) {
        sectionErrors.emptyExercises = true
      }

      if (Object.keys(sectionErrors).length > 0) {
        nextSectionErrors[section.id] = sectionErrors
      }

      section.exercises?.forEach((exercise) => {
        const sets = exercise.sets || []

        sets.forEach((set, index) => {
          const setErrors: SetFieldValidation = {}

          const hasRest = !!set.rest && set.rest.trim() !== ""
          if (!hasRest) {
            setErrors.rest = true
          }

          if (exercise.exerciseType === "distance_duration") {
            const hasDistance = !!set.distance && set.distance.trim() !== ""
            const hasDuration = !!set.duration && set.duration.trim() !== ""

            if (!hasDistance && !hasDuration) {
              setErrors.distance = true
              setErrors.duration = true
            }
          } else {
            if (set.type === "dropset") {
              // For dropsets, at least one drop stage is required in reps or weight
              const hasReps = !!set.reps && set.reps.trim() !== ""
              const hasWeight = exercise.exerciseType === "weight_reps" && !!set.weight && set.weight.trim() !== ""
              if (!hasReps && !hasWeight) {
                setErrors.reps = true
                if (exercise.exerciseType === "weight_reps") {
                  setErrors.weight = true
                }
              }
            } else {
              // Reps required only for non-dropset, non-failure sets
              if (set.type !== "failure") {
                const hasReps = !!set.reps && set.reps.trim() !== ""
                if (!hasReps) {
                  setErrors.reps = true
                }
              }

              // Weight required for all weight_reps sets except dropsets
              if (exercise.exerciseType === "weight_reps") {
                const hasWeight = !!set.weight && set.weight.trim() !== ""
                if (!hasWeight) {
                  setErrors.weight = true
                }
              }
            }
          }

          if (Object.keys(setErrors).length > 0) {
            if (!nextErrors[exercise.instanceId]) {
              nextErrors[exercise.instanceId] = {}
            }
            nextErrors[exercise.instanceId][index] = setErrors
          }
        })
      })
    })

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextSectionErrors).length > 0) {
      setValidationErrors(nextErrors)
      setSectionValidationErrors(nextSectionErrors)
      toast.error("Please fill out all fields")
      return
    }

    setValidationErrors({})
    setSectionValidationErrors({})

    const payload = buildWorkoutPayload(workoutSchema, meta)
    if (!payload) {
      toast.error("Workout details are missing")
      return
    }

    if (onSaveSuccess) {
      onSaveSuccess(payload)
    }
  }, [saveSignal])

  const handleSectionSelect = (type: "regular" | "amrap" | "timed") => {
    // Preserve current scroll position in the middle content column
    if (contentScrollRef.current) {
      pendingScrollTopRef.current = contentScrollRef.current.scrollTop
    }

    const newSection = {
      id: `sec_${type}_${Date.now()}`,
      type,
      // All section types use `exercises` for the builder UI. For AMRAP/Timed,
      // these will later be mapped to flat round exercises in the payload.
      exercises: [] as ExerciseWithSuperset[],
    }

    onDirtyChange?.()
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }))
  }

  // After sections change (e.g. a new section is added), restore scroll position
  useLayoutEffect(() => {
    if (pendingScrollTopRef.current !== null && contentScrollRef.current) {
      contentScrollRef.current.scrollTop = pendingScrollTopRef.current
      pendingScrollTopRef.current = null
    }
  }, [workoutSchema.sections.length])

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
    onDirtyChange?.()
    setWorkoutSchema((prev) => {
      const updatedSections = prev.sections.filter((section) => section.id !== sectionId)
      // If no sections remain, switch to section mode
      if (updatedSections.length === 0) {
        setBuilderMode("section")
      }
      return {
      ...prev,
        sections: updatedSections,
      }
    })
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

  const handleDeleteExerciseFromOverview = (sectionId: string, exerciseId: string) => {
    onDirtyChange?.()
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          return {
            ...section,
            exercises: section.exercises.filter(
              (exercise) => exercise.exerciseId !== exerciseId
            ),
          }
        }
        return section
      }),
    }))
  }

  const handleDeleteSupersetFromOverview = (sectionId: string, exerciseIds: string[]) => {
    onDirtyChange?.()
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId && section.exercises) {
          const exerciseIdSet = new Set(exerciseIds)
          return {
            ...section,
            exercises: section.exercises.filter(
              (exercise) => !exerciseIdSet.has(exercise.exerciseId)
            ),
          }
        }
        return section
      }),
    }))
  }

  // Helper function to group exercises by superset
  const groupExercisesBySuperset = (exercises: ExerciseWithSuperset[]) => {
    const groups: Array<ExerciseWithSuperset[]> = []
    let currentGroup: ExerciseWithSuperset[] = []
    let currentGroupId: string | null = null

    exercises.forEach((exercise) => {
      if (exercise.supersetGroupId) {
        if (exercise.supersetGroupId === currentGroupId) {
          // Continue current group
          currentGroup.push(exercise)
        } else {
          // Start new group
          if (currentGroup.length > 0) {
            groups.push(currentGroup)
          }
          currentGroup = [exercise]
          currentGroupId = exercise.supersetGroupId
        }
      } else {
        // Not part of a superset
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
          currentGroup = []
          currentGroupId = null
        }
        groups.push([exercise])
      }
    })

    // Add the last group if it exists
    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups
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
      onDirtyChange?.()
      setWorkoutSchema((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id === sectionId) {
            const exercises = section.exercises || []
            const exerciseWithSuperset: ExerciseWithSuperset = {
              ...draggedExercise,
              supersetGroupId: null,
              instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            }
            return {
              ...section,
              exercises: [...exercises, exerciseWithSuperset],
            }
          }
          return section
        }),
      }))

      // Clear empty-exercises validation for this section once an exercise is added
      setSectionValidationErrors((prev) => {
        const existing = prev[sectionId]
        if (!existing || !existing.emptyExercises) return prev
        const nextSection = { ...existing }
        delete nextSection.emptyExercises
        const next: SectionValidationErrors = { ...prev }
        if (Object.keys(nextSection).length === 0) {
          delete next[sectionId]
        } else {
          next[sectionId] = nextSection
        }
        return next
      })
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
      instanceId: `empty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }

    onDirtyChange?.()
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

    // Clear empty-exercises validation when a manual exercise is added
    setSectionValidationErrors((prev) => {
      const existing = prev[sectionId]
      if (!existing || !existing.emptyExercises) return prev
      const nextSection = { ...existing }
      delete nextSection.emptyExercises
      const next: SectionValidationErrors = { ...prev }
      if (Object.keys(nextSection).length === 0) {
        delete next[sectionId]
      } else {
        next[sectionId] = nextSection
      }
      return next
    })
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

    onDirtyChange?.()
    setWorkoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section

        const exercises = section.exercises || []
        const exerciseWithSuperset: ExerciseWithSuperset = {
          ...draggedExercise,
          supersetGroupId: null,
          instanceId: `${draggedExercise.exerciseId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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

    // Clear empty-exercises validation when an exercise is dropped into a section
    setSectionValidationErrors((prev) => {
      const existing = prev[sectionId]
      if (!existing || !existing.emptyExercises) return prev
      const nextSection = { ...existing }
      delete nextSection.emptyExercises
      const next: SectionValidationErrors = { ...prev }
      if (Object.keys(nextSection).length === 0) {
        delete next[sectionId]
      } else {
        next[sectionId] = nextSection
      }
      return next
    })

    setDraggedExercise(null)
    setDragOverSectionId(null)
    setDragOverSlot(null)
  }

  // DnD – overview handlers
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))

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
      const centerIndex = exercises.findIndex((ex) => ex.instanceId === exerciseId)
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

      onDirtyChange?.()
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

      onDirtyChange?.()
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
    onDirtyChange?.()
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
    onDirtyChange?.()
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
                className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                Exercise
              </TabsTrigger>
              <TabsTrigger
                value="section"
                className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                Section
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
            <div className="flex flex-col gap-2">
              {exerciseResults.slice(0, 40).map((exercise) => (
                <Card
                  key={exercise.exerciseId}
                  draggable
                  onDragStart={() => handleDragStart(exercise)}
                  onDragEnd={handleDragEnd}
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
        )}
        </div>
      </div>
      <Separator orientation="vertical" />
      <div className="relative flex-[4] h-full">
        <div ref={contentScrollRef} className="p-4 h-full overflow-y-auto">
          {workoutSchema.sections.length > 0 ? (
            <div className="flex flex-col gap-1.5 w-full">
              {workoutSchema.sections.map((section) => (
                <div
                  key={section.id}
                  className="relative flex w-full items-stretch flex-shrink-0"
                >
                  <Card className="bg-card w-full flex flex-col relative">
                  <CardHeader className="border-b p-0 pb-2">
                    <div className="flex items-center justify-between px-3 pt-1">
                      <CardTitle className="uppercase tracking-wide text-sm font-medium flex items-center gap-2">
                        {section.type}{" "}
                        <span className="font-normal text-xs">
                          ({section.exercises ? section.exercises.length : 0})
                        </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-4 text-foreground translate-y-[1px]" />
                            </TooltipTrigger>
                            <TooltipContent>
                            {getSectionDescription(section.type)}
                            </TooltipContent>
                          </Tooltip>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {(section.type === "amrap" || section.type === "timed") && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">
                              {section.type === "amrap" ? "Time (s)" : "Rounds"}
                            </span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={
                                section.type === "amrap"
                                  ? section.roundDurationSec?.toString() || ""
                                  : section.targetRounds?.toString() || ""
                              }
                              onChange={(e) => {
                                const value = e.target.value
                                onDirtyChange?.()
                                setWorkoutSchema((prev) => ({
                                  ...prev,
                                  sections: prev.sections.map((sec) => {
                                    if (sec.id === section.id) {
                                      if (section.type === "amrap") {
                                        return {
                                          ...sec,
                                          roundDurationSec: value
                                            ? parseInt(value, 10)
                                            : undefined,
                                        }
                                      }
                                      return {
                                        ...sec,
                                        targetRounds: value ? parseInt(value, 10) : undefined,
                                      }
                                    }
                                    return sec
                                  }),
                                }))

                                // Clear missing-config validation for this section as soon as a value is entered
                                if (value && value.trim() !== "") {
                                  setSectionValidationErrors((prev) => {
                                    const existing = prev[section.id]
                                    if (!existing || !existing.missingConfig) return prev
                                    const nextSection = { ...existing }
                                    delete nextSection.missingConfig
                                    const next: SectionValidationErrors = { ...prev }
                                    if (Object.keys(nextSection).length === 0) {
                                      delete next[section.id]
                                    } else {
                                      next[section.id] = nextSection
                                    }
                                    return next
                                  })
                                }
                              }}
                              className={cn(
                                "h-7 w-24 text-center text-[11px]",
                                sectionValidationErrors[section.id]?.missingConfig &&
                                  "border-destructive focus-visible:ring-destructive"
                              )}
                              placeholder="-"
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:border-destructive"
                          onClick={() => handleDeleteSection(section.id)}
                          onKeyDown={(e) => handleDeleteKeyDown(e, section.id)}
                          aria-label={`Delete ${section.type} section`}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent
                    className="flex-1 flex flex-col px-3 py-1.5"
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleSectionDrop(e, section.id)}
                  >
                    <div className={cn(
                      "flex-1 w-full",
                      section.exercises && section.exercises.length > 0 
                        ? "flex flex-col gap-0" 
                        : "flex items-center justify-center"
                    )}>
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
                            <div key={exercise.instanceId} className={wrapperClasses}>
                              <ExerciseCard
                                exercise={exercise}
                                isLinkedToPrev={isLinkedToPrev}
                                isLinkedToNext={isLinkedToNext}
                                onVideoClick={handleExerciseClick}
                                sectionType={section.type}
                                validationErrors={validationErrors[exercise.instanceId]}
                                onClearValidationField={(setIndex, field) =>
                                  clearSetValidationField(exercise.instanceId, setIndex, field)
                                }
                                onExerciseChange={(newExercise) => {
                                  onDirtyChange?.()
                                  const castExercise = newExercise as ExerciseWithSuperset
                                  recomputeExerciseValidation(
                                    exercise.instanceId,
                                    castExercise.exerciseType as "weight_reps" | "reps" | "distance_duration",
                                    castExercise.sets || []
                                  )
                                  setWorkoutSchema((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((sec) => {
                                      if (sec.id === section.id && sec.exercises) {
                                        const updatedExercises: ExerciseWithSuperset[] = [
                                          ...sec.exercises,
                                        ]
                                        updatedExercises[exerciseIndex] = {
                                          ...castExercise,
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
                                  onDirtyChange?.()
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
                                    <div className="flex justify-center -mt-2 mb-2">
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
                        <div className="flex justify-center">
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
                          "flex items-center justify-center w-full my-4 py-3 border-2 border-dashed rounded-lg transition-colors",
                          dragOverSectionId === section.id
                            ? "border-primary bg-primary/5"
                            : sectionValidationErrors[section.id]?.emptyExercises
                              ? "border-destructive bg-destructive/5"
                              : "border-muted"
                        )}
                      >
                        <p className="text-muted-foreground text-sm text-center">
                          Drag exercises from<br />the left to add
                        </p>
                      </div>
                    )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
            <div className="flex items-center justify-center py-2">
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
      </div>
      <Separator orientation="vertical" />
      <div className="flex-[1.5] bg-background h-full overflow-y-auto">
        <div className="p-4">
          <h2 className="text-left mb-3">Equipment</h2>
          <div className="min-h-[50px] mb-3">
            <div className="flex flex-wrap gap-2">
              {uniqueEquipment.length > 0 ? (
                uniqueEquipment.map((equipment) => (
                  <Badge key={equipment} variant="outline">
                    {equipment}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No equipment required</p>
              )}
            </div>
          </div>
          <div className="mb-3 -mx-4 w-[calc(100%+2rem)]">
            <Separator className="w-full" />
          </div>
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
                    <OverviewSectionCard
                      key={section.id}
                      section={section}
                      onDelete={handleDeleteSection}
                    >
                      <div className="p-2 flex flex-col gap-1">
                        {section.exercises && section.exercises.length > 0 ? (
                          <SortableContext
                            items={section.exercises.map(
                              (exercise) => `exercise-|${section.id}|${exercise.exerciseId}`
                            )}
                            strategy={verticalListSortingStrategy}
                          >
                            {groupExercisesBySuperset(section.exercises).map((exerciseGroup, groupIndex) => {
                              // If it's a superset group (more than one exercise), render as superset row
                              if (exerciseGroup.length > 1 && exerciseGroup[0]?.supersetGroupId) {
                                return (
                                  <OverviewSupersetRow
                                    key={`superset-${section.id}-${exerciseGroup[0].instanceId}-${groupIndex}`}
                                    sectionId={section.id}
                                    exercises={exerciseGroup}
                                    onDelete={handleDeleteSupersetFromOverview}
                                  />
                                )
                              }
                              // Otherwise, render as individual exercise row
                              return exerciseGroup.map((exercise, indexInGroup) => (
                                <OverviewExerciseRow
                                  key={`${exercise.instanceId}-${indexInGroup}`}
                                  sectionId={section.id}
                                  exercise={exercise}
                                  onDelete={handleDeleteExerciseFromOverview}
                                />
                              ))
                            })}
                          </SortableContext>
                        ) : (
                          <div className="text-xs text-muted-foreground px-1 py-2">
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

