"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import { SidePanel } from "@/components/app/side-panel"
import { AssignAthletesList } from "@/components/app/assign-athletes-list"
import { cn } from "@/lib/utils"
import { generateWorkoutFromPrompt } from "@/lib/generate-exercise"
import { exportToCSV } from "@/lib/csv-export"
import DescriptionModal from "./description-modal"
import { BasicInformation } from "./new/basic-information"
import {
  Search,
  X,
  Check,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  Tag,
  Clock,
  Wrench,
  Calendar,
  Hash,
  UserPlus,
  HelpCircle,
  Sparkles,
  BrainCog,
  Download,
} from "lucide-react"

import type { Workout } from "@/components/app/app-shell"
import { mockWorkouts } from "@/components/app/app-shell"

type ColumnId = "description" | "type" | "length" | "totalExercises" | "equipment" | "created"

const COLUMN_ORDER: ColumnId[] = [
  "description",
  "type",
  "length",
  "totalExercises",
  "equipment",
  "created",
]

const getColumnWidth = (colId: ColumnId, format: "class" | "pixel" = "class"): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    description: { class: "min-w-[250px]", pixel: "250px" },
    type: { class: "min-w-[140px]", pixel: "140px" },
    length: { class: "min-w-[130px]", pixel: "130px" },
    totalExercises: { class: "min-w-[170px]", pixel: "170px" },
    equipment: { class: "min-w-[200px]", pixel: "200px" },
    created: { class: "min-w-[150px]", pixel: "150px" },
  }

  return widths[colId]?.[format] || (format === "class" ? "min-w-[130px]" : "130px")
}

const WorkoutsPage = () => {
  const router = useRouter()
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [lengthFilter, setLengthFilter] = useState<string | null>(null)
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(COLUMN_ORDER)
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [descriptionModalOpen, setDescriptionModalOpen] = useState<boolean>(false)
  const [selectedDescription, setSelectedDescription] = useState<{ description: string; programName: string } | null>(null)
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState<boolean>(false)
  const [newWorkoutName, setNewWorkoutName] = useState<string>("")
  const [newWorkoutType, setNewWorkoutType] = useState<string>("")
  const [newDifficulty, setNewDifficulty] = useState<string>("all levels")
  const [newDescription, setNewDescription] = useState<string>("")
  const [newNameError, setNewNameError] = useState<string | null>(null)
  const [newTypeError, setNewTypeError] = useState<string | null>(null)
  const [newDifficultyError, setNewDifficultyError] = useState<string | null>(null)
  const [newSelectedBuilder, setNewSelectedBuilder] = useState<"standard" | "ai" | null>("ai")
  const [isAssignWorkoutOpen, setIsAssignWorkoutOpen] = useState<boolean>(false)
  const [isCreateWorkoutStep2, setIsCreateWorkoutStep2] = useState<boolean>(false)
  const [aiPrompt, setAiPrompt] = useState<string>("")
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null)
  const pdfFileInputRef = useRef<HTMLInputElement>(null)

  const handleToggleWorkout = (workoutId: string) => {
    setSelectedWorkouts((prev) => {
      const next = new Set(prev)
      if (next.has(workoutId)) {
        next.delete(workoutId)
      } else {
        next.add(workoutId)
      }
      return next
    })
  }

  const handleNavigateToWorkout = (workoutId: string) => {
    router.push(`/library/workouts/${workoutId}`)
  }

  const handleNavigateToAthletes = () => {
    router.push("/athletes")
  }

  const handleOpenAssignWorkout = () => {
    setIsAssignWorkoutOpen(true)
  }

  const resetCreateWorkoutState = () => {
    setNewWorkoutName("")
    setNewWorkoutType("")
    setNewDifficulty("all levels")
    setNewDescription("")
    setNewNameError(null)
    setNewTypeError(null)
    setNewDifficultyError(null)
    setNewSelectedBuilder("ai")
    setIsCreateWorkoutStep2(false)
    setAiPrompt("")
    setSelectedPdfFile(null)
  }

  const handleOpenCreateWorkout = () => {
    resetCreateWorkoutState()
    setIsCreateWorkoutOpen(true)
  }

  const handleCloseCreateWorkout = () => {
    setIsCreateWorkoutOpen(false)
  }

  const handleCreateWorkoutContinue = async () => {
    if (!isCreateWorkoutStep2) {
      // Step 1: Validate and move to step 2 if AI builder selected
      if (!newWorkoutName.trim()) {
        setNewNameError("Workout name is required")
        return
      }
      if (!newWorkoutType) {
        setNewTypeError("Workout type is required")
        return
      }
      if (!newDifficulty) {
        setNewDifficultyError("Difficulty is required")
        return
      }
      if (!newSelectedBuilder) {
        return
      }

      // If AI builder, go to step 2
      if (newSelectedBuilder === "ai") {
        setIsCreateWorkoutStep2(true)
        return
      }

      // If standard builder, proceed directly to builder
      const meta = {
        title: newWorkoutName.trim(),
        description: newDescription.trim(),
        type: newWorkoutType.toLowerCase().replace(/\s+/g, "_"),
        difficulty: newDifficulty.toLowerCase().replace(/\s+/g, "_"),
        builder: newSelectedBuilder,
      }

      try {
        window.localStorage.setItem("oneninety_new_workout_meta", JSON.stringify(meta))
      } catch {
        // Ignore storage errors
      }

      setIsCreateWorkoutOpen(false)

      const targetPath = "/library/workouts/new/standard"
      router.push(targetPath)
    } else {
      // Step 2: Generate AI workout and navigate to builder
      const prompt = aiPrompt.trim()

      const meta = {
        title: newWorkoutName.trim(),
        description: prompt,
        type: newWorkoutType.toLowerCase().replace(/\s+/g, "_"),
        difficulty: newDifficulty.toLowerCase().replace(/\s+/g, "_"),
        builder: newSelectedBuilder,
      }

      try {
        window.localStorage.setItem("oneninety_new_workout_meta", JSON.stringify(meta))
      } catch {
        // Ignore storage errors
      }

      let generated: any = null
      try {
        generated = await generateWorkoutFromPrompt(prompt)
        // eslint-disable-next-line no-console
        console.log("AI generated workout", generated)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to generate workout from AI", error)
      }

      if (generated) {
        try {
          window.localStorage.setItem("oneninety_ai_generated_workout", JSON.stringify(generated))
        } catch {
          // Ignore storage errors
        }
      } else {
        try {
          window.localStorage.removeItem("oneninety_ai_generated_workout")
        } catch {
          // Ignore storage errors
        }
      }

      setIsCreateWorkoutOpen(false)

      const targetPath = "/library/workouts/new/ai"
      router.push(targetPath)
    }
  }

  const handleCreateWorkoutBack = () => {
    setIsCreateWorkoutStep2(false)
  }

  const handlePdfButtonClick = () => {
    pdfFileInputRef.current?.click()
  }

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedPdfFile(file)
    }
  }

  const handleRemovePdf = () => {
    setSelectedPdfFile(null)
    if (pdfFileInputRef.current) {
      pdfFileInputRef.current.value = ""
    }
  }

  const handleUseExample = () => {
    const examplePrompt = `Create a full-body strength and conditioning workout for intermediate level. Include:

- 3-4 compound exercises (squats, deadlifts, bench press variations)
- 2-3 accessory movements for arms and core
- 3-4 sets per exercise
- Progressive rep ranges (8-12 reps for strength, 12-15 for hypertrophy)
- 60-90 seconds rest between sets
- Total workout duration: 45-60 minutes

Focus on proper form and progressive overload.`
    setAiPrompt(examplePrompt)
  }

  const handleWorkoutRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    workoutId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      const targetElement = event.target as HTMLElement
      if (targetElement.closest('[data-no-row-link="true"]')) {
        return
      }

      event.preventDefault()
      handleNavigateToWorkout(workoutId)
    }
  }

  const handleWorkoutRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    workoutId: string,
  ) => {
    const targetElement = event.target as HTMLElement
    if (targetElement.closest('[data-no-row-link="true"]')) {
      return
    }

    handleNavigateToWorkout(workoutId)
  }

  const formatDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split("-")
    const date = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day))
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return `${months[date.getMonth()]} ${date.getDate()}, 20${year}`
  }


  const handleDescriptionClick = (event: React.MouseEvent, description: string, programName: string) => {
    event.stopPropagation()
    setSelectedDescription({ description, programName })
    setDescriptionModalOpen(true)
  }

  const handleDescriptionKeyDown = (event: React.KeyboardEvent, description: string, programName: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      event.stopPropagation()
      setSelectedDescription({ description, programName })
      setDescriptionModalOpen(true)
    }
  }

  const isFuzzyMatch = (text: string, query: string): boolean => {
    const normalizedText = text.toLowerCase()
    const normalizedQuery = query.toLowerCase().trim()

    if (!normalizedQuery) {
      return true
    }

    if (normalizedText.includes(normalizedQuery)) {
      return true
    }

    let textIndex = 0
    let queryIndex = 0

    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1
      }
      textIndex += 1
    }

    return queryIndex === normalizedQuery.length
  }

  const filteredWorkouts = mockWorkouts.filter((workout) => {
    const matchesSearch = !searchQuery.trim() ||
      isFuzzyMatch(workout.program, searchQuery) ||
      isFuzzyMatch(workout.description, searchQuery) ||
      isFuzzyMatch(workout.type, searchQuery) ||
      isFuzzyMatch(workout.equipment, searchQuery)

    const matchesType = !typeFilter || workout.type === typeFilter

    const matchesLength = !lengthFilter || workout.length === lengthFilter

    return matchesSearch && matchesType && matchesLength
  })

  const handleSort = (columnId: ColumnId, direction: "asc" | "desc") => {
    setSortColumn(columnId)
    setSortDirection(direction)
  }

  const handleMoveColumn = (columnId: ColumnId, direction: "left" | "right") => {
    setColumnOrder((prev) => {
      const newOrder = [...prev]
      const currentIndex = newOrder.indexOf(columnId)
      const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1

      if (newIndex < 0 || newIndex >= newOrder.length) {
        return prev
      }

      ;[newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]
      return newOrder
    })
  }

  const sortedAndFilteredWorkouts = [...filteredWorkouts].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0

    let aValue: string | number
    let bValue: string | number

    switch (sortColumn) {
      case "description":
        aValue = a.description
        bValue = b.description
        break
      case "type":
        aValue = a.type
        bValue = b.type
        break
      case "length":
        {
          const aWeeks = parseInt(a.length.split(" ")[0])
          const bWeeks = parseInt(b.length.split(" ")[0])
          aValue = isNaN(aWeeks) ? 0 : aWeeks
          bValue = isNaN(bWeeks) ? 0 : bWeeks
        }
        break
      case "totalExercises":
        aValue = a.totalExercises
        bValue = b.totalExercises
        break
      case "equipment":
        aValue = a.equipment
        bValue = b.equipment
        break
      case "created":
        {
          const [aDay, aMonth, aYear] = a.created.split("-").map(Number)
          const [bDay, bMonth, bYear] = b.created.split("-").map(Number)
          const aDate = new Date(2000 + aYear, aMonth - 1, aDay).getTime()
          const bDate = new Date(2000 + bYear, bMonth - 1, bDay).getTime()
          aValue = aDate
          bValue = bDate
        }
        break
      default:
        return 0
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const isAllSelected = sortedAndFilteredWorkouts.length > 0 && selectedWorkouts.size === sortedAndFilteredWorkouts.length
  const isIndeterminate = selectedWorkouts.size > 0 && selectedWorkouts.size < sortedAndFilteredWorkouts.length

  const getSelectAllCheckedState = (): boolean => {
    return isAllSelected
  }

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedWorkouts(new Set())
    } else {
      setSelectedWorkouts(new Set(sortedAndFilteredWorkouts.map((workout) => workout.id)))
    }
  }

  const uniqueTypes = Array.from(new Set(mockWorkouts.map((w) => w.type))).sort()
  const uniqueLengths = Array.from(new Set(mockWorkouts.map((w) => w.length))).sort((a, b) => {
    const aWeeks = parseInt(a.split(" ")[0])
    const bWeeks = parseInt(b.split(" ")[0])
    if (isNaN(aWeeks) || isNaN(bWeeks)) return a.localeCompare(b)
    return aWeeks - bWeeks
  })

  const renderColumnHeader = (columnId: ColumnId, icon: React.ReactNode, label: string, tooltip?: string) => {
    const currentIndex = columnOrder.indexOf(columnId)
    const isFirst = currentIndex === 0
    const isLast = currentIndex === columnOrder.length - 1
    const isSorted = sortColumn === columnId
    const isAscending = isSorted && sortDirection === "asc"
    const isDescending = isSorted && sortDirection === "desc"

    const headerContent = (
      <div className="flex items-center gap-2 cursor-pointer h-full w-full">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-xs uppercase text-muted-foreground">{label}</span>
        {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
        {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
      </div>
    )

    const headerWidth = getColumnWidth(columnId, "pixel")

    return (
      <TableHead className={cn("!px-4 !py-0 h-10 border-b", getColumnWidth(columnId, "class"))}>
        <DropdownMenu>
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  {headerContent}
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent
                className="whitespace-normal break-words text-left"
                style={{ maxWidth: headerWidth }}
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuTrigger asChild>
              {headerContent}
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => handleSort(columnId, "asc")}
              className={cn(isAscending && "bg-accent")}
            >
              <ArrowUpNarrowWide className="size-4 mr-2" />
              <span className="flex-1">Sort ascending</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSort(columnId, "desc")}
              className={cn(isDescending && "bg-accent")}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">Sort descending</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleMoveColumn(columnId, "left")}
              disabled={isFirst}
            >
              <ChevronLeft className="size-4 mr-2" />
              <span>Move left</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleMoveColumn(columnId, "right")}
              disabled={isLast}
            >
              <ChevronRight className="size-4 mr-2" />
              <span>Move right</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableHead>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-semibold">Workouts</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors translate-y-[1px]"
                    aria-label="What is a workout?"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  A workout is a group of exercises and is for one day.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-foreground">
              {filteredWorkouts.length} {filteredWorkouts.length === 1 ? "workout" : "workouts"}
            </p>
          </div>
          <ButtonGroup>
            <Button
              variant="secondary"
              onClick={handleOpenAssignWorkout}
              className="gap-2"
              aria-label="Assign workout to athletes"
            >
              <UserPlus className="size-4" />
              <span>Assign</span>
            </Button>
            <ButtonGroupSeparator />
            <Button
              onClick={handleOpenCreateWorkout}
              className="gap-2"
              aria-label="Create workout"
            >
              <Plus className="size-4" />
              <span>Create workout</span>
            </Button>
          </ButtonGroup>
        </div>
      </div>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        <div className="w-full px-4 py-3 border-b flex items-center justify-between gap-4 flex-shrink-0">
          <div className="relative w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search..."
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Tag className="size-4" />
                  <span>Type: {typeFilter || "All"}</span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup
                  value={typeFilter || "all"}
                  onValueChange={(value) => setTypeFilter(value === "all" ? null : value)}
                >
                  <DropdownMenuRadioItem value="all" className={cn(typeFilter === null && "bg-accent")}>
                    <span className="flex-1">All</span>
                    {typeFilter === null && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                  {uniqueTypes.map((type) => (
                    <DropdownMenuRadioItem key={type} value={type} className={cn(typeFilter === type && "bg-accent")}>
                      <span className="flex-1">{type}</span>
                      {typeFilter === type && <Check className="ml-2 size-4" />}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Clock className="size-4" />
                  <span>Length: {lengthFilter || "All"}</span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup
                  value={lengthFilter || "all"}
                  onValueChange={(value) => setLengthFilter(value === "all" ? null : value)}
                >
                  <DropdownMenuRadioItem value="all" className={cn(lengthFilter === null && "bg-accent")}>
                    <span className="flex-1">All</span>
                    {lengthFilter === null && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                  {uniqueLengths.map((length) => (
                    <DropdownMenuRadioItem key={length} value={length} className={cn(lengthFilter === length && "bg-accent")}>
                      <span className="flex-1">{length}</span>
                      {lengthFilter === length && <Check className="ml-2 size-4" />}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              onClick={() => {
                const csvData = filteredWorkouts.map((workout) => ({
                  Program: workout.program,
                  Description: workout.description,
                  Type: workout.type,
                  Length: workout.length,
                  "Total Exercises": workout.totalExercises,
                  Equipment: workout.equipment,
                  Created: workout.created,
                }))
                exportToCSV(csvData, "workouts.csv")
              }}
              className="gap-2"
              aria-label="Export workouts to CSV"
            >
              <Download className="size-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto" style={{ paddingBottom: "16px" }}>
          <style dangerouslySetInnerHTML={{ __html: `
            tbody tr:hover td:first-child {
              background-color: hsl(var(--muted)) !important;
            }
            tbody tr[style*="background-color"] td:first-child {
              background-color: hsl(var(--muted)) !important;
            }
          ` }} />
          <Table className="table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "320px" }} />
              {columnOrder.map((columnId) => {
                return <col key={columnId} style={{ width: getColumnWidth(columnId, "pixel") }} />
              })}
            </colgroup>
            <TableHeader className="sticky top-0 z-20">
              <TableRow className="hover:bg-transparent h-10">
                <TableHead className="!px-4 !py-0 h-10 sticky left-0 z-30 bg-background border-r border-b" style={{ boxShadow: "2px 0 4px -2px rgba(0, 0, 0, 0.1)" }}>
                  <div className="flex items-center gap-3 h-full w-full">
                    <Checkbox
                      checked={getSelectAllCheckedState()}
                      onCheckedChange={handleToggleAll}
                      aria-label="Select all workouts"
                    />
                    <div className="flex items-center gap-2">
                      <FileText className="size-3 text-muted-foreground" />
                      <span className="text-xs uppercase text-muted-foreground">Workout</span>
                    </div>
                  </div>
                </TableHead>
                {columnOrder.map((columnId) => {
                  switch (columnId) {
                    case "description":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <FileText className="size-3" />, "Description", "A brief overview of the workout program")}
                        </React.Fragment>
                      )
                    case "type":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Tag className="size-3" />, "Type", "The category or style of the workout program")}
                        </React.Fragment>
                      )
                    case "length":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Clock className="size-3" />, "Length", "The duration of the workout program")}
                        </React.Fragment>
                      )
                    case "totalExercises":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Hash className="size-3" />, "Total Exercises", "The number of exercises in the workout program")}
                        </React.Fragment>
                      )
                    case "equipment":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Wrench className="size-3" />, "Equipment", "The equipment required for this workout program")}
                        </React.Fragment>
                      )
                    case "created":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Calendar className="size-3" />, "Created", "The date when the workout program was created")}
                        </React.Fragment>
                      )
                    default:
                      return null
                  }
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredWorkouts.map((workout) => {
                const isSelected = selectedWorkouts.has(workout.id)
                const isLastRow = sortedAndFilteredWorkouts.indexOf(workout) === sortedAndFilteredWorkouts.length - 1

                return (
                  <TableRow
                    key={workout.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open workout ${workout.program}`}
                    onClick={(event) => handleWorkoutRowClick(event, workout.id)}
                    onKeyDown={(event) => handleWorkoutRowKeyDown(event, workout.id)}
                    className={cn(
                      isSelected && "bg-muted/50",
                      "cursor-pointer group",
                      "[&:hover_td]:bg-muted"
                    )}
                    style={isSelected ? { backgroundColor: "hsl(var(--muted) / 0.5)" } : undefined}
                  >
                    <TableCell 
                      className={cn(
                        "!px-4 !py-2 h-[54px] sticky left-0 z-10 border-r border-b",
                        isSelected ? "!bg-muted" : "group-hover:!bg-muted !bg-background"
                      )}
                      style={{
                        boxShadow: "2px 0 4px -2px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <div className="flex items-center gap-3 h-full">
                        <div
                          className="flex items-center justify-center h-full"
                          data-no-row-link="true"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleWorkout(workout.id)}
                          />
                        </div>
                        <span className="font-medium truncate">{workout.program}</span>
                      </div>
                    </TableCell>
                    {columnOrder.map((columnId) => {
                      switch (columnId) {
                        case "description":
                          return (
                            <TableCell
                              key={columnId}
                              className={cn(
                                "!px-4 !py-2 h-[54px] overflow-hidden border-b",
                                isSelected ? "!bg-muted" : "group-hover:!bg-muted",
                                getColumnWidth(columnId, "class")
                              )}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`View full description for ${workout.program}`}
                                onClick={(e) => handleDescriptionClick(e, workout.description, workout.program)}
                                onKeyDown={(e) => handleDescriptionKeyDown(e, workout.description, workout.program)}
                                data-no-row-link="true"
                                className="flex items-center h-full cursor-pointer hover:text-primary transition-colors min-w-0 w-full"
                              >
                                <span className="text-sm truncate block min-w-0 w-full">{workout.description}</span>
                              </div>
                            </TableCell>
                          )
                        case "type":
                          return (
                            <TableCell
                              key={columnId}
                              className={cn(
                                "!px-4 !py-2 h-[54px] border-b",
                                isSelected ? "!bg-muted" : "group-hover:!bg-muted",
                                getColumnWidth(columnId, "class")
                              )}
                            >
                              <div className="flex items-center h-full">
                                <span className="text-sm">{workout.type}</span>
                              </div>
                            </TableCell>
                          )
                        case "length":
                          return (
                            <TableCell
                              key={columnId}
                              className={cn(
                                "!px-4 !py-2 h-[54px] border-b",
                                isSelected ? "!bg-muted" : "group-hover:!bg-muted",
                                getColumnWidth(columnId, "class")
                              )}
                            >
                              <div className="flex items-center h-full">
                                <span className="text-sm">{workout.length}</span>
                              </div>
                            </TableCell>
                          )
                        case "totalExercises":
                          return (
                            <TableCell
                              key={columnId}
                              className={cn(
                                "!px-4 !h-[54px] align-middle border-b",
                                isSelected ? "!bg-muted" : "group-hover:!bg-muted",
                                getColumnWidth(columnId, "class")
                              )}
                            >
                              <div className="flex items-center w-full">
                                <span className="text-sm">{workout.totalExercises}</span>
                              </div>
                            </TableCell>
                          )
                        case "equipment":
                          const equipmentList = workout.equipment.split(", ").filter((item) => item.trim() !== "")
                          return (
                            <TableCell
                              key={columnId}
                              className={cn(
                                "!px-4 !py-2 h-[54px] overflow-hidden border-b",
                                isSelected ? "!bg-muted" : "group-hover:!bg-muted",
                                getColumnWidth(columnId, "class")
                              )}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`View equipment for ${workout.program}`}
                                    data-no-row-link="true"
                                    className="flex items-center h-full cursor-pointer hover:text-primary transition-colors min-w-0 w-full"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        e.stopPropagation()
                                      }
                                    }}
                                  >
                                    <span className="text-sm truncate block min-w-0 w-full">{workout.equipment}</span>
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="start"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  {equipmentList.map((equipment, index) => (
                                    <DropdownMenuItem
                                      key={index}
                                      className="cursor-default pointer-events-none"
                                    >
                                      {equipment}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )
                        case "created":
                          return (
                            <TableCell
                              key={columnId}
                              className={cn(
                                "!px-4 !py-2 h-[54px] border-b",
                                isSelected ? "!bg-muted" : "group-hover:!bg-muted",
                                getColumnWidth(columnId, "class")
                              )}
                            >
                              <div className="flex items-center h-full">
                                <span className="text-sm">{formatDate(workout.created)}</span>
                              </div>
                            </TableCell>
                          )
                        default:
                          return null
                      }
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      {selectedDescription && (
        <DescriptionModal
          open={descriptionModalOpen}
          onOpenChange={setDescriptionModalOpen}
          description={selectedDescription.description}
          programName={selectedDescription.programName}
        />
      )}
      <SidePanel
        open={isCreateWorkoutOpen}
        onOpenChange={(open) => {
          setIsCreateWorkoutOpen(open)
          if (!open) {
            resetCreateWorkoutState()
          }
        }}
        title="New workout"
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleCreateWorkoutContinue}
              disabled={
                isCreateWorkoutStep2
                  ? false
                  : !newWorkoutName.trim() ||
                    !newWorkoutType ||
                    !newDifficulty ||
                    !newSelectedBuilder
              }
              aria-label={isCreateWorkoutStep2 ? "Generate workout" : "Continue"}
            >
              {isCreateWorkoutStep2 ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              ) : (
                "Continue"
              )}
            </Button>
            {isCreateWorkoutStep2 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateWorkoutBack}
                aria-label="Back to workout details"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseCreateWorkout}
              aria-label="Cancel creating workout"
            >
              Cancel
            </Button>
          </div>
        }
      >
        {!isCreateWorkoutStep2 ? (
          <BasicInformation
            workoutName={newWorkoutName}
            setWorkoutName={setNewWorkoutName}
            workoutType={newWorkoutType}
            setWorkoutType={setNewWorkoutType}
            difficulty={newDifficulty}
            setDifficulty={setNewDifficulty}
            description={newDescription}
            setDescription={setNewDescription}
            nameError={newNameError}
            setNameError={setNewNameError}
            typeError={newTypeError}
            setTypeError={setNewTypeError}
            difficultyError={newDifficultyError}
            setDifficultyError={setNewDifficultyError}
            selectedBuilder={newSelectedBuilder}
            setSelectedBuilder={setNewSelectedBuilder}
          />
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex flex-col items-center gap-4 flex-shrink-0 pb-4">
              <div className="relative flex items-center justify-center py-8 px-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-pink-400 blur-sm opacity-30 -z-10"></div>
                <div className="relative z-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-pink-400 text-white shadow-lg">
                  <BrainCog className="h-10 w-10" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-center">OneNinety AI Builder</h2>
              <p className="text-sm text-foreground text-center max-w-md">
                Drag and drop or select files to instantly convert it into OneNinety format or write the outline of your workout and let us translate it.
              </p>
            </div>
            <Separator className="-mx-4 w-[calc(100%+2rem)]" />
            <div className="flex-1 overflow-auto">
              <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-pink-400 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">Let&apos;s build a workout</h3>
              </div>
              <div className="relative">
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={8}
                  className="resize-none text-sm min-h-[200px] pb-12"
                  placeholder="Ask for an auto-made workout, explain what you want to be included in yours and write in whatever form you wish. Press Enter to add new lines."
                />
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                  aria-label="Select PDF file"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseExample}
                    className="h-7 px-3 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                    aria-label="Use example workout prompt"
                  >
                    Use our example
                  </button>
                  <button
                    type="button"
                    onClick={handlePdfButtonClick}
                    className="h-7 px-3 rounded-md bg-orange-100 text-orange-700 text-xs font-medium flex items-center gap-1.5 hover:bg-orange-200 transition-colors dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
                    aria-label="Select PDF file"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </button>
                </div>
              </div>
              {selectedPdfFile && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-100">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedPdfFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">PDF</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove PDF file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </SidePanel>
      <SidePanel
        open={isAssignWorkoutOpen}
        onOpenChange={setIsAssignWorkoutOpen}
        title="Assign workout"
      >
        <AssignAthletesList onAthleteSelected={() => setIsAssignWorkoutOpen(false)} />
      </SidePanel>
    </div>
  )
}

export default WorkoutsPage

