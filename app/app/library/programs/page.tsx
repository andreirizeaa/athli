"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
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
import { cn } from "@/lib/utils"
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
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [descriptionModalOpen, setDescriptionModalOpen] = useState<boolean>(false)
  const [selectedDescription, setSelectedDescription] = useState<{ description: string; programName: string } | null>(null)

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
    router.push(`/app/library/programs/${programId}`)

    if (typeof window !== "undefined") {
      const newHash = `#/app/library/programs/${programId}`
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }
  }

  const handleNavigateToAthletes = () => {
    router.push("/app/athletes")

    if (typeof window !== "undefined") {
      const newHash = "#/app/athletes"
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }
  }

  const handleNavigateToCreateProgram = () => {
    router.push("/app/library/programs/new")

    if (typeof window !== "undefined") {
      const newHash = "#/app/library/programs/new"
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }
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
        {icon}
        <span>{label}</span>
        {isAscending && <ArrowUpNarrowWide className="size-4 text-muted-foreground" />}
        {isDescending && <ArrowDownWideNarrow className="size-4 text-muted-foreground" />}
      </div>
    )

    const headerWidth = getColumnWidth(columnId, "pixel")

    return (
      <TableHead className={cn("!px-4 !py-0 h-10", getColumnWidth(columnId, "class"))}>
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
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold">Programs</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">
                ({filteredPrograms.length} {filteredPrograms.length === 1 ? "program" : "programs"})
              </p>
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
          </div>
          <ButtonGroup>
            <Button
              variant="secondary"
              onClick={handleNavigateToAthletes}
              className="gap-2"
              aria-label="Assign program to athletes"
            >
              <UserPlus className="size-4" />
              <span>Assign</span>
            </Button>
            <ButtonGroupSeparator />
            <Button
              onClick={handleNavigateToCreateProgram}
              className="gap-2"
              aria-label="Create program"
            >
              <Plus className="size-4" />
              <span>Create program</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
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
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Fixed left section - Checkbox + Program */}
          <div className="flex-shrink-0 border-r flex flex-col">
            <div className="flex-shrink-0">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow className="hover:bg-transparent h-10">
                    <TableHead className="!px-4 !py-0 w-[320px] h-10">
                      <div className="flex items-center gap-3 h-full w-full">
                        <Checkbox
                          checked={getSelectAllCheckedState()}
                          onCheckedChange={handleToggleAll}
                          aria-label="Select all programs"
                        />
                        <div className="flex items-center gap-2">
                        <FileText className="size-4" />
                        <span>Program</span>
                        </div>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            <div
              className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              id="table-scroll-container"
              onScroll={(e) => {
                const rightScroll = document.querySelector(".right-table-scroll")
                if (rightScroll && e.currentTarget) {
                  rightScroll.scrollTop = e.currentTarget.scrollTop
                }
              }}
            >
              <Table>
                <TableBody>
                  {sortedAndFilteredPrograms.map((program) => {
                    const isSelected = selectedPrograms.has(program.id)

                    return (
                      <TableRow
                        key={program.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open program ${program.program}`}
                        onClick={(event) => handleProgramRowClick(event, program.id)}
                        onKeyDown={(event) => handleProgramRowKeyDown(event, program.id)}
                        className={cn(isSelected && "bg-muted/50", "cursor-pointer")}
                      >
                        <TableCell className="!px-4 !py-2 h-[54px]">
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
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          {/* Scrollable right section - All other columns */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className="flex-1 overflow-y-auto overflow-x-auto right-table-scroll"
              onScroll={(e) => {
                const leftScroll = document.getElementById("table-scroll-container")
                if (leftScroll && e.currentTarget) {
                  leftScroll.scrollTop = e.currentTarget.scrollTop
                }
              }}
            >
              <Table className="table-fixed border-collapse">
                <colgroup>
                  {columnOrder.map((columnId) => {
                    return <col key={columnId} style={{ width: getColumnWidth(columnId, "pixel") }} />
                  })}
                </colgroup>
                <TableHeader className="sticky top-0 z-10 bg-sidebar">
                  <TableRow className="hover:bg-transparent">
                    {columnOrder.map((columnId) => {
                      switch (columnId) {
                        case "description":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <FileText className="size-4" />, "Description", "A brief overview of the program")}
                            </React.Fragment>
                          )
                        case "type":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Tag className="size-4" />, "Type", "The category or style of the program")}
                            </React.Fragment>
                          )
                        case "length":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Clock className="size-4" />, "Length", "The duration of the program")}
                            </React.Fragment>
                          )
                        case "totalExercises":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Hash className="size-4" />, "Total Exercises", "The number of exercises in the program")}
                            </React.Fragment>
                          )
                        case "equipment":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Wrench className="size-4" />, "Equipment", "The equipment required for this program")}
                            </React.Fragment>
                          )
                        case "created":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Calendar className="size-4" />, "Created", "The date when the program was created")}
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

                    return (
                      <TableRow
                        key={program.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open program ${program.program}`}
                        onClick={(event) => handleProgramRowClick(event, program.id)}
                        onKeyDown={(event) => handleProgramRowKeyDown(event, program.id)}
                        className={cn(isSelected && "bg-muted/50", "cursor-pointer")}
                      >
                        {columnOrder.map((columnId) => {
                          switch (columnId) {
                            case "description":
                              return (
                                <TableCell
                                  key={columnId}
                                  className={cn("!px-4 !py-2 h-[54px] overflow-hidden", getColumnWidth(columnId, "class"))}
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
                                  className={cn("!px-4 !py-2 h-[54px]", getColumnWidth(columnId, "class"))}
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
                                  className={cn("!px-4 !py-2 h-[54px]", getColumnWidth(columnId, "class"))}
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
                                  className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
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
                                  className={cn("!px-4 !py-2 h-[54px] overflow-hidden", getColumnWidth(columnId, "class"))}
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
                                  className={cn("!px-4 !py-2 h-[54px]", getColumnWidth(columnId, "class"))}
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
    </div>
  )
}

export default ProgramsPage

