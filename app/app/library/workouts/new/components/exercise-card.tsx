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

type ExerciseCardProps = {
  exercise: Exercise
  onVideoClick: (exercise: Exercise) => void
  onExerciseChange: (newExercise: Exercise) => void
  onDelete: () => void
  isLinkedToPrev?: boolean
  isLinkedToNext?: boolean
}

type SetData = {
  setNumber: number
  type: "warmUp" | "normal" | "failure" | "dropset"
  reps: string
  weight: string
  rest: string
  distance?: string
  duration?: string
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
}: ExerciseCardProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isEmpty = !exercise.name || exercise.name === ""
  const [sets, setSets] = useState<SetData[]>([
    { setNumber: 1, type: "normal", reps: "12", weight: "", rest: "2" },
    { setNumber: 2, type: "normal", reps: "12", weight: "", rest: "2" },
    { setNumber: 3, type: "normal", reps: "12", weight: "", rest: "2" },
  ])
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
          handleSaveDropset()
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
    onExerciseChange(selectedExercise)
    setIsSearchOpen(false)
    setIsSearchBarVisible(false)
    setSearchQuery("")
    // Reset sets to default values when exercise changes based on exercise type
    if (selectedExercise.exerciseType === "distance_duration") {
      setSets([
        { setNumber: 1, type: "normal", reps: "", weight: "", rest: "2", distance: "", duration: "" },
        { setNumber: 2, type: "normal", reps: "", weight: "", rest: "2", distance: "", duration: "" },
        { setNumber: 3, type: "normal", reps: "", weight: "", rest: "2", distance: "", duration: "" },
      ])
    } else {
      setSets([
        { setNumber: 1, type: "normal", reps: "12", weight: "", rest: "2" },
        { setNumber: 2, type: "normal", reps: "12", weight: "", rest: "2" },
        { setNumber: 3, type: "normal", reps: "12", weight: "", rest: "2" },
      ])
    }
  }

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
    setSets((prev) => {
      const updated = [...prev]
      const currentSet = updated[index]
      
      // If changing to dropset, clear reps and weight defaults
      if (field === "type" && value === "dropset") {
        updated[index] = { ...currentSet, type: "dropset", reps: "", weight: "" }
      } else {
        updated[index] = { ...currentSet, [field]: value }
      }
      
      return updated
    })
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
    if (dropsetData) {
      if (field === "reps") {
        setDropsetData({
          ...dropsetData,
          repsDrops: dropsetData.repsDrops.map((drop, idx) =>
            idx === dropIndex ? { ...drop, value } : drop
          ),
        })
      } else {
        setDropsetData({
          ...dropsetData,
          weightDrops: dropsetData.weightDrops.map((drop, idx) =>
            idx === dropIndex ? { ...drop, value } : drop
          ),
        })
      }
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

  const handleSaveDropset = () => {
    if (dropsetData) {
      const formattedReps = dropsetData.repsDrops
        .map((drop) => drop.value.trim())
        .filter((val) => val !== "")
        .join("-")
      
      const formattedWeight = dropsetData.weightDrops
        .map((drop) => drop.value.trim())
        .filter((val) => val !== "")
        .join("-")
      
      setSets((prev) => {
        const updated = [...prev]
        updated[dropsetData.setIndex] = {
          ...updated[dropsetData.setIndex],
          reps: formattedReps,
          weight: formattedWeight,
        }
        return updated
      })
      
      setDropsetPopoverOpen(null)
      setDropsetData(null)
    }
  }

  const isDropsetValid = () => {
    if (!dropsetData) return false
    // Check if all drops have both reps and weight filled
    return dropsetData.repsDrops.every((drop, idx) => {
      const repsValue = drop.value.trim()
      const weightValue = dropsetData.weightDrops[idx]?.value.trim() || ""
      return repsValue !== "" && weightValue !== ""
    })
  }

  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, handler: (value: string) => void) => {
    const value = e.target.value
    // Allow empty, numbers, and single decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      handler(value)
    }
  }

  const handleAddSet = () => {
    if (exercise.exerciseType === "distance_duration") {
      setSets((prev) => [
        ...prev,
        { setNumber: prev.length + 1, type: "normal", reps: "", weight: "", rest: "2", distance: "", duration: "" },
      ])
    } else {
      setSets((prev) => [
        ...prev,
        { setNumber: prev.length + 1, type: "normal", reps: "12", weight: "", rest: "2" },
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
      <div className="flex items-center gap-3">
        {!isEmpty && (
          <div
            className="relative w-10 h-10 flex-shrink-0 rounded cursor-pointer"
            onClick={() => onVideoClick(exercise)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onVideoClick(exercise)
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
            <div className="absolute top-0.5 left-0.5">
              <div className="bg-black/60 rounded-full p-0.5">
                <Play className="size-2 text-white fill-white" />
              </div>
            </div>
          </div>
        )}
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
                className={cn("pr-8 text-base flex-1", searchQuery && "pr-8")}
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
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsInfoModalOpen(true)}
                  aria-label="View exercise info"
                  disabled={isEmpty}
                >
                  <Info className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Delete exercise"
                    >
                      <Trash2 className="size-4" />
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
              <span className="text-lg font-medium flex-1">{exercise.name}</span>
              {isSearchBarVisible && (
                <div className="relative flex-1">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder="Search for exercise..."
                    className={cn("pr-8 text-base", searchQuery && "pr-8")}
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
                >
                  <RefreshCw className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsInfoModalOpen(true)}
                  aria-label="View exercise info"
                >
                  <Info className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Delete exercise"
                    >
                      <Trash2 className="size-4" />
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
          <Table>
            <TableHeader>
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
                <TableHead className="text-center h-8 py-1 px-2">Rest (m)</TableHead>
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
                        <SelectTrigger className="h-7 w-[130px] py-0" size="sm">
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
                            className="h-7 w-[75px] text-center"
                            placeholder="-"
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
                            className="h-7 w-[75px] text-center"
                            placeholder="-"
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
                                handleSaveDropset()
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "h-7 text-center cursor-pointer border border-input bg-background rounded-md px-3 text-sm flex items-center justify-center",
                                  set.reps ? "w-auto min-w-[75px]" : "w-[75px]"
                                )}
                              >
                                {set.reps || "-"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="flex flex-col gap-3 p-4">
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
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
                                              className="h-7 w-[75px] text-center"
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
                                              className="h-7 w-[75px] text-center"
                                              placeholder="-"
                                            />
                                            </div>
                                          </TableCell>
                                          <TableCell className="w-[50px] py-1 px-2">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
                                            className="mx-auto"
                                          >
                                            Add drop
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              <Button
                                type="button"
                                onClick={handleSaveDropset}
                                disabled={!isDropsetValid()}
                                className="w-full gap-2 bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Save
                              </Button>
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
                              "h-7 text-center cursor-pointer border border-input bg-background rounded-md px-3 text-sm flex items-center justify-center",
                              set.weight ? "w-auto min-w-[75px]" : "w-[75px]"
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
                  ) : (
                    <>
                      <TableCell className="py-1 px-2">
                        <div className="flex justify-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={set.reps}
                            onChange={(e) => handleNumericInput(e, (value) => handleSetChange(index, "reps", value))}
                            className="h-7 w-[75px] text-center"
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
                              className="h-7 w-[75px] text-center"
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
                        className="h-7 w-[75px] text-center"
                        placeholder="1"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-1 px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
              <TableRow className="h-8">
                <TableCell colSpan={exercise.exerciseType === "reps" ? 5 : 6} className="text-center py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSet}
                    className="mx-auto"
                  >
                    Add set
                  </Button>
                </TableCell>
              </TableRow>
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

