"use client"

import React, { useState, useEffect, useRef } from "react"
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
import { mockAthletes } from "@/components/app/app-shell"
import { cn } from "@/lib/utils"
import { AddClientSidePanel } from "./add-client-side-panel"
import { UploadClientsSidePanel } from "./upload-clients-side-panel"
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

const getColumnWidth = (colId: ColumnId, format: "class" | "pixel" = "class"): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    lastActivity: { class: "min-w-[165px]", pixel: "165px" },
    last7DaysTraining: { class: "min-w-[160px]", pixel: "200px" },
    last30DaysTraining: { class: "min-w-[170px]", pixel: "200px" },
    category: { class: "min-w-[140px]", pixel: "140px" },
    connected: { class: "min-w-[150px]", pixel: "150px" },
    email: { class: "min-w-[200px]", pixel: "290px" },
    phone: { class: "min-w-[160px]", pixel: "240px" },
    country: { class: "min-w-[140px]", pixel: "150px" },
    age: { class: "min-w-[110px]", pixel: "110px" },
    clientFor: { class: "min-w-[150px]", pixel: "150px" },
  }

  return widths[colId]?.[format] || (format === "class" ? "min-w-[130px]" : "130px")
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
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(COLUMN_ORDER)
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [isInviteLinkCopied, setIsInviteLinkCopied] = useState<boolean>(false)
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

  const sortedAndFilteredAthletes = [...filteredAthletes].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0

    let aValue: string | number | boolean
    let bValue: string | number | boolean

    switch (sortColumn) {
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

  const isAllSelected = sortedAndFilteredAthletes.length > 0 && selectedAthletes.size === sortedAndFilteredAthletes.length
  const isIndeterminate = selectedAthletes.size > 0 && selectedAthletes.size < sortedAndFilteredAthletes.length

  const getSelectAllCheckedState = (): boolean => {
    return isAllSelected
  }

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedAthletes(new Set())
    } else {
      setSelectedAthletes(new Set(sortedAndFilteredAthletes.map((athlete) => athlete.id)))
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
        <span className="text-xs uppercase">{label}</span>
        {isAscending && <ArrowUpNarrowWide className="size-3.5 text-muted-foreground" />}
        {isDescending && <ArrowDownWideNarrow className="size-3.5 text-muted-foreground" />}
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
            <h1 className="text-[22px] font-semibold">Athletes</h1>
            <p className="text-xs text-muted-foreground">
              ({filteredAthletes.length} {filteredAthletes.length === 1 ? "client" : "clients"})
            </p>
          </div>
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
                  <Grid2x2 className="size-4" />
                  <span>Category: {categoryFilter ? categoryFilter === "online" ? "Online" : "In-person" : "All"}</span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup
                  value={categoryFilter || "all"}
                  onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}
                >
                  <DropdownMenuRadioItem value="all" className={cn(categoryFilter === null && "bg-accent")}>
                    <span className="flex-1">All</span>
                    {categoryFilter === null && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="online" className={cn(categoryFilter === "online" && "bg-accent")}>
                    <span className="flex-1">Online</span>
                    {categoryFilter === "online" && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="in-person" className={cn(categoryFilter === "in-person" && "bg-accent")}>
                    <span className="flex-1">In-person</span>
                    {categoryFilter === "in-person" && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <HeartPulse className="size-4" />
                  <span>
                    Connected:{" "}
                    {connectedFilter === null
                      ? "All"
                      : connectedFilter === "true"
                      ? "Connected"
                      : connectedFilter === "false"
                      ? "Not Connected"
                      : "Invitation Sent"}
                  </span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup
                  value={connectedFilter || "all"}
                  onValueChange={(value) => setConnectedFilter(value === "all" ? null : value)}
                >
                  <DropdownMenuRadioItem value="all" className={cn(connectedFilter === null && "bg-accent")}>
                    <span className="flex-1">All</span>
                    {connectedFilter === null && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="true" className={cn(connectedFilter === "true" && "bg-accent")}>
                    <span className="flex-1">Connected</span>
                    {connectedFilter === "true" && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="false" className={cn(connectedFilter === "false" && "bg-accent")}>
                    <span className="flex-1">Not Connected</span>
                    {connectedFilter === "false" && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="invitation-sent" className={cn(connectedFilter === "invitation-sent" && "bg-accent")}>
                    <span className="flex-1">Invitation Sent</span>
                    {connectedFilter === "invitation-sent" && <Check className="ml-2 size-4" />}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Fixed left section - Checkbox + Athlete */}
          <div className="flex-shrink-0 border-r flex flex-col">
            <div className="flex-shrink-0">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow className="hover:bg-transparent h-10">
                    <TableHead className="!px-4 !py-0 w-[250px] h-10">
                      <div className="flex items-center gap-3 h-full w-full">
                        <Checkbox
                          checked={getSelectAllCheckedState()}
                          onCheckedChange={handleToggleAll}
                          aria-label="Select all athletes"
                        />
                        <div className="flex items-center gap-2">
                          <User className="size-3.5" />
                          <span className="text-xs uppercase">Athlete</span>
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
                {sortedAndFilteredAthletes.map((athlete) => {
                  const isSelected = selectedAthletes.has(athlete.id)
                  const initials = athlete.name
                    .split(" ")
                    .map((part) => part.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join("")

                  return (
                    <TableRow
                      key={athlete.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open profile for ${athlete.name}`}
                      onClick={(event) => handleAthleteRowClick(event, athlete.id)}
                      onKeyDown={(event) => handleAthleteRowKeyDown(event, athlete.id)}
                      className={cn(isSelected && "bg-muted/50", "cursor-pointer !h-[54px]")}
                    >
                      <TableCell className="!px-4 !h-[54px] align-middle">
                        <div className="flex items-center gap-3 h-full">
                          <div
                            className="flex items-center justify-center h-full"
                            data-no-row-link="true"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleAthlete(athlete.id)}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={athlete.avatar} alt={athlete.name} />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate">{athlete.name}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Message ${athlete.name}`}
                                  onClick={() => handleNavigateToMessages(athlete.id)}
                                  onKeyDown={(e) => handleMessageIconKeyDown(e, athlete.id)}
                                  data-no-row-link="true"
                                  className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-7 max-h-7"
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
                                  onClick={() => handleNavigateToTrainingCalendar(athlete.id)}
                                  onKeyDown={(e) => handleTrainingCalendarIconKeyDown(e, athlete.id)}
                                  data-no-row-link="true"
                                  className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-7 max-h-7"
                                >
                                  <Dumbbell className="size-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View clients training calendar</p>
                              </TooltipContent>
                            </Tooltip>
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label={`Copy ${athlete.name}`}
                              onClick={() => handleCopy(athlete.name, athlete.id, "name")}
                              onKeyDown={(e) => handleCopyIconKeyDown(e, athlete.name, athlete.id, "name")}
                              data-no-row-link="true"
                              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-7 max-h-7"
                            >
                              {isFieldCopied(athlete.id, "name") ? (
                                <Check className="size-4 text-green-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </div>
                          </div>
                          </div>
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
                  <TableRow className="hover:bg-transparent h-10">
                    {columnOrder.map((columnId) => {
                      switch (columnId) {
                        case "lastActivity":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <ClockAlert className="size-3.5" />, "Last activity", "Time since last logged on to app")}
                            </React.Fragment>
                          )
                        case "last7DaysTraining":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Dumbbell className="size-3.5" />, "L7D Training", "How much they trained in the last 7 days out of their total assigned schedule")}
                            </React.Fragment>
                          )
                        case "last30DaysTraining":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Dumbbell className="size-3.5" />, "L30D Training", "How much they trained in the last 30 days out of their total assigned schedule")}
                            </React.Fragment>
                          )
                        case "category":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Grid2x2 className="size-3.5" />, "Category", "Whether or not they are online or in person")}
                            </React.Fragment>
                          )
                        case "connected":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <HeartPulse className="size-3.5" />, "Connected?", "The status of the user's app, i.e. if they have connected to the app")}
                            </React.Fragment>
                          )
                        case "email":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Mail className="size-3.5" />, "Email")}
                            </React.Fragment>
                          )
                        case "phone":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Phone className="size-3.5" />, "Phone")}
                            </React.Fragment>
                          )
                        case "country":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <Globe className="size-3.5" />, "Country")}
                            </React.Fragment>
                          )
                        case "age":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <User className="size-3.5" />, "Age")}
                            </React.Fragment>
                          )
                        case "clientFor":
                          return (
                            <React.Fragment key={columnId}>
                              {renderColumnHeader(columnId, <ClockAlert className="size-3.5" />, "Client For", "How long they have been a client")}
                            </React.Fragment>
                          )
                        default:
                          return null
                      }
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                {sortedAndFilteredAthletes.map((athlete) => {
                  const isSelected = selectedAthletes.has(athlete.id)

                  return (
                    <TableRow
                      key={athlete.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open profile for ${athlete.name}`}
                      onClick={(event) => handleAthleteRowClick(event, athlete.id)}
                      onKeyDown={(event) => handleAthleteRowKeyDown(event, athlete.id)}
                      className={cn(isSelected && "bg-muted/50", "cursor-pointer !h-[54px]")}
                    >
                      {columnOrder.map((columnId) => {
                        switch (columnId) {
                          case "lastActivity":
                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full">
                                  <span className="text-sm">{athlete.lastActivity}</span>
                                </div>
                              </TableCell>
                            )
                          case "last7DaysTraining": {
                            const [completed, total] = athlete.last7DaysTraining.split("/").map(Number)
                            const percentage = !total || total === 0 ? 0 : Math.round((completed / total) * 100)

                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full gap-2">
                                  <Progress value={percentage} className="h-2 flex-1" />
                                  <span className="text-xs w-10 text-right">
                                    {percentage}%
                                  </span>
                                </div>
                              </TableCell>
                            )
                          }
                          case "last30DaysTraining": {
                            const [completed, total] = athlete.last30DaysTraining.split("/").map(Number)
                            const percentage = !total || total === 0 ? 0 : Math.round((completed / total) * 100)

                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full gap-2">
                                  <Progress value={percentage} className="h-2 flex-1" />
                                  <span className="text-xs w-10 text-right">
                                    {percentage}%
                                  </span>
                                </div>
                              </TableCell>
                            )
                          }
                          case "category":
                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full">
                                  <span className="text-sm capitalize">{athlete.category}</span>
                                </div>
                              </TableCell>
                            )
                          case "connected": {
                            let connectedLabel = ""

                            if (athlete.connected === true) {
                              connectedLabel = "Connected"
                            } else if (athlete.connected === false) {
                              connectedLabel = "Not connected"
                            } else if (athlete.connected === "invitation-sent") {
                              connectedLabel = "Invitation sent"
                            }

                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full">
                                  <span className="text-sm">{connectedLabel}</span>
                                </div>
                              </TableCell>
                            )
                          }
                          case "email":
                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span className="text-sm flex-1 min-w-0 truncate">
                                    {isFieldRevealed(athlete.id, "email") ? athlete.email : censorEmail(athlete.email)}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-label={isFieldRevealed(athlete.id, "email") ? `Hide email for ${athlete.name}` : `Reveal email for ${athlete.name}`}
                                      onClick={() => handleToggleReveal(athlete.id, "email")}
                                      onKeyDown={(e) => handleRevealIconKeyDown(e, athlete.id, "email")}
                                      data-no-row-link="true"
                                      className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                    >
                                      {isFieldRevealed(athlete.id, "email") ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </div>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`Copy email for ${athlete.name}`}
                                      onClick={() => handleCopy(athlete.email, athlete.id, "email")}
                                      onKeyDown={(e) => handleCopyIconKeyDown(e, athlete.email, athlete.id, "email")}
                                      data-no-row-link="true"
                                      className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                    >
                                      {isFieldCopied(athlete.id, "email") ? (
                                        <Check className="size-4 text-green-500" />
                                      ) : (
                                        <Copy className="size-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            )
                          case "phone":
                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span className="text-sm flex-1 min-w-0 truncate">
                                    {isFieldRevealed(athlete.id, "phone") ? athlete.phone : censorPhone(athlete.phone)}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-label={isFieldRevealed(athlete.id, "phone") ? `Hide phone for ${athlete.name}` : `Reveal phone for ${athlete.name}`}
                                      onClick={() => handleToggleReveal(athlete.id, "phone")}
                                      onKeyDown={(e) => handleRevealIconKeyDown(e, athlete.id, "phone")}
                                      data-no-row-link="true"
                                      className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                    >
                                      {isFieldRevealed(athlete.id, "phone") ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </div>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`Copy phone for ${athlete.name}`}
                                      onClick={() => handleCopy(athlete.phone, athlete.id, "phone")}
                                      onKeyDown={(e) => handleCopyIconKeyDown(e, athlete.phone, athlete.id, "phone")}
                                      data-no-row-link="true"
                                      className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                    >
                                      {isFieldCopied(athlete.id, "phone") ? (
                                        <Check className="size-4 text-green-500" />
                                      ) : (
                                        <Copy className="size-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            )
                          case "country":
                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full">
                                  <span className="text-sm">{athlete.country}</span>
                                </div>
                              </TableCell>
                            )
                          case "age":
                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full">
                                  <span className="text-sm">{athlete.age}</span>
                                </div>
                              </TableCell>
                            )
                          case "clientFor":
                            return (
                              <TableCell
                                key={columnId}
                                className={cn("!px-4 !h-[54px] align-middle", getColumnWidth(columnId, "class"))}
                              >
                                <div className="flex items-center w-full">
                                  <span className="text-sm">{formatClientFor(athlete.clientFor)}</span>
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
      <AddClientSidePanel open={isAddAthleteOpen} onOpenChange={setIsAddAthleteOpen} />
      <UploadClientsSidePanel open={isUploadClientsOpen} onOpenChange={setIsUploadClientsOpen} />
    </div>
  )
}

export default AthletesPage


