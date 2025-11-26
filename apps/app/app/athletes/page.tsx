"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Progress } from "@/components/ui/progress"
import { mockAthletes, type Athlete } from "@/components/app/app-shell"
import { cn } from "@/lib/utils"
import { exportToCSV } from "@/lib/csv-export"
import { AddClientSidePanel } from "./add-client-side-panel"
import { UploadClientsSidePanel } from "./upload-clients-side-panel"
import { DataGrid, type ColumnDefinition, type FilterDefinition } from "@/components/app/data-grid"
import {
  User,
  Users,
  ClockAlert,
  Dumbbell,
  Grid2x2,
  HeartPulse,
  MessageCircle,
  Mail,
  Phone,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  UserPlus,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Download,
  Settings,
} from "lucide-react"

type ColumnId = "lastActivity" | "last7DaysTraining" | "last30DaysTraining" | "category" | "connected" | "email" | "phone" | "country" | "age" | "clientFor"

const COLUMN_ORDER: ColumnId[] = [
  "lastActivity",
  "last7DaysTraining",
  "last30DaysTraining",
  "category",
  "connected",
  "email",
  "phone",
  "country",
  "age",
  "clientFor",
]

const ATHLETE_COLUMN_DEFINITIONS = [
  { id: "lastActivity", label: "Last activity", icon: <ClockAlert className="size-3" /> },
  { id: "last7DaysTraining", label: "L7D Training", icon: <Dumbbell className="size-3" /> },
  { id: "last30DaysTraining", label: "L30D Training", icon: <Dumbbell className="size-3" /> },
  { id: "category", label: "Category", icon: <Grid2x2 className="size-3" /> },
  { id: "connected", label: "Connected?", icon: <HeartPulse className="size-3" /> },
  { id: "email", label: "Email", icon: <Mail className="size-3" /> },
  { id: "phone", label: "Phone", icon: <Phone className="size-3" /> },
  { id: "country", label: "Country", icon: <Globe className="size-3" /> },
  { id: "age", label: "Age", icon: <User className="size-3" /> },
  { id: "clientFor", label: "Client For", icon: <ClockAlert className="size-3" /> },
]

const getColumnWidth = (colId: ColumnId, format: "class" | "pixel" = "class"): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    lastActivity: { class: "min-w-[165px]", pixel: "165px" },
    last7DaysTraining: { class: "min-w-[160px]", pixel: "200px" },
    last30DaysTraining: { class: "min-w-[170px]", pixel: "200px" },
    category: { class: "min-w-[140px]", pixel: "140px" },
    connected: { class: "min-w-[150px]", pixel: "150px" },
    email: { class: "min-w-[220px]", pixel: "310px" },
    phone: { class: "min-w-[160px]", pixel: "240px" },
    country: { class: "min-w-[140px]", pixel: "150px" },
    age: { class: "min-w-[110px]", pixel: "110px" },
    clientFor: { class: "min-w-[150px]", pixel: "150px" },
  }

  return widths[colId]?.[format] || (format === "class" ? "min-w-[130px]" : "130px")
}

const AthleteNameTooltip = ({ name }: { name: string }) => {
  const [isTruncated, setIsTruncated] = useState(false)
  const checkTruncationRef = useRef<(() => void) | null>(null)

  const handleRef = (element: HTMLSpanElement | null) => {
    if (element) {
      const checkTruncation = () => {
        setIsTruncated(element.scrollWidth > element.clientWidth)
      }
      checkTruncationRef.current = checkTruncation
      checkTruncation()
      window.addEventListener("resize", checkTruncation)
    } else if (checkTruncationRef.current) {
      window.removeEventListener("resize", checkTruncationRef.current)
      checkTruncationRef.current = null
    }
  }

  const nameSpan = (
    <span ref={handleRef} className="text-sm truncate cursor-default">
      {name}
    </span>
  )

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {nameSpan}
        </TooltipTrigger>
        <TooltipContent>
          <p>{name}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return nameSpan
}

const AthletesPage = () => {
  const router = useRouter()
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set())
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [connectedFilter, setConnectedFilter] = useState<string | null>(null)
  const [isAddAthleteOpen, setIsAddAthleteOpen] = useState<boolean>(false)
  const [isUploadClientsOpen, setIsUploadClientsOpen] = useState<boolean>(false)
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState<boolean>(false)
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(COLUMN_ORDER)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(COLUMN_ORDER))
  const [sortColumn, setSortColumn] = useState<ColumnId | "name" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [isInviteLinkCopied, setIsInviteLinkCopied] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 25
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const copyTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const inviteLinkCopyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleToggleAthlete = (athleteId: string) => {
    setSelectedAthletes((prev) => {
      const next = new Set(prev)
      if (next.has(athleteId)) {
        next.delete(athleteId)
      } else {
        next.add(athleteId)
      }
      return next
    })
  }

  const handleNavigateToClientProfile = (athleteId: string) => {
    router.push(`/athletes/${athleteId}/overview`)
  }

  const handleAthleteRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    athleteId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      const targetElement = event.target as HTMLElement
      if (targetElement.closest('[data-no-row-link="true"]')) {
        return
      }

      event.preventDefault()
      handleNavigateToClientProfile(athleteId)
    }
  }

  const handleAthleteRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    athleteId: string,
  ) => {
    const targetElement = event.target as HTMLElement
    if (targetElement.closest('[data-no-row-link="true"]')) {
      return
    }

    handleNavigateToClientProfile(athleteId)
  }

  const calculatePercentage = (value: string): string => {
    const [completed, total] = value.split("/").map(Number)
    if (!total || total === 0) return "0%"
    const percentage = Math.round((completed / total) * 100)
    return `${percentage}%`
  }

  const formatClientFor = (days: number): string => {
    if (days >= 365) {
      const years = Math.floor(days / 365)
      const remainingDays = days % 365
      if (remainingDays === 0) {
        return `${years} ${years === 1 ? "year" : "years"}`
      }
      return `${years} ${years === 1 ? "year" : "years"} ${remainingDays} ${remainingDays === 1 ? "day" : "days"}`
    }
    return `${days} ${days === 1 ? "day" : "days"}`
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
      const athletesPrefs = preferences.athletes
      if (athletesPrefs) {
        if (athletesPrefs.visibleColumns && Array.isArray(athletesPrefs.visibleColumns)) {
          setVisibleColumns(new Set(athletesPrefs.visibleColumns))
        }
        if (athletesPrefs.columnOrder && Array.isArray(athletesPrefs.columnOrder)) {
          setColumnOrder(athletesPrefs.columnOrder)
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

  const filteredAthletes = mockAthletes.filter((athlete) => {
    const matchesSearch = !searchQuery.trim() ||
      isFuzzyMatch(athlete.name, searchQuery) ||
      isFuzzyMatch(athlete.email, searchQuery) ||
      isFuzzyMatch(athlete.phone, searchQuery) ||
      isFuzzyMatch(athlete.country, searchQuery) ||
      isFuzzyMatch(athlete.category, searchQuery)

    const matchesCategory = !categoryFilter || athlete.category === categoryFilter

    const matchesConnected = !connectedFilter || 
      (connectedFilter === "true" && athlete.connected === true) ||
      (connectedFilter === "false" && athlete.connected === false) ||
      (connectedFilter === "invitation-sent" && athlete.connected === "invitation-sent")

    return matchesSearch && matchesCategory && matchesConnected
  })

  const handleSort = (columnId: ColumnId | "name", direction: "asc" | "desc") => {
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
      
      try {
        const preferences = JSON.parse(localStorage.getItem("column_preferences") || "{}")
        preferences.athletes = {
          visibleColumns: Array.from(visibleColumns),
          columnOrder: newOrder,
        }
        localStorage.setItem("column_preferences", JSON.stringify(preferences))
      } catch (error) {
        console.error("Failed to save column preferences:", error)
      }
      
      return newOrder
    })
  }

  const sortedAndFilteredAthletes = [...filteredAthletes].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0

    let aValue: string | number | boolean
    let bValue: string | number | boolean

    switch (sortColumn) {
      case "name":
        aValue = a.name
        bValue = b.name
        break
      case "lastActivity":
        aValue = a.lastActivity
        bValue = b.lastActivity
        break
      case "last7DaysTraining":
        {
          const [aCompleted, aTotal] = a.last7DaysTraining.split("/").map(Number)
          const [bCompleted, bTotal] = b.last7DaysTraining.split("/").map(Number)
          aValue = aTotal > 0 ? aCompleted / aTotal : 0
          bValue = bTotal > 0 ? bCompleted / bTotal : 0
        }
        break
      case "last30DaysTraining":
        {
          const [aCompleted, aTotal] = a.last30DaysTraining.split("/").map(Number)
          const [bCompleted, bTotal] = b.last30DaysTraining.split("/").map(Number)
          aValue = aTotal > 0 ? aCompleted / aTotal : 0
          bValue = bTotal > 0 ? bCompleted / bTotal : 0
        }
        break
      case "category":
        aValue = a.category
        bValue = b.category
        break
      case "connected":
        aValue = a.connected === true ? 1 : a.connected === false ? 0 : 0.5
        bValue = b.connected === true ? 1 : b.connected === false ? 0 : 0.5
        break
      case "email":
        aValue = a.email
        bValue = b.email
        break
      case "phone":
        aValue = a.phone
        bValue = b.phone
        break
      case "country":
        aValue = a.country
        bValue = b.country
        break
      case "age":
        aValue = a.age
        bValue = b.age
        break
      case "clientFor":
        aValue = a.clientFor
        bValue = b.clientFor
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

  // Pagination logic
  const totalPages = Math.ceil(sortedAndFilteredAthletes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAthletes = sortedAndFilteredAthletes.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, connectedFilter, sortColumn, sortDirection])

  // Calculate isAllSelected based on filtered athletes (DataGrid handles pagination internally)
  const isAllSelected = filteredAthletes.length > 0 && filteredAthletes.every((athlete) => selectedAthletes.has(athlete.id))
  const isIndeterminate = filteredAthletes.some((athlete) => selectedAthletes.has(athlete.id)) && !isAllSelected

  const getSelectAllCheckedState = (): boolean => {
    return isAllSelected
  }

  const handleToggleAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredAthletes.map((athlete) => athlete.id))
      setSelectedAthletes((prev) => {
        const next = new Set(prev)
        filteredIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedAthletes((prev) => {
        const next = new Set(prev)
        filteredAthletes.forEach((athlete) => next.add(athlete.id))
        return next
      })
    }
  }

  const handleNavigateToMessages = (athleteId: string) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("messagingSelectedContactId", athleteId)
      } catch {
        // Ignore storage errors
      }
    }

    router.push(`/messaging?contact=${athleteId}`)
  }

  const handleNavigateToTrainingCalendar = (athleteId: string) => {
    router.push(`/athletes/${athleteId}/training-calendar`)
  }

  const handleTrainingCalendarIconKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, athleteId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleNavigateToTrainingCalendar(athleteId)
    }
  }

  const handleMessageIconKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, athleteId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleNavigateToMessages(athleteId)
    }
  }

  const censorEmail = (email: string): string => {
    const [localPart, domain] = email.split("@")
    if (!domain) return "***"
    const visibleChars = Math.min(2, localPart.length)
    const censoredLocal = localPart.slice(0, visibleChars) + "*".repeat(Math.max(3, localPart.length - visibleChars))
    const [domainName, domainExt] = domain.split(".")
    if (!domainExt) return `${censoredLocal}@***`
    const visibleDomainChars = Math.min(2, domainName.length)
    const censoredDomain = domainName.slice(0, visibleDomainChars) + "*".repeat(Math.max(2, domainName.length - visibleDomainChars))
    return `${censoredLocal}@${censoredDomain}.${domainExt}`
  }

  const censorPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 0) return "***"
    const visibleDigits = Math.min(3, digits.length)
    const visiblePart = digits.slice(-visibleDigits)
    let digitCount = 0
    return phone
      .split("")
      .map((char) => {
        if (/\d/.test(char)) {
          digitCount++
          if (digitCount > digits.length - visibleDigits) {
            return visiblePart[digitCount - (digits.length - visibleDigits) - 1]
          }
          return "*"
        }
        return char
      })
      .join("")
  }

  const getFieldKey = (athleteId: string, fieldType: "email" | "phone" | "name"): string => {
    return `${fieldType}-${athleteId}`
  }

  const isFieldRevealed = (athleteId: string, fieldType: "email" | "phone"): boolean => {
    return revealedFields.has(getFieldKey(athleteId, fieldType))
  }

  const handleToggleReveal = (athleteId: string, fieldType: "email" | "phone") => {
    const fieldKey = getFieldKey(athleteId, fieldType)
    setRevealedFields((prev) => {
      const next = new Set(prev)
      if (next.has(fieldKey)) {
        // Hide immediately if already revealed
        next.delete(fieldKey)
        const existingTimeout = timeoutRefs.current.get(fieldKey)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
          timeoutRefs.current.delete(fieldKey)
        }
      } else {
        // Reveal and set auto-hide after 5 seconds
        next.add(fieldKey)
        const timeout = setTimeout(() => {
          setRevealedFields((current) => {
            const updated = new Set(current)
            updated.delete(fieldKey)
            return updated
          })
          timeoutRefs.current.delete(fieldKey)
        }, 5000)
        timeoutRefs.current.set(fieldKey, timeout)
      }
      return next
    })
  }

  const handleCopy = async (text: string, athleteId: string, fieldType: "email" | "phone" | "name") => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.opacity = "0"
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
      } catch (fallbackErr) {
        // Ignore copy errors
      }
      document.body.removeChild(textArea)
    }

    const fieldKey = getFieldKey(athleteId, fieldType)
    setCopiedFields((prev) => {
      const next = new Set(prev)
      next.add(fieldKey)
      return next
    })

    // Clear existing timeout if any
    const existingTimeout = copyTimeoutRefs.current.get(fieldKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set timeout to hide checkmark after 2 seconds
    const timeout = setTimeout(() => {
      setCopiedFields((current) => {
        const updated = new Set(current)
        updated.delete(fieldKey)
        return updated
      })
      copyTimeoutRefs.current.delete(fieldKey)
    }, 2000)
    copyTimeoutRefs.current.set(fieldKey, timeout)
  }

  const handleCopyIconKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, text: string, athleteId: string, fieldType: "email" | "phone" | "name") => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleCopy(text, athleteId, fieldType)
    }
  }

  const isFieldCopied = (athleteId: string, fieldType: "email" | "phone" | "name"): boolean => {
    return copiedFields.has(getFieldKey(athleteId, fieldType))
  }

  useEffect(() => {
    return () => {
      // Cleanup all timeouts on unmount
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout))
      timeoutRefs.current.clear()
      copyTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout))
      copyTimeoutRefs.current.clear()
      if (inviteLinkCopyTimeoutRef.current) {
        clearTimeout(inviteLinkCopyTimeoutRef.current)
      }
    }
  }, [])

  const handleRevealIconKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, athleteId: string, fieldType: "email" | "phone") => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleToggleReveal(athleteId, fieldType)
    }
  }

  const handleCopyInviteLink = async () => {
    const inviteLink = "google.com"
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = inviteLink
      textArea.style.position = "fixed"
      textArea.style.opacity = "0"
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
      } catch (fallbackErr) {
        // Ignore copy errors
      }
      document.body.removeChild(textArea)
    }

    setIsInviteLinkCopied(true)

    // Clear existing timeout if any
    if (inviteLinkCopyTimeoutRef.current) {
      clearTimeout(inviteLinkCopyTimeoutRef.current)
    }

    // Set timeout to hide checkmark after 2 seconds
    inviteLinkCopyTimeoutRef.current = setTimeout(() => {
      setIsInviteLinkCopied(false)
      inviteLinkCopyTimeoutRef.current = null
    }, 2000)
  }

  const handleInviteLinkKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleCopyInviteLink()
    }
  }

  // Create column definitions for DataGrid
  const columns: ColumnDefinition<Athlete>[] = filteredColumnOrder.map((columnId): ColumnDefinition<Athlete> => {
    switch (columnId) {
      case "lastActivity":
        return {
          id: "lastActivity",
          label: "Last activity",
          icon: <ClockAlert className="size-3" />,
          width: getColumnWidth("lastActivity", "pixel") ? { class: getColumnWidth("lastActivity", "class"), pixel: getColumnWidth("lastActivity", "pixel") } : undefined,
          tooltip: "Time since last logged on to app",
          getSortValue: (row) => row.lastActivity,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => (
            <div className="flex items-center w-full">
              <span className="text-sm">{row.lastActivity}</span>
            </div>
          ),
        }
      case "last7DaysTraining":
        return {
          id: "last7DaysTraining",
          label: "L7D Training",
          icon: <Dumbbell className="size-3" />,
          width: { class: getColumnWidth("last7DaysTraining", "class"), pixel: getColumnWidth("last7DaysTraining", "pixel") },
          tooltip: "How much they trained in the last 7 days out of their total assigned schedule",
          getSortValue: (row) => {
            const [completed, total] = row.last7DaysTraining.split("/").map(Number)
            return total > 0 ? completed / total : 0
          },
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => {
            const [completed, total] = row.last7DaysTraining.split("/").map(Number)
            const percentage = !total || total === 0 ? 0 : Math.round((completed / total) * 100)
            return (
              <div className="flex items-center w-full gap-2">
                <Progress value={percentage} className="h-2 flex-1" />
                <span className="text-xs w-10 text-right">{percentage}%</span>
      </div>
    )
          },
        }
      case "last30DaysTraining":
        return {
          id: "last30DaysTraining",
          label: "L30D Training",
          icon: <Dumbbell className="size-3" />,
          width: { class: getColumnWidth("last30DaysTraining", "class"), pixel: getColumnWidth("last30DaysTraining", "pixel") },
          tooltip: "How much they trained in the last 30 days out of their total assigned schedule",
          getSortValue: (row) => {
            const [completed, total] = row.last30DaysTraining.split("/").map(Number)
            return total > 0 ? completed / total : 0
          },
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => {
            const [completed, total] = row.last30DaysTraining.split("/").map(Number)
            const percentage = !total || total === 0 ? 0 : Math.round((completed / total) * 100)
    return (
              <div className="flex items-center w-full gap-2">
                <Progress value={percentage} className="h-2 flex-1" />
                <span className="text-xs w-10 text-right">{percentage}%</span>
              </div>
            )
          },
        }
      case "category":
        return {
          id: "category",
          label: "Category",
          icon: <Grid2x2 className="size-3" />,
          width: { class: getColumnWidth("category", "class"), pixel: getColumnWidth("category", "pixel") },
          tooltip: "Whether or not they are online or in person",
          getSortValue: (row) => row.category,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => (
            <div className="flex items-center w-full">
              <span className="text-sm capitalize">{row.category}</span>
            </div>
          ),
        }
      case "connected":
        return {
          id: "connected",
          label: "Connected?",
          icon: <HeartPulse className="size-3" />,
          width: { class: getColumnWidth("connected", "class"), pixel: getColumnWidth("connected", "pixel") },
          tooltip: "The status of the user's app, i.e. if they have connected to the app",
          getSortValue: (row) => row.connected === true ? 1 : row.connected === false ? 0 : 0.5,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => {
            let connectedLabel = ""
            if (row.connected === true) {
              connectedLabel = "Connected"
            } else if (row.connected === false) {
              connectedLabel = "Not connected"
            } else if (row.connected === "invitation-sent") {
              connectedLabel = "Invitation sent"
  }
  return (
              <div className="flex items-center w-full">
                <span className="text-sm">{connectedLabel}</span>
          </div>
            )
          },
        }
      case "email":
        return {
          id: "email",
          label: "Email",
          icon: <Mail className="size-3" />,
          width: { class: getColumnWidth("email", "class"), pixel: getColumnWidth("email", "pixel") },
          getSortValue: (row) => row.email,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row, isSelected) => {
            const fieldKey = getFieldKey(row.id, "email")
            const isRevealed = revealedFields.has(fieldKey)
            const isCopied = copiedFields.has(fieldKey)
            return (
              <div className="flex items-center justify-between gap-2 w-full">
                <a
                  href={`mailto:${row.email}`}
                  className="text-sm flex-1 min-w-0 truncate hover:underline text-blue-600 dark:text-blue-400"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                    }
                  }}
                >
                  {isRevealed ? row.email : censorEmail(row.email)}
                </a>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={isRevealed ? `Hide email for ${row.name}` : `Reveal email for ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleReveal(row.id, "email")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        handleToggleReveal(row.id, "email")
                      }
                    }}
                    data-no-row-link="true"
                    className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Copy email for ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(row.email, row.id, "email")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCopy(row.email, row.id, "email")
                      }
                    }}
                    data-no-row-link="true"
                    className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
        </div>
      </div>
          </div>
            )
          },
        }
      case "phone":
        return {
          id: "phone",
          label: "Phone",
          icon: <Phone className="size-3" />,
          width: { class: getColumnWidth("phone", "class"), pixel: getColumnWidth("phone", "pixel") },
          getSortValue: (row) => row.phone,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row, isSelected) => {
            const fieldKey = getFieldKey(row.id, "phone")
            const isRevealed = revealedFields.has(fieldKey)
            const isCopied = copiedFields.has(fieldKey)
            return (
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-sm flex-1 min-w-0 truncate">
                  {isRevealed ? row.phone : censorPhone(row.phone)}
                  </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={isRevealed ? `Hide phone for ${row.name}` : `Reveal phone for ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleReveal(row.id, "phone")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        handleToggleReveal(row.id, "phone")
                      }
                    }}
                    data-no-row-link="true"
                    className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </div>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Copy phone for ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(row.phone, row.id, "phone")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCopy(row.phone, row.id, "phone")
                      }
                    }}
                    data-no-row-link="true"
                    className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </div>
                </div>
              </div>
                      )
          },
        }
                    case "country":
        return {
          id: "country",
          label: "Country",
          icon: <Globe className="size-3" />,
          width: { class: getColumnWidth("country", "class"), pixel: getColumnWidth("country", "pixel") },
          getSortValue: (row) => row.country,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => (
            <div className="flex items-center w-full">
              <span className="text-sm">{row.country}</span>
            </div>
          ),
        }
                    case "age":
        return {
          id: "age",
          label: "Age",
          icon: <User className="size-3" />,
          width: { class: getColumnWidth("age", "class"), pixel: getColumnWidth("age", "pixel") },
          getSortValue: (row) => row.age,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => (
            <div className="flex items-center w-full">
              <span className="text-sm">{row.age}</span>
            </div>
          ),
        }
                    case "clientFor":
        return {
          id: "clientFor",
          label: "Client For",
          icon: <ClockAlert className="size-3" />,
          width: { class: getColumnWidth("clientFor", "class"), pixel: getColumnWidth("clientFor", "pixel") },
          tooltip: "How long they have been a client",
          getSortValue: (row) => row.clientFor,
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => (
            <div className="flex items-center w-full">
              <span className="text-sm">{formatClientFor(row.clientFor)}</span>
            </div>
          ),
        }
                    default:
        return {
          id: columnId,
          label: columnId,
          width: { class: "min-w-[130px]", pixel: "130px" },
          getSearchValue: (row) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
          renderCell: (row) => <div className="flex items-center w-full"><span className="text-sm">{String(row[columnId as keyof Athlete] ?? "")}</span></div>,
        }
    }
  })

  // Create filter definitions
  const filters: FilterDefinition<Athlete>[] = [
    {
      id: "category",
      label: "Category",
      icon: <Grid2x2 className="size-4" />,
      options: [
        { value: "all", label: "All" },
        { value: "online", label: "Online" },
        { value: "in-person", label: "In-person" },
      ],
      getFilterValue: (row) => row.category,
      defaultValue: categoryFilter,
    },
    {
      id: "connected",
      label: "Connected",
      icon: <HeartPulse className="size-4" />,
      options: [
        { value: "all", label: "All" },
        { value: "true", label: "Connected" },
        { value: "false", label: "Not Connected" },
        { value: "invitation-sent", label: "Invitation Sent" },
      ],
      getFilterValue: (row) => {
        if (row.connected === true) return "true"
        if (row.connected === false) return "false"
        if (row.connected === "invitation-sent") return "invitation-sent"
        return null
      },
      defaultValue: connectedFilter,
    },
  ]

  // Create first column header renderer
  const renderFirstColumnHeader = () => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <Checkbox
          checked={getSelectAllCheckedState()}
          onCheckedChange={handleToggleAll}
          aria-label="Select all athletes"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <User className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">Athlete</span>
              {sortColumn === "name" && sortDirection === "asc" && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {sortColumn === "name" && sortDirection === "desc" && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
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
      </div>
    )
  }

  // Create first column renderer
  const renderFirstColumn = (athlete: Athlete, isSelected: boolean) => {
                const initials = athlete.name
                  .split(" ")
                  .map((part) => part.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join("")
    const fieldKey = getFieldKey(athlete.id, "name")
    const isCopied = copiedFields.has(fieldKey)

                return (
                      <div className="flex items-center gap-3 h-full w-full">
                        <div
                          className="flex items-center justify-center h-full flex-shrink-0"
                          data-no-row-link="true"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleAthlete(athlete.id)}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 min-w-0 flex-1 w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={athlete.avatar} alt={athlete.name} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <AthleteNameTooltip name={athlete.name} />
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Message ${athlete.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigateToMessages(athlete.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      handleNavigateToMessages(athlete.id)
                    }
                  }}
                                  data-no-row-link="true"
                                  className="flex items-center justify-center rounded-md p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-7 max-h-7"
                                >
                                  <MessageCircle className="size-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Message the client</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Open training calendar for ${athlete.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigateToTrainingCalendar(athlete.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      handleNavigateToTrainingCalendar(athlete.id)
                    }
                  }}
                                  data-no-row-link="true"
                                  className="flex items-center justify-center rounded-md p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-7 max-h-7"
                                >
                                  <Dumbbell className="size-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View clients training calendar</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Copy ${athlete.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(athlete.name, athlete.id, "name")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCopy(athlete.name, athlete.id, "name")
                    }
                  }}
                                  data-no-row-link="true"
                                  className="flex items-center justify-center rounded-md p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-7 max-h-7"
                                >
                  {isCopied ? (
                                    <Check className="size-4 text-green-500" />
                                  ) : (
                                    <Copy className="size-4" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy athlete name</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
    )
  }
return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={mockAthletes}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="athletes"
        title="Athletes"
        subtitle={(count) => `${count} ${count === 1 ? "client" : "clients"}`}
        itemsPerPage={itemsPerPage}
        enableSearch={true}
        searchPlaceholder="Search..."
        filters={filters}
        enableEditColumns={true}
        enableExport={true}
        exportFileName="athletes.csv"
        exportDataTransform={(row) => ({
          Name: row.name,
          Email: row.email,
          Phone: row.phone,
          Country: row.country,
          Category: row.category === "online" ? "Online" : "In-person",
          Connected: row.connected === true ? "Connected" : row.connected === false ? "Not Connected" : "Invitation Sent",
          "Last Activity": row.lastActivity,
          "Last 7 Days Training": row.last7DaysTraining,
          "Last 30 Days Training": row.last30DaysTraining,
          Age: row.age,
          "Client For": row.clientFor,
        })}
        enableRowSelection={true}
        selectedRowIds={selectedAthletes}
        onSelectionChange={setSelectedAthletes}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return
          }
          handleNavigateToClientProfile(row.id)
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === "Enter" || event.key === " ") {
            const targetElement = event.target as HTMLElement
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return
            }
            event.preventDefault()
            handleNavigateToClientProfile(row.id)
          }
        }}
        defaultColumnOrder={COLUMN_ORDER}
        defaultVisibleColumns={COLUMN_ORDER}
        customActions={
          <DropdownMenu>
            <ButtonGroup>
              <Button
                variant="secondary"
                onClick={handleCopyInviteLink}
                onKeyDown={handleInviteLinkKeyDown}
                className="gap-2"
                aria-label="Copy invite link"
                                  >
                {isInviteLinkCopied ? (
                  <Check className="size-4" />
                                    ) : (
                                      <Copy className="size-4" />
                                    )}
                <span>Your invite link</span>
              </Button>
              <ButtonGroupSeparator />
            <Button
                onClick={() => setIsAddAthleteOpen(true)}
                className="gap-2"
            >
                <UserPlus className="size-4" />
                <span>Add Client</span>
            </Button>
              <ButtonGroupSeparator />
              <DropdownMenuTrigger asChild>
            <Button
                  className="px-2"
                  aria-label="More options"
            >
                  <ChevronDown className="size-4" />
            </Button>
              </DropdownMenuTrigger>
            </ButtonGroup>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsAddAthleteOpen(true)}>
                <UserPlus className="size-4 mr-2" />
                <span>Single client</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsUploadClientsOpen(true)}>
                <Users className="size-4 mr-2" />
                <span>Upload clients</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        emptyMessage="No athletes found."
        rowHeight="54px"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
      />
      <AddClientSidePanel open={isAddAthleteOpen} onOpenChange={setIsAddAthleteOpen} />
      <UploadClientsSidePanel open={isUploadClientsOpen} onOpenChange={setIsUploadClientsOpen} />
    </div>
  )
}

export default AthletesPage


