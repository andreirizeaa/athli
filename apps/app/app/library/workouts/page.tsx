"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
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
import { DataGrid, type ColumnDefinition, type FilterDefinition } from "@/components/app/data-grid"
import { cn } from "@/lib/utils"
import { generateWorkoutFromPrompt } from "@/lib/generate-exercise"
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
  Settings,
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

const WORKOUT_COLUMN_DEFINITIONS = [
  { id: "description", label: "Description", icon: <FileText className="size-3" /> },
  { id: "type", label: "Type", icon: <Tag className="size-3" /> },
  { id: "length", label: "Length", icon: <Clock className="size-3" /> },
  { id: "totalExercises", label: "Total Exercises", icon: <Hash className="size-3" /> },
  { id: "equipment", label: "Equipment", icon: <Wrench className="size-3" /> },
  { id: "created", label: "Created", icon: <Calendar className="size-3" /> },
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
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [lengthFilter, setLengthFilter] = useState<string | null>(null)
  const [columnOrder] = useState<ColumnId[]>(COLUMN_ORDER)
  const [visibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER))
  const [descriptionModalOpen, setDescriptionModalOpen] = useState<boolean>(false)
  const itemsPerPage = 25
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

  const filteredColumnOrder = columnOrder.filter((colId) => visibleColumns.has(colId))

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

  const uniqueTypes = Array.from(new Set(mockWorkouts.map((w) => w.type))).sort()
  const uniqueLengths = Array.from(new Set(mockWorkouts.map((w) => w.length))).sort((a, b) => {
    const aWeeks = parseInt(a.split(" ")[0])
    const bWeeks = parseInt(b.split(" ")[0])
    if (isNaN(aWeeks) || isNaN(bWeeks)) return a.localeCompare(b)
    return aWeeks - bWeeks
  })

  // Create column definitions for DataGrid
  // Add "program" column for sorting (not in filteredColumnOrder so it won't render)
  const allColumns: ColumnDefinition<Workout>[] = [
    {
      id: "program",
      label: "Workout",
      icon: <FileText className="size-3" />,
      getSortValue: (row) => row.program.toLowerCase(),
      getSearchValue: (row) => row.program,
    },
    ...filteredColumnOrder.map((columnId): ColumnDefinition<Workout> => {
    switch (columnId) {
      case "description":
        return {
          id: "description",
          label: "Description",
          icon: <FileText className="size-3" />,
          width: { class: getColumnWidth("description", "class"), pixel: getColumnWidth("description", "pixel") },
          tooltip: "A brief overview of the workout program",
          getSortValue: (row) => row.description.toLowerCase(),
          getSearchValue: (row) => `${row.program} ${row.description} ${row.type} ${row.equipment}`,
          renderCell: (row) => (
            <div
              role="button"
              tabIndex={0}
              aria-label={`View full description for ${row.program}`}
              onClick={(e) => {
                e.stopPropagation()
                handleDescriptionClick(e, row.description, row.program)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDescriptionClick(e, row.description, row.program)
                }
              }}
              data-no-row-link="true"
              className="flex items-center h-full cursor-pointer hover:text-primary transition-colors min-w-0 w-full"
            >
              <span className="text-sm truncate block min-w-0 w-full">{row.description}</span>
            </div>
          ),
        }
      case "type":
        return {
          id: "type",
          label: "Type",
          icon: <Tag className="size-3" />,
          width: { class: getColumnWidth("type", "class"), pixel: getColumnWidth("type", "pixel") },
          tooltip: "The category or style of the workout program",
          getSortValue: (row) => row.type.toLowerCase(),
          renderCell: (row) => (
            <div className="flex items-center h-full">
              <span className="text-sm">{row.type}</span>
            </div>
          ),
        }
      case "length":
        return {
          id: "length",
          label: "Length",
          icon: <Clock className="size-3" />,
          width: { class: getColumnWidth("length", "class"), pixel: getColumnWidth("length", "pixel") },
          tooltip: "The duration of the workout program",
          getSortValue: (row) => {
            const weeks = parseInt(row.length.split(" ")[0])
            return isNaN(weeks) ? 0 : weeks
          },
          renderCell: (row) => (
            <div className="flex items-center h-full">
              <span className="text-sm">{row.length}</span>
            </div>
          ),
        }
      case "totalExercises":
        return {
          id: "totalExercises",
          label: "Total Exercises",
          icon: <Hash className="size-3" />,
          width: { class: getColumnWidth("totalExercises", "class"), pixel: getColumnWidth("totalExercises", "pixel") },
          tooltip: "The number of exercises in the workout program",
          getSortValue: (row) => row.totalExercises,
          renderCell: (row) => (
            <div className="flex items-center w-full">
              <span className="text-sm">{row.totalExercises}</span>
            </div>
          ),
        }
      case "equipment":
        return {
          id: "equipment",
          label: "Equipment",
          icon: <Wrench className="size-3" />,
          width: { class: getColumnWidth("equipment", "class"), pixel: getColumnWidth("equipment", "pixel") },
          tooltip: "The equipment required for this workout program",
          getSortValue: (row) => row.equipment.toLowerCase(),
          renderCell: (row) => {
            const equipmentList = row.equipment.split(", ").filter((item) => item.trim() !== "")
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`View equipment for ${row.program}`}
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
                    <span className="text-sm truncate block min-w-0 w-full">{row.equipment}</span>
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
            )
          },
        }
      case "created":
        return {
          id: "created",
          label: "Created",
          icon: <Calendar className="size-3" />,
          width: { class: getColumnWidth("created", "class"), pixel: getColumnWidth("created", "pixel") },
          tooltip: "The date when the workout program was created",
          getSortValue: (row) => {
            const [day, month, year] = row.created.split("-").map(Number)
            return new Date(2000 + year, month - 1, day).getTime()
          },
          renderCell: (row) => (
            <div className="flex items-center h-full">
              <span className="text-sm">{formatDate(row.created)}</span>
            </div>
          ),
        }
      default:
        return {
          id: columnId,
          label: columnId,
          getSortValue: () => "",
          renderCell: () => null,
        }
    }
  }),
  ]

  const columns: ColumnDefinition<Workout>[] = allColumns

  // Create filter definitions
  const filters: FilterDefinition<Workout>[] = [
    {
      id: "type",
      label: "Type",
      icon: <Tag className="size-4" />,
      options: [
        { value: "all", label: "All" },
        ...uniqueTypes.map((type) => ({ value: type, label: type })),
      ],
      getFilterValue: (row) => row.type,
      defaultValue: typeFilter,
    },
    {
      id: "length",
      label: "Length",
      icon: <Clock className="size-4" />,
      options: [
        { value: "all", label: "All" },
        ...uniqueLengths.map((length) => ({ value: length, label: length })),
      ],
      getFilterValue: (row) => row.length,
      defaultValue: lengthFilter,
    },
  ]

  // Create first column renderer
  const renderFirstColumn = (workout: Workout, isSelected: boolean) => {
    return (
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
        <span className="text-sm truncate">{workout.program}</span>
      </div>
    )
  }

  // Create first column header with sorting
  const renderFirstColumnHeader = ({
    isSorted,
    isAscending,
    isDescending,
    onSort,
    isAllSelected,
    onToggleAll,
    enableRowSelection,
  }: {
    isSorted: boolean
    isAscending: boolean
    isDescending: boolean
    onSort: (direction: "asc" | "desc") => void
    isAllSelected: boolean
    onToggleAll: () => void
    enableRowSelection: boolean
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        {enableRowSelection && (
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label="Select all workouts"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <FileText className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">Workout</span>
              {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onSort("asc")}
              className={cn(isAscending && "bg-accent")}
            >
              <ArrowUpNarrowWide className="size-4 mr-2" />
              <span className="flex-1">Sort ascending</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort("desc")}
              className={cn(isDescending && "bg-accent")}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">Sort descending</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }


  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={mockWorkouts}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="workouts"
        subtitle={(count) => `${count} ${count === 1 ? "workout" : "workouts"}`}
        itemsPerPage={itemsPerPage}
        enableSearch={true}
        searchPlaceholder="Search..."
        filters={filters}
        enableEditColumns={true}
        enableExport={true}
        exportFileName="workouts.csv"
        exportDataTransform={(row) => ({
          Program: row.program,
          Description: row.description,
          Type: row.type,
          Length: row.length,
          "Total Exercises": row.totalExercises,
          Equipment: row.equipment,
          Created: row.created,
        })}
        enableRowSelection={true}
        selectedRowIds={selectedWorkouts}
        onSelectionChange={setSelectedWorkouts}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return
          }
          handleNavigateToWorkout(row.id)
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === "Enter" || event.key === " ") {
            const targetElement = event.target as HTMLElement
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return
            }
            event.preventDefault()
            handleNavigateToWorkout(row.id)
          }
        }}
        defaultColumnOrder={COLUMN_ORDER}
        defaultVisibleColumns={COLUMN_ORDER}
        customActions={
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
        }
        emptyMessage="No workouts found."
        rowHeight="54px"
        stickyFirstColumn={true}
        firstColumnWidth="320px"
        firstColumnId="program"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
      />
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

