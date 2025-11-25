"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail, Search, User } from "lucide-react"

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
import { mockAthletes } from "@/components/app/app-shell"
import { cn } from "@/lib/utils"

type AssignAthletesListProps = {
  onAthleteSelected?: () => void
}

export const AssignAthletesList = ({
  onAthleteSelected,
}: AssignAthletesListProps) => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState<string>("")

  const filteredAthletes = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return mockAthletes
    }

    return mockAthletes.filter((athlete) => {
      const name = athlete.name.toLowerCase()
      const email = athlete.email.toLowerCase()
      const country = athlete.country.toLowerCase()

      return (
        name.includes(query) ||
        email.includes(query) ||
        country.includes(query)
      )
    })
  }, [searchQuery])

  const handleNavigateToTrainingCalendar = (athleteId: string) => {
    router.push(`/app/athletes/${athleteId}/training-calendar`)

    if (typeof window !== "undefined") {
      const newHash = `#/app/athletes/${athleteId}/training-calendar`
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }

    if (onAthleteSelected) {
      onAthleteSelected()
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
          <TableHeader className="bg-sidebar">
            <TableRow className="hover:bg-transparent h-10">
              <TableHead className="!px-4 !py-0 h-10 w-[240px]">
                <div className="flex h-full w-full items-center gap-2">
                  <User className="size-4" />
                  <span className="text-sm font-medium">Athlete</span>
                </div>
              </TableHead>
              <TableHead className="!px-4 !py-0 h-10">
                <div className="flex h-full w-full items-center gap-2">
                  <Mail className="size-4" />
                  <span className="text-sm font-medium">Email</span>
                </div>
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


