"use client"

import React, { useState, useRef, useEffect } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { SidePanel } from "@/components/app/side-panel"
import { AssignAthletesList } from "@/components/app/assign-athletes-list"
import { EditColumnsSidebar } from "@/components/app/edit-columns-sidebar"
import { cn } from "@/lib/utils"
import { exportToCSV } from "@/lib/csv-export"
import DescriptionModal from "./description-modal"
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
  Download,
  Settings,
} from "lucide-react"

import type { Program } from "@/components/app/app-shell"
import { mockPrograms } from "@/components/app/app-shell"

type ColumnId = "description" | "type" | "length" | "totalExercises" | "equipment" | "created"

const COLUMN_ORDER: ColumnId[] = [
  "description",
  "type",
  "length",
  "totalExercises",
  "equipment",
  "created",
]

const PROGRAM_COLUMN_DEFINITIONS = [
  { id: "description", label: "Description", icon: <FileText className="size-3" /> },
  { id: "type", label: "Type", icon: <Tag className="size-3" /> },
  { id: "length", label: "Length", icon: <Clock className="size-3" /> },
  { id: "totalExercises", label: "Total Exercises", icon: <Hash className="size-3" /> },
  { id: "equipment", label: "Equipment", icon: <Wrench className="size-3" /> },
  { id: "created", label: "Created", icon: <Calendar className="size-3" /> },
]

const PROGRAM_TYPES = [
  "Weightlifting",
  "Bodyweight",
  "Cardio",
  "HIIT",
  "CrossFit",
  "Running",
  "Cycling",
  "Swimming",
  "Yoga",
  "Pilates",
  "Combination",
] as const

const PROGRAM_DIFFICULTY_LEVELS = [
  "All levels",
  "Beginner",
  "Intermediate",
  "Advanced",
] as const

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

const ProgramsPage = () => {
  const router = useRouter()
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [lengthFilter, setLengthFilter] = useState<string | null>(null)
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(COLUMN_ORDER)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER))
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState<boolean>(false)
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [descriptionModalOpen, setDescriptionModalOpen] = useState<boolean>(false)
  const [selectedDescription, setSelectedDescription] = useState<{ description: string; programName: string } | null>(null)
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState<boolean>(false)
  const [newProgramName, setNewProgramName] = useState<string>("")
  const [newProgramType, setNewProgramType] = useState<string>("")
  const [newProgramDifficulty, setNewProgramDifficulty] = useState<string>("all levels")
  const [newProgramWeeks, setNewProgramWeeks] = useState<string>("")
  const [newProgramDescription, setNewProgramDescription] = useState<string>("")
  const [newProgramError, setNewProgramError] = useState<string | null>(null)
  const [newProgramTypeError, setNewProgramTypeError] = useState<string | null>(null)
  const [newProgramDifficultyError, setNewProgramDifficultyError] = useState<string | null>(null)
  const [newProgramBuilder, setNewProgramBuilder] = useState<"standard" | "ai" | null>("ai")
  const [isAssignProgramOpen, setIsAssignProgramOpen] = useState<boolean>(false)

  const handleToggleProgram = (programId: string) => {
    setSelectedPrograms((prev) => {
      const next = new Set(prev)
      if (next.has(programId)) {
        next.delete(programId)
      } else {
        next.add(programId)
      }
      return next
    })
  }

  const handleNavigateToProgram = (programId: string) => {
    router.push(`/library/programs/${programId}`)
  }

  const handleNavigateToAthletes = () => {
    router.push("/athletes")
  }

  const handleOpenAssignProgram = () => {
    setIsAssignProgramOpen(true)
  }

  const resetCreateProgramState = () => {
    setNewProgramName("")
    setNewProgramType("")
    setNewProgramDifficulty("all levels")
    setNewProgramWeeks("")
    setNewProgramDescription("")
    setNewProgramError(null)
    setNewProgramTypeError(null)
    setNewProgramDifficultyError(null)
    setNewProgramBuilder("ai")
  }

  const handleOpenCreateProgram = () => {
    resetCreateProgramState()
    setIsCreateProgramOpen(true)
  }

  const handleCloseCreateProgram = () => {
    setIsCreateProgramOpen(false)
  }

  const handleCreateProgramContinue = () => {
    if (!newProgramName.trim()) {
      setNewProgramError("Program name is required")
      return
    }

    if (!newProgramType) {
      setNewProgramTypeError("Program type is required")
      return
    }

    if (!newProgramDifficulty) {
      setNewProgramDifficultyError("Difficulty is required")
      return
    }

    if (!newProgramBuilder) {
      return
    }

    setIsCreateProgramOpen(false)

    router.push("/library/programs/new")
  }

  const handleProgramRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    programId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      const targetElement = event.target as HTMLElement
      if (targetElement.closest('[data-no-row-link="true"]')) {
        return
      }

      event.preventDefault()
      handleNavigateToProgram(programId)
    }
  }

  const handleProgramRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    programId: string,
  ) => {
    const targetElement = event.target as HTMLElement
    if (targetElement.closest('[data-no-row-link="true"]')) {
      return
    }

    handleNavigateToProgram(programId)
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

  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem("column_preferences") || "{}")
      const programsPrefs = preferences.programs
      if (programsPrefs) {
        if (programsPrefs.visibleColumns && Array.isArray(programsPrefs.visibleColumns)) {
          setVisibleColumns(new Set(programsPrefs.visibleColumns))
        }
        if (programsPrefs.columnOrder && Array.isArray(programsPrefs.columnOrder)) {
          setColumnOrder(programsPrefs.columnOrder)
        }
      }
    } catch (error) {
      console.error("Failed to load column preferences:", error)
    }
  }, [])

  const handleColumnsChange = (newVisibleColumns: string[], newColumnOrder: string[]) => {
    setVisibleColumns(new Set(newVisibleColumns))
    setColumnOrder(newColumnOrder as ColumnId[])
  }

  const filteredColumnOrder = columnOrder.filter((colId) => visibleColumns.has(colId))

  const filteredPrograms = mockPrograms.filter((program) => {
    const matchesSearch = !searchQuery.trim() ||
      isFuzzyMatch(program.program, searchQuery) ||
      isFuzzyMatch(program.description, searchQuery) ||
      isFuzzyMatch(program.type, searchQuery) ||
      isFuzzyMatch(program.equipment, searchQuery)

    const matchesType = !typeFilter || program.type === typeFilter

    const matchesLength = !lengthFilter || program.length === lengthFilter

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

  const sortedAndFilteredPrograms = [...filteredPrograms].sort((a, b) => {
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

  const isAllSelected = sortedAndFilteredPrograms.length > 0 && selectedPrograms.size === sortedAndFilteredPrograms.length
  const isIndeterminate = selectedPrograms.size > 0 && selectedPrograms.size < sortedAndFilteredPrograms.length

  const getSelectAllCheckedState = (): boolean => {
    return isAllSelected
  }

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedPrograms(new Set())
    } else {
      setSelectedPrograms(new Set(sortedAndFilteredPrograms.map((program) => program.id)))
    }
  }

  const uniqueTypes = Array.from(new Set(mockPrograms.map((w) => w.type))).sort()
  const uniqueLengths = Array.from(new Set(mockPrograms.map((w) => w.length))).sort((a, b) => {
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
              <h1 className="text-lg font-semibold">Programs</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors translate-y-[1px]"
                    aria-label="What is a program?"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  A program is a group of workouts and can span multiple weeks.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-foreground">
              {filteredPrograms.length} {filteredPrograms.length === 1 ? "program" : "programs"}
            </p>
          </div>
          <ButtonGroup>
            <Button
              variant="secondary"
              onClick={handleOpenAssignProgram}
              className="gap-2"
              aria-label="Assign program to athletes"
            >
              <UserPlus className="size-4" />
              <span>Assign</span>
            </Button>
            <ButtonGroupSeparator />
            <Button
              onClick={handleOpenCreateProgram}
              className="gap-2"
              aria-label="Create program"
            >
              <Plus className="size-4" />
              <span>Create program</span>
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
              onClick={() => setIsEditColumnsOpen(true)}
              className="gap-2"
              aria-label="Edit columns"
            >
              <Settings className="size-4" />
              <span>Edit columns</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const csvData = filteredPrograms.map((program) => ({
                  Program: program.program,
                  Description: program.description,
                  Type: program.type,
                  Length: program.length,
                  "Total Exercises": program.totalExercises,
                  Equipment: program.equipment,
                  Created: program.created,
                }))
                exportToCSV(csvData, "programs.csv")
              }}
              className="gap-2"
              aria-label="Export programs to CSV"
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
              {filteredColumnOrder.map((columnId) => {
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
                      aria-label="Select all programs"
                    />
                    <div className="flex items-center gap-2">
                      <FileText className="size-3 text-muted-foreground" />
                      <span className="text-xs uppercase text-muted-foreground">Program</span>
                    </div>
                  </div>
                </TableHead>
                {filteredColumnOrder.map((columnId) => {
                  switch (columnId) {
                    case "description":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <FileText className="size-3" />, "Description", "A brief overview of the program")}
                        </React.Fragment>
                      )
                    case "type":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Tag className="size-3" />, "Type", "The category or style of the program")}
                        </React.Fragment>
                      )
                    case "length":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Clock className="size-3" />, "Length", "The duration of the program")}
                        </React.Fragment>
                      )
                    case "totalExercises":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Hash className="size-3" />, "Total Exercises", "The number of exercises in the program")}
                        </React.Fragment>
                      )
                    case "equipment":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Wrench className="size-3" />, "Equipment", "The equipment required for this program")}
                        </React.Fragment>
                      )
                    case "created":
                      return (
                        <React.Fragment key={columnId}>
                          {renderColumnHeader(columnId, <Calendar className="size-3" />, "Created", "The date when the program was created")}
                        </React.Fragment>
                      )
                    default:
                      return null
                  }
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredPrograms.map((program) => {
                const isSelected = selectedPrograms.has(program.id)
                const isLastRow = sortedAndFilteredPrograms.indexOf(program) === sortedAndFilteredPrograms.length - 1

                return (
                  <TableRow
                    key={program.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open program ${program.program}`}
                    onClick={(event) => handleProgramRowClick(event, program.id)}
                    onKeyDown={(event) => handleProgramRowKeyDown(event, program.id)}
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
                            onCheckedChange={() => handleToggleProgram(program.id)}
                          />
                        </div>
                        <span className="font-medium truncate">{program.program}</span>
                      </div>
                    </TableCell>
                    {filteredColumnOrder.map((columnId) => {
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
                                aria-label={`View full description for ${program.program}`}
                                onClick={(e) => handleDescriptionClick(e, program.description, program.program)}
                                onKeyDown={(e) => handleDescriptionKeyDown(e, program.description, program.program)}
                                data-no-row-link="true"
                                className="flex items-center h-full cursor-pointer hover:text-primary transition-colors min-w-0 w-full"
                              >
                                <span className="text-sm truncate block min-w-0 w-full">{program.description}</span>
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
                                <span className="text-sm">{program.type}</span>
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
                                <span className="text-sm">{program.length}</span>
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
                                <span className="text-sm">{program.totalExercises}</span>
                              </div>
                            </TableCell>
                          )
                        case "equipment":
                          const equipmentList = program.equipment.split(", ").filter((item) => item.trim() !== "")
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
                                    aria-label={`View equipment for ${program.program}`}
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
                                    <span className="text-sm truncate block min-w-0 w-full">{program.equipment}</span>
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
                                <span className="text-sm">{formatDate(program.created)}</span>
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
        <EditColumnsSidebar
          open={isEditColumnsOpen}
          onOpenChange={setIsEditColumnsOpen}
          gridKey="programs"
          columns={PROGRAM_COLUMN_DEFINITIONS}
          visibleColumns={Array.from(visibleColumns)}
          columnOrder={columnOrder}
          pinnedColumns={[]}
          onColumnsChange={handleColumnsChange}
        />
      )}
      <SidePanel
        open={isAssignProgramOpen}
        onOpenChange={setIsAssignProgramOpen}
        title="Assign program"
      >
        <AssignAthletesList onAthleteSelected={() => setIsAssignProgramOpen(false)} />
      </SidePanel>
      <SidePanel
        open={isCreateProgramOpen}
        onOpenChange={(open) => {
          setIsCreateProgramOpen(open)
          if (!open) {
            resetCreateProgramState()
          }
        }}
        title="New program"
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleCreateProgramContinue}
              disabled={
                !newProgramName.trim() ||
                !newProgramType ||
                !newProgramDifficulty ||
                !newProgramBuilder
              }
              aria-label="Continue to builder"
            >
              Continue to builder
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseCreateProgram}
              aria-label="Cancel creating program"
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="program-name" className="text-sm font-medium">
                Program Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="program-name"
                type="text"
                placeholder="Name..."
                value={newProgramName}
                onChange={(event) => {
                  setNewProgramName(event.target.value)
                  if (newProgramError) {
                    setNewProgramError(null)
                  }
                }}
                className="w-full"
                aria-invalid={!!newProgramError}
              />
              {newProgramError && (
                <p className="text-sm text-destructive">{newProgramError}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="program-type" className="text-sm font-medium">
                Type <span className="text-destructive">*</span>
              </label>
              <Select
                value={newProgramType}
                onValueChange={(value) => {
                  setNewProgramType(value)
                  if (newProgramTypeError) {
                    setNewProgramTypeError(null)
                  }
                }}
              >
                <SelectTrigger
                  id="program-type"
                  className={cn(
                    "w-full",
                    newProgramTypeError &&
                      "border-destructive aria-invalid:border-destructive",
                  )}
                  aria-invalid={!!newProgramTypeError}
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newProgramTypeError && (
                <p className="text-sm text-destructive">
                  {newProgramTypeError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="program-difficulty" className="text-sm font-medium">
                Difficulty <span className="text-destructive">*</span>
              </label>
              <Select
                value={newProgramDifficulty}
                onValueChange={(value) => {
                  setNewProgramDifficulty(value)
                  if (newProgramDifficultyError) {
                    setNewProgramDifficultyError(null)
                  }
                }}
              >
                <SelectTrigger
                  id="program-difficulty"
                  className={cn(
                    "w-full",
                    newProgramDifficultyError &&
                      "border-destructive aria-invalid:border-destructive",
                  )}
                  aria-invalid={!!newProgramDifficultyError}
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem
                      key={level}
                      value={level.toLowerCase()}
                    >
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newProgramDifficultyError && (
                <p className="text-sm text-destructive">
                  {newProgramDifficultyError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="program-weeks" className="text-sm font-medium">
                Weeks
              </label>
              <Input
                id="program-weeks"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="Number of weeks"
                value={newProgramWeeks}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^0-9]/g, "")
                  setNewProgramWeeks(value)
                }}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="program-description" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            </label>
            <Textarea
              id="program-description"
              value={newProgramDescription}
              onChange={(event) =>
                setNewProgramDescription(event.target.value)
              }
              placeholder="Add a description for your program..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              Select how you wish to start <span className="text-destructive">*</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNewProgramBuilder("ai")}
                className={cn(
                  "relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left",
                  newProgramBuilder === "ai"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "bg-background hover:bg-accent/30",
                )}
                aria-label="Use OneNinety AI to build program"
              >
                <p className="text-sm font-semibold mb-1">OneNinety AI</p>
                <p
                  className={cn(
                    "text-xs",
                    newProgramBuilder === "ai"
                      ? "text-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  AI Program Builder
                </p>
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2",
                    newProgramBuilder === "ai"
                      ? "border-primary bg-primary/10"
                      : "border-input bg-background",
                  )}
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      newProgramBuilder === "ai"
                        ? "bg-primary"
                        : "bg-transparent",
                    )}
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setNewProgramBuilder("standard")}
                className={cn(
                  "relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left",
                  newProgramBuilder === "standard"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "bg-background hover:bg-accent/30",
                )}
                aria-label="Manually build program"
              >
                <p className="text-sm font-semibold mb-1">Standard Builder</p>
                <p
                  className={cn(
                    "text-xs",
                    newProgramBuilder === "standard"
                      ? "text-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  Manually build your program
                </p>
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2",
                    newProgramBuilder === "standard"
                      ? "border-primary bg-primary/10"
                      : "border-input bg-background",
                  )}
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      newProgramBuilder === "standard"
                        ? "bg-primary"
                        : "bg-transparent",
                    )}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </SidePanel>
    </div>
  )
}

export default ProgramsPage

