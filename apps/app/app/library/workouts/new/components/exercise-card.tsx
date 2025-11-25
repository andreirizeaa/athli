"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Image from "next/image"
import { Info, Play, RefreshCw, Trash2, X } from "lucide-react"
import { Exercise, searchExercises } from "@/lib/exercise-search"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type SetData = {
  setNumber: number
  type: "warmUp" | "normal" | "failure" | "dropset"
  reps: string
  weight: string
  rest: string
  distance?: string
  duration?: string
}

export type SetFieldValidation = {
  reps?: boolean
  weight?: boolean
  distance?: boolean
  duration?: boolean
  rest?: boolean
}

type ExerciseWithSets = Exercise & {
  sets?: SetData[]
}

type ExerciseCardProps = {
  exercise: ExerciseWithSets
  onVideoClick: (exercise: Exercise) => void
  onExerciseChange: (newExercise: ExerciseWithSets) => void
  onDelete: () => void
  isLinkedToPrev?: boolean
  isLinkedToNext?: boolean
  sectionType?: "regular" | "amrap" | "timed"
  validationErrors?: Record<number, SetFieldValidation>
  onClearValidationField?: (setIndex: number, field: keyof SetFieldValidation) => void
}

type DropsetData = {
  dropNumber: number
  value: string
}

export const ExerciseCard = ({
  exercise,
  onVideoClick,
  onExerciseChange,
  onDelete,
  isLinkedToPrev = false,
  isLinkedToNext = false,
  sectionType = "regular",
  validationErrors,
  onClearValidationField,
}: ExerciseCardProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isEmpty = !exercise.name || exercise.name === ""
  const isSingleSetOnly = sectionType === "amrap" || sectionType === "timed"
  const [sets, setSets] = useState<SetData[]>(() => {
    // If parent already has sets (e.g. from restored state), use them.
    if (exercise.sets && exercise.sets.length > 0) {
      return exercise.sets
    }

    if (isSingleSetOnly) {
      return [{ setNumber: 1, type: "normal", reps: "12", weight: "", rest: "90" }]
    }

    return [
      { setNumber: 1, type: "normal", reps: "12", weight: "", rest: "90" },
      { setNumber: 2, type: "normal", reps: "12", weight: "", rest: "90" },
      { setNumber: 3, type: "normal", reps: "12", weight: "", rest: "90" },
    ]
  })
  const [dropsetPopoverOpen, setDropsetPopoverOpen] = useState<number | null>(null)
  const [dropsetData, setDropsetData] = useState<{
    setIndex: number
    repsDrops: DropsetData[]
    weightDrops: DropsetData[]
  } | null>(null)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show first 10 exercises when search is open but no query
      return searchExercises("").slice(0, 10)
    }
    return searchExercises(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
        setSearchQuery("")
      }
    }

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSearchOpen])

  useEffect(() => {
    if (dropsetPopoverOpen) {
      const handleClickOutsideDropset = (event: MouseEvent) => {
        // Check if click is outside the popover
        const target = event.target as Node
        const popoverElement = document.querySelector('[data-slot="popover-content"]')
        if (popoverElement && !popoverElement.contains(target) && containerRef.current && !containerRef.current.contains(target)) {
          setDropsetPopoverOpen(null)
          setDropsetData(null)
        }
      }

      // Small delay to avoid immediate closure
      const timeout = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutsideDropset)
      }, 100)
      
      return () => {
        clearTimeout(timeout)
        document.removeEventListener("mousedown", handleClickOutsideDropset)
      }
    }
  }, [dropsetPopoverOpen])

  const handleExerciseSelect = (selectedExercise: Exercise) => {
    // When a new exercise is selected, reset the local sets and notify parent
    setIsSearchOpen(false)
    setIsSearchBarVisible(false)
    setSearchQuery("")
    // Reset sets to default values when exercise changes based on exercise type and section type
    let nextSets: SetData[]

    if (isSingleSetOnly) {
    if (selectedExercise.exerciseType === "distance_duration") {
        nextSets = [
          { setNumber: 1, type: "normal", reps: "", weight: "", rest: "90", distance: "", duration: "" },
        ]
    } else {
        nextSets = [
          { setNumber: 1, type: "normal", reps: "12", weight: "", rest: "90" },
        ]
      }
    } else {
      if (selectedExercise.exerciseType === "distance_duration") {
        nextSets = [
          { setNumber: 1, type: "normal", reps: "", weight: "", rest: "90", distance: "", duration: "" },
          { setNumber: 2, type: "normal", reps: "", weight: "", rest: "90", distance: "", duration: "" },
          { setNumber: 3, type: "normal", reps: "", weight: "", rest: "90", distance: "", duration: "" },
        ]
      } else {
        nextSets = [
          { setNumber: 1, type: "normal", reps: "12", weight: "", rest: "90" },
          { setNumber: 2, type: "normal", reps: "12", weight: "", rest: "90" },
          { setNumber: 3, type: "normal", reps: "12", weight: "", rest: "90" },
        ]
      }
    }

    setSets(nextSets)
    onExerciseChange({
      ...exercise,
      ...selectedExercise,
      sets: nextSets,
    })
  }

  // On first mount, if the parent has no sets yet, push our initial defaults up
  useEffect(() => {
    if (!exercise.sets || exercise.sets.length === 0) {
      onExerciseChange({
        ...exercise,
        sets,
      })
    }
    // We intentionally run this only once on mount to establish initial sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isEmpty) {
      setIsSearchBarVisible(true)
      setIsSearchOpen(true)
      setSearchQuery("")
    }
  }, [isEmpty])

  const handleInputFocus = () => {
    setIsSearchOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setIsSearchOpen(true)
  }

  const handleSetChange = (index: number, field: keyof SetData, value: string) => {
    // Build updated sets from current state (safe in event handler)
    const updated = [...sets]
      const currentSet = updated[index]
      
      // If changing to dropset, clear reps and weight defaults
      if (field === "type" && value === "dropset") {
        updated[index] = { ...currentSet, type: "dropset", reps: "", weight: "" }
    } else if (exercise.exerciseType === "distance_duration") {
      // For distance_duration exercise type, clear the other field when one is set
      if (field === "distance" && value) {
        updated[index] = { ...currentSet, [field]: value, duration: "" }
      } else if (field === "duration" && value) {
        updated[index] = { ...currentSet, [field]: value, distance: "" }
      } else {
        updated[index] = { ...currentSet, [field]: value }
      }
      } else {
        updated[index] = { ...currentSet, [field]: value }
      }
      
    setSets(updated)

    // Notify parent about updated sets
    onExerciseChange({
      ...exercise,
      sets: updated,
    })

    // Clear validation for this field when the user enters a value
    if (value && value.trim() !== "") {
      if (exercise.exerciseType === "distance_duration") {
        if (field === "distance" || field === "duration") {
          // Distance/duration are mutually exclusive – clear both when either is set
          if (validationErrors) {
            onClearValidationField?.(index, "distance")
            onClearValidationField?.(index, "duration")
          }
        } else if (field === "rest") {
          onClearValidationField?.(index, "rest")
        }
      } else {
        if (field === "reps") {
          onClearValidationField?.(index, "reps")
        } else if (field === "weight") {
          onClearValidationField?.(index, "weight")
        } else if (field === "rest") {
          onClearValidationField?.(index, "rest")
        }
      }
    }
  }

  const handleDropsetInputClick = (setIndex: number) => {
    const set = sets[setIndex]
    if (set.type === "dropset") {
      // Initialize dropset data for both reps and weight
      const parseDrops = (value: string): DropsetData[] => {
        if (value && value.includes("-")) {
          const values = value.split("-")
          return values.map((val, idx) => ({
            dropNumber: idx + 1,
            value: val.trim(),
          }))
        }
        return [
          { dropNumber: 1, value: "" },
          { dropNumber: 2, value: "" },
        ]
      }
      
      const repsDrops = parseDrops(set.reps)
      const weightDrops = parseDrops(set.weight)
      
      // Ensure both have the same number of drops (use the max)
      const maxDrops = Math.max(repsDrops.length, weightDrops.length, 2)
      const normalizedRepsDrops = Array.from({ length: maxDrops }, (_, idx) => 
        repsDrops[idx] || { dropNumber: idx + 1, value: "" }
      )
      const normalizedWeightDrops = Array.from({ length: maxDrops }, (_, idx) => 
        weightDrops[idx] || { dropNumber: idx + 1, value: "" }
      )
      
      setDropsetData({ 
        setIndex, 
        repsDrops: normalizedRepsDrops,
        weightDrops: normalizedWeightDrops
      })
      setDropsetPopoverOpen(setIndex)
    }
  }

  const handleDropsetValueChange = (dropIndex: number, field: "reps" | "weight", value: string) => {
    if (!dropsetData) return

    const nextDropsetData = {
          ...dropsetData,
      repsDrops:
        field === "reps"
          ? dropsetData.repsDrops.map((drop, idx) =>
            idx === dropIndex ? { ...drop, value } : drop
            )
          : dropsetData.repsDrops,
      weightDrops:
        field === "weight"
          ? dropsetData.weightDrops.map((drop, idx) =>
            idx === dropIndex ? { ...drop, value } : drop
            )
          : dropsetData.weightDrops,
    }

    setDropsetData(nextDropsetData)

    // Live-update the parent set's reps/weight from dropset data
    const formattedReps = nextDropsetData.repsDrops
      .map((drop) => drop.value.trim())
      .filter((val) => val !== "")
      .join("-")

    const formattedWeight = nextDropsetData.weightDrops
      .map((drop) => drop.value.trim())
      .filter((val) => val !== "")
      .join("-")

    const updated = [...sets]
    updated[nextDropsetData.setIndex] = {
      ...updated[nextDropsetData.setIndex],
      reps: formattedReps,
      weight: formattedWeight,
    }

    setSets(updated)

    onExerciseChange({
      ...exercise,
      sets: updated,
    })

    if (formattedReps) {
      onClearValidationField?.(nextDropsetData.setIndex, "reps")
    }
    if (formattedWeight) {
      onClearValidationField?.(nextDropsetData.setIndex, "weight")
    }
  }

  const handleAddDrop = () => {
    if (dropsetData) {
      const newDropNumber = dropsetData.repsDrops.length + 1
      setDropsetData({
        ...dropsetData,
        repsDrops: [
          ...dropsetData.repsDrops,
          { dropNumber: newDropNumber, value: "" },
        ],
        weightDrops: [
          ...dropsetData.weightDrops,
          { dropNumber: newDropNumber, value: "" },
        ],
      })
    }
  }

  const handleRemoveDrop = (dropIndex: number) => {
    if (dropsetData) {
      const updatedRepsDrops = dropsetData.repsDrops.filter((_, idx) => idx !== dropIndex)
      const updatedWeightDrops = dropsetData.weightDrops.filter((_, idx) => idx !== dropIndex)
      // Renumber drops
      const renumberedRepsDrops = updatedRepsDrops.map((drop, idx) => ({
        ...drop,
        dropNumber: idx + 1,
      }))
      const renumberedWeightDrops = updatedWeightDrops.map((drop, idx) => ({
        ...drop,
        dropNumber: idx + 1,
      }))
      setDropsetData({
        ...dropsetData,
        repsDrops: renumberedRepsDrops,
        weightDrops: renumberedWeightDrops,
      })
    }
  }

  // Dropsets are now saved live as the user types; no explicit Save button needed

  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, handler: (value: string) => void) => {
    const value = e.target.value
    // Allow empty, numbers, and single decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      handler(value)
    }
  }

  const handleAddSet = () => {
    if (isSingleSetOnly) return // Don't allow adding sets for AMRAP/Timed sections
    
    if (exercise.exerciseType === "distance_duration") {
      setSets((prev) => [
        ...prev,
        { setNumber: prev.length + 1, type: "normal", reps: "", weight: "", rest: "90", distance: "", duration: "" },
      ])
    } else {
      setSets((prev) => [
        ...prev,
        { setNumber: prev.length + 1, type: "normal", reps: "12", weight: "", rest: "90" },
      ])
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col gap-3 p-3 bg-background border",
        // Shape logic:
        // - standalone: fully rounded
        // - top of superset: rounded top only
        // - bottom of superset: rounded bottom only
        // - middle of larger chain (future-proof): square edges
        isLinkedToPrev && isLinkedToNext
          ? "rounded-none border-y-0"
          : isLinkedToPrev
            ? "rounded-b-lg rounded-t-none border-t-0"
            : isLinkedToNext
              ? "rounded-t-lg rounded-b-none border-b-0"
              : "rounded-lg"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 relative flex items-center gap-2">
          {isEmpty ? (
            <div className="relative flex-1 flex items-center gap-2">
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder="Choose an exercise..."
                className={cn("h-8 pr-7 text-[13px] flex-1", searchQuery && "pr-7")}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setIsSearchOpen(false)
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-12 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.exerciseId}
                      onClick={() => handleExerciseSelect(result)}
                      className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer transition-colors"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleExerciseSelect(result)
                        }
                      }}
                      aria-label={`Select ${result.name}`}
                    >
                      <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden">
                        <Image
                          src={result.imageUrl || "/demo-img.png"}
                          alt={result.name || "Exercise thumbnail"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-sm flex-1">{result.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsInfoModalOpen(true)}
                  aria-label="View exercise info"
                  disabled={isEmpty}
                  className="h-7 w-7"
                >
                  <Info className="size-3" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Delete exercise"
                      className="h-7 w-7"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive text-center justify-center"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium flex-1 truncate">{exercise.name}</span>
              {isSearchBarVisible && (
                <div className="relative flex-1">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder="Search for exercise..."
                    className={cn("h-8 pr-7 text-[13px]", searchQuery && "pr-7")}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("")
                        setIsSearchOpen(false)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                  {isSearchOpen && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {searchResults.map((result) => (
                        <div
                          key={result.exerciseId}
                          onClick={() => handleExerciseSelect(result)}
                          className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer transition-colors"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleExerciseSelect(result)
                            }
                          }}
                          aria-label={`Select ${result.name}`}
                        >
                          <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden">
                            <Image
                              src={result.imageUrl}
                              alt={result.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="text-sm flex-1">{result.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setIsSearchBarVisible(!isSearchBarVisible)
                    if (!isSearchBarVisible) {
                      setSearchQuery("")
                      setIsSearchOpen(true)
                    } else {
                      setIsSearchOpen(false)
                      setSearchQuery("")
                    }
                  }}
                  aria-label="Change exercise"
                  className="h-7 w-7"
                >
                  <RefreshCw className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsInfoModalOpen(true)}
                  aria-label="View exercise info"
                  className="h-7 w-7"
                >
                  <Info className="size-3" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Delete exercise"
                      className="h-7 w-7"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive text-center justify-center"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </div>
      {(exercise.exerciseType === "weight_reps" || exercise.exerciseType === "reps" || exercise.exerciseType === "distance_duration") && (
        <div className="w-full border rounded-lg overflow-hidden">
          <Table className="text-[11px] leading-tight">
            <TableHeader className="bg-sidebar">
              <TableRow className="h-8">
                <TableHead className="text-center h-8 py-1 px-2">Set</TableHead>
                <TableHead className="text-center h-8 py-1 px-2 w-[130px]">Type</TableHead>
                {exercise.exerciseType === "distance_duration" ? (
                  <>
                    <TableHead className="text-center h-8 py-1 px-2">Distance</TableHead>
                    <TableHead className="text-center h-8 py-1 px-2">Duration</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-center h-8 py-1 px-2">Reps</TableHead>
                    {exercise.exerciseType === "weight_reps" && (
                      <TableHead className="text-center h-8 py-1 px-2">Weight</TableHead>
                    )}
                  </>
                )}
                <TableHead className="text-center h-8 py-1 px-2">Rest (s)</TableHead>
                <TableHead className="w-[50px] h-8 py-1 px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sets.map((set, index) => (
                <TableRow key={index} className="h-10">
                  <TableCell className="font-medium text-center py-1 px-2">{index + 1}</TableCell>
                  <TableCell className="py-1 px-2 w-[130px]">
                    <div className="flex justify-center">
                      <Select
                        value={set.type}
                        onValueChange={(value) => handleSetChange(index, "type", value as SetData["type"])}
                      >
                        <SelectTrigger className="h-6 w-[120px] py-0 px-2 text-[11px] [&>span]:leading-tight" style={{ minHeight: '24px', height: '24px' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warmUp">Warm up</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="failure">Failure</SelectItem>
                          {exercise.exerciseType === "weight_reps" && (
                            <SelectItem value="dropset">Dropset</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  {exercise.exerciseType === "distance_duration" ? (
                    <>
                      <TableCell className="py-1 px-2">
                        <div className="flex justify-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={set.distance || ""}
                            onChange={(e) => handleNumericInput(e, (value) => handleSetChange(index, "distance", value))}
                            className={cn(
                              "h-6 w-[70px] text-center text-[11px]",
                              validationErrors?.[index]?.distance &&
                                "border-destructive focus-visible:ring-destructive"
                            )}
                            placeholder="-"
                            disabled={!!set.duration}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <div className="flex justify-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={set.duration || ""}
                            onChange={(e) => handleNumericInput(e, (value) => handleSetChange(index, "duration", value))}
                            className={cn(
                              "h-6 w-[70px] text-center text-[11px]",
                              validationErrors?.[index]?.duration &&
                                "border-destructive focus-visible:ring-destructive"
                            )}
                            placeholder="-"
                            disabled={!!set.distance}
                          />
                        </div>
                      </TableCell>
                    </>
                  ) : set.type === "dropset" && exercise.exerciseType === "weight_reps" ? (
                    <>
                      <TableCell className="py-1 px-2">
                        <div className="flex justify-center">
                          <Popover
                            open={dropsetPopoverOpen === index}
                            onOpenChange={(open) => {
                              if (open) {
                                handleDropsetInputClick(index)
                              } else {
                                setDropsetPopoverOpen(null)
                                setDropsetData(null)
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "h-6 text-center cursor-pointer border border-input bg-background rounded-md px-3 text-[11px] flex items-center justify-center",
                                  set.reps ? "w-auto min-w-[70px]" : "w-[70px]",
                                  validationErrors?.[index]?.reps &&
                                    "border-destructive focus-visible:ring-destructive"
                                )}
                              >
                                {set.reps || "-"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="flex flex-col gap-3 p-4">
                                <div className="border rounded-lg overflow-hidden">
                                  <Table className="text-[11px] leading-tight">
                                    <TableHeader>
                                      <TableRow className="h-8">
                                        <TableHead className="text-center h-8 py-1 px-2">Drop</TableHead>
                                        <TableHead className="text-center h-8 py-1 px-2">Reps</TableHead>
                                        <TableHead className="text-center h-8 py-1 px-2">Weight</TableHead>
                                        <TableHead className="w-[50px] h-8 py-1 px-2"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {dropsetData?.setIndex === index && dropsetData.repsDrops.map((drop, dropIndex) => (
                                        <TableRow key={dropIndex} className="h-10">
                                          <TableCell className="font-medium text-center py-1 px-2">{drop.dropNumber}</TableCell>
                                          <TableCell className="py-1 px-2">
                                            <div className="flex justify-center">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={drop.value}
                                              onChange={(e) => handleNumericInput(e, (value) => handleDropsetValueChange(dropIndex, "reps", value))}
                                              className="h-6 w-[70px] text-center text-[11px]"
                                              placeholder="-"
                                            />
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-1 px-2">
                                            <div className="flex justify-center">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={dropsetData.weightDrops[dropIndex]?.value || ""}
                                              onChange={(e) => handleNumericInput(e, (value) => handleDropsetValueChange(dropIndex, "weight", value))}
                                              className="h-6 w-[70px] text-center text-[11px]"
                                              placeholder="-"
                                            />
                                            </div>
                                          </TableCell>
                                          <TableCell className="w-[50px] py-1 px-2">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-[11px] text-muted-foreground hover:text-destructive"
                                              onClick={() => handleRemoveDrop(dropIndex)}
                                              aria-label={`Remove drop ${drop.dropNumber}`}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="h-8">
                                        <TableCell colSpan={4} className="text-center py-1 px-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleAddDrop}
                                            className="mx-auto text-[11px] h-6"
                                          >
                                            Add drop
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            className={cn(
                              "h-6 text-center cursor-pointer border border-input bg-background rounded-md px-3 text-[11px] flex items-center justify-center",
                              set.weight ? "w-auto min-w-[70px]" : "w-[70px]",
                              validationErrors?.[index]?.weight &&
                                "border-destructive focus-visible:ring-destructive"
                            )}
                            onClick={() => {
                              if (dropsetPopoverOpen !== index) {
                                handleDropsetInputClick(index)
                              }
                            }}
                          >
                            {set.weight || "-"}
                          </button>
                        </div>
                      </TableCell>
                    </>
                  ) : set.type === "failure" && (exercise.exerciseType === "reps" || exercise.exerciseType === "weight_reps") ? (
                    <>
                      <TableCell className="py-1 px-2">
                        <div className="flex justify-center">
                          <span className="text-xs text-muted-foreground">To failure</span>
                        </div>
                      </TableCell>
                      {exercise.exerciseType === "weight_reps" && (
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={set.weight}
                              onChange={(e) => handleNumericInput(e, (value) => handleSetChange(index, "weight", value))}
                              className={cn(
                                "h-6 w-[70px] text-center text-[11px]",
                                validationErrors?.[index]?.weight &&
                                  "border-destructive focus-visible:ring-destructive"
                              )}
                              placeholder="-"
                            />
                          </div>
                        </TableCell>
                      )}
                    </>
                  ) : (
                    <>
                      <TableCell className="py-1 px-2">
                        <div className="flex justify-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={set.reps}
                            onChange={(e) => handleNumericInput(e, (value) => handleSetChange(index, "reps", value))}
                            className={cn(
                              "h-6 w-[70px] text-center text-[11px]",
                              validationErrors?.[index]?.reps &&
                                "border-destructive focus-visible:ring-destructive"
                            )}
                            placeholder="-"
                          />
                        </div>
                      </TableCell>
                      {exercise.exerciseType === "weight_reps" && (
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={set.weight}
                              onChange={(e) => handleNumericInput(e, (value) => handleSetChange(index, "weight", value))}
                              className={cn(
                                "h-6 w-[70px] text-center text-[11px]",
                                validationErrors?.[index]?.weight &&
                                  "border-destructive focus-visible:ring-destructive"
                              )}
                              placeholder="-"
                            />
                          </div>
                        </TableCell>
                      )}
                    </>
                  )}
                  <TableCell className="py-1 px-2">
                    <div className="flex justify-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={set.rest}
                        onChange={(e) => handleNumericInput(e, (value) => handleSetChange(index, "rest", value))}
            className={cn(
              "h-6 w-[70px] text-center text-[11px]",
              validationErrors?.[index]?.rest &&
                "border-destructive focus-visible:ring-destructive"
            )}
            placeholder="1"
          />
        </div>
      </TableCell>
                  <TableCell className="py-1 px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-[11px] text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setSets((prev) => prev.filter((_, i) => i !== index))
                      }}
                      aria-label={`Remove set ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isSingleSetOnly && (
              <TableRow 
                className="h-8 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={handleAddSet}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleAddSet()
                  }
                }}
                aria-label="Add set"
              >
                <TableCell colSpan={exercise.exerciseType === "reps" ? 5 : 6} className="text-center py-1 text-[11px]">
                  Add set
                </TableCell>
              </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="w-full max-w-[60vw] sm:max-w-[60vw] max-h-[85vh] flex flex-col overflow-y-auto" showCloseButton={false}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">
                {exercise.name} Information
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
          <div className="mt-4 flex flex-col gap-6">
            <div className="flex gap-6">
              <div className="w-3/5 flex-shrink-0">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <video
                    src={exercise.videoUrl}
                    controls
                    className="w-full h-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">Target Muscles</h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.targetMuscles.map((muscle) => (
                      <Badge key={muscle} variant="outline">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">Secondary Muscles</h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.secondaryMuscles.map((muscle) => (
                      <Badge key={muscle} variant="outline">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6 w-full">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Instructions</h3>
                <Textarea
                  readOnly
                  value={exercise.instructions.join("\n\n")}
                  className="min-h-[120px] resize-none w-full select-none pointer-events-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Exercise Tips</h3>
                <Textarea
                  readOnly
                  value={exercise.exerciseTips.join("\n\n")}
                  className="min-h-[120px] resize-none w-full select-none pointer-events-none"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

