"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail, Search, User, ArrowUpNarrowWide, ArrowDownWideNarrow, Check } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockAthletes } from "@/components/app/app-shell"
import { cn } from "@/lib/utils"

type AssignAthletesListProps = {
  onAthleteSelected?: (athleteId?: string) => void
  navigateOnSelect?: boolean
}

type SortColumn = "name" | "email" | null

export const AssignAthletesList = ({
  onAthleteSelected,
  navigateOnSelect = true,
}: AssignAthletesListProps) => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [sortColumn, setSortColumn] = React.useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>(null)

  const filteredAthletes = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let athletes = mockAthletes

    if (query) {
      athletes = mockAthletes.filter((athlete) => {
      const name = athlete.name.toLowerCase()
      const email = athlete.email.toLowerCase()
      const country = athlete.country.toLowerCase()

      return (
        name.includes(query) ||
        email.includes(query) ||
        country.includes(query)
      )
    })
    }

    if (!sortColumn || !sortDirection) {
      return athletes
    }

    return [...athletes].sort((a, b) => {
      let aValue: string
      let bValue: string

      if (sortColumn === "name") {
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
      } else {
        aValue = a.email.toLowerCase()
        bValue = b.email.toLowerCase()
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1
      }
      return 0
    })
  }, [searchQuery, sortColumn, sortDirection])

  const handleSort = (column: SortColumn, direction: "asc" | "desc") => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const handleNavigateToTrainingCalendar = (athleteId: string) => {
    if (navigateOnSelect) {
      router.push(`/athletes/${athleteId}/training-calendar`)
    }

    if (onAthleteSelected) {
      onAthleteSelected(athleteId)
    }
  }

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    athleteId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleNavigateToTrainingCalendar(athleteId)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("")
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search athletes..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full pl-9"
          aria-label="Search athletes"
        />
      </div>
      <div className="-mx-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent h-10">
              <TableHead className="!px-4 !py-0 h-10 w-[240px] border-t border-b">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex h-full w-full items-center gap-2 cursor-pointer">
                      <User className="size-3 text-muted-foreground" />
                      <span className="text-xs uppercase text-muted-foreground">Athlete</span>
                      {sortColumn === "name" && sortDirection === "asc" && (
                        <ArrowUpNarrowWide className="size-3 text-muted-foreground" />
                      )}
                      {sortColumn === "name" && sortDirection === "desc" && (
                        <ArrowDownWideNarrow className="size-3 text-muted-foreground" />
                      )}
                </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => handleSort("name", "asc")}
                      className={cn(sortColumn === "name" && sortDirection === "asc" && "bg-accent")}
                    >
                      <ArrowUpNarrowWide className="size-4 mr-2" />
                      <span className="flex-1">Sort ascending</span>
                      {sortColumn === "name" && sortDirection === "asc" && <Check className="ml-2 size-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSort("name", "desc")}
                      className={cn(sortColumn === "name" && sortDirection === "desc" && "bg-accent")}
                    >
                      <ArrowDownWideNarrow className="size-4 mr-2" />
                      <span className="flex-1">Sort descending</span>
                      {sortColumn === "name" && sortDirection === "desc" && <Check className="ml-2 size-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableHead>
              <TableHead className="!px-4 !py-0 h-10 border-t border-b">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex h-full w-full items-center gap-2 cursor-pointer">
                      <Mail className="size-3 text-muted-foreground" />
                      <span className="text-xs uppercase text-muted-foreground">Email</span>
                      {sortColumn === "email" && sortDirection === "asc" && (
                        <ArrowUpNarrowWide className="size-3 text-muted-foreground" />
                      )}
                      {sortColumn === "email" && sortDirection === "desc" && (
                        <ArrowDownWideNarrow className="size-3 text-muted-foreground" />
                      )}
                </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => handleSort("email", "asc")}
                      className={cn(sortColumn === "email" && sortDirection === "asc" && "bg-accent")}
                    >
                      <ArrowUpNarrowWide className="size-4 mr-2" />
                      <span className="flex-1">Sort ascending</span>
                      {sortColumn === "email" && sortDirection === "asc" && <Check className="ml-2 size-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSort("email", "desc")}
                      className={cn(sortColumn === "email" && sortDirection === "desc" && "bg-accent")}
                    >
                      <ArrowDownWideNarrow className="size-4 mr-2" />
                      <span className="flex-1">Sort descending</span>
                      {sortColumn === "email" && sortDirection === "desc" && <Check className="ml-2 size-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAthletes.length === 0 && (
              <TableRow className="hover:bg-transparent !h-[54px]">
                <TableCell className="!px-4 !h-[54px] align-middle text-sm text-muted-foreground">
                  No athletes found.
                </TableCell>
              </TableRow>
            )}
            {filteredAthletes.map((athlete) => {
              const initials = getInitials(athlete.name)

              return (
                <TableRow
                  key={athlete.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open training calendar for ${athlete.name}`}
                  onClick={() => handleNavigateToTrainingCalendar(athlete.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, athlete.id)}
                  className="cursor-pointer !h-[54px]"
                >
                  <TableCell className="!px-4 !h-[54px] align-middle">
                    <div className="flex items-center gap-3 h-full">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={athlete.avatar} alt={athlete.name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className={cn("truncate text-sm font-medium")}>
                        {athlete.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="!px-4 !h-[54px] align-middle">
                    <span className="truncate text-sm">
                      {athlete.email}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


