"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { mockAthletes } from "@/components/app/app-shell"
import { DataGrid, type ColumnDefinition } from "@/components/app/data-grid"
import { cn } from "@/lib/utils"

type AssignAthletesListProps = {
  onAthleteSelected?: (athleteId?: string) => void
  navigateOnSelect?: boolean
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("")
}

export const AssignAthletesList = ({
  onAthleteSelected,
  navigateOnSelect = true,
}: AssignAthletesListProps) => {
  const router = useRouter()

  const handleNavigateToTrainingCalendar = (athleteId: string) => {
    if (navigateOnSelect) {
      router.push(`/athletes/${athleteId}/training-calendar`)
    }

    if (onAthleteSelected) {
      onAthleteSelected(athleteId)
    }
  }

  const handleRowKeyDown = (
    row: typeof mockAthletes[0],
    event: React.KeyboardEvent<HTMLTableRowElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleNavigateToTrainingCalendar(row.id)
    }
  }

  const columns: ColumnDefinition<typeof mockAthletes[0]>[] = [
    {
      id: "name",
      label: "Athlete",
      icon: <User className="size-3" />,
      width: { class: "min-w-[240px]", pixel: "240px" },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => `${row.name} ${row.email} ${row.country}`,
      renderCell: (row) => {
        const initials = getInitials(row.name)
        return (
          <div className="flex items-center gap-3 h-full">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={row.avatar} alt={row.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className={cn("truncate text-sm font-medium")}>
              {row.name}
            </span>
          </div>
        )
      },
    },
    {
      id: "email",
      label: "Email",
      icon: <Mail className="size-3" />,
      width: { class: "min-w-[200px]", pixel: "200px" },
      getSortValue: (row) => row.email.toLowerCase(),
      renderCell: (row) => (
        <span className="truncate text-sm">
          {row.email}
        </span>
      ),
    },
  ]

  return (
    <DataGrid
      data={mockAthletes}
      columns={columns}
      getRowId={(row) => row.id}
      gridKey="assign-athletes"
      searchPlaceholder="Search athletes..."
      enableSearch={true}
      enableEditColumns={false}
      enableExport={false}
      enableRowSelection={false}
      onRowClick={(row, event) => {
        event.stopPropagation()
        handleNavigateToTrainingCalendar(row.id)
      }}
      onRowKeyDown={handleRowKeyDown}
      emptyMessage="No athletes found."
      rowHeight="54px"
      compactMode={true}
      showPagination={true}
      itemsPerPage={25}
    />
  )
}


