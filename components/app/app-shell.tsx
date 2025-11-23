'use client'

import React from "react"
import type { ReactNode } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Check,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
  Dumbbell,
  Home,
  Laptop,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  HelpCircle,
  Moon,
  MoreVertical,
  Search,
  Settings,
  Sun,
  User,
  Users,
  CalendarDays,
} from "lucide-react"
import Link from "next/link"
import { hashPathToRoutePath, routePathToHashPath } from "@/lib/hash-routing"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Kbd } from "@/components/ui/kbd"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { availableLanguages } from "@/lib/intl-provider"

export type Contact = {
  id: string
  name: string
  avatar?: string
  lastMessage: string
  timestamp: string
  unreadCount?: number
  isOnline?: boolean
}

export type Message = {
  id: string
  text: string
  timestamp: string
  isSent: boolean
}

export type Athlete = {
  id: string
  name: string
  avatar?: string
  lastActivity: string
  last7DaysTraining: string
  last30DaysTraining: string
  category: "online" | "in-person"
  connected: boolean | "invitation-sent"
  email: string
  phone: string
  country: string
  age: number
  clientFor: number // in days
}

export const mockAthletes: Athlete[] = [
  {
    id: "1",
    name: "John Smith",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    lastActivity: "2 hours ago",
    last7DaysTraining: "5/7",
    last30DaysTraining: "22/30",
    category: "in-person",
    connected: true,
    email: "john.smith@example.com",
    phone: "+1 (555) 123-4567",
    country: "United States",
    age: 32,
    clientFor: 450,
  },
  {
    id: "2",
    name: "Sarah Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    lastActivity: "1 day ago",
    last7DaysTraining: "6/7",
    last30DaysTraining: "28/30",
    category: "online",
    connected: true,
    email: "sarah.johnson@example.com",
    phone: "+1 (555) 234-5678",
    country: "Canada",
    age: 28,
    clientFor: 180,
  },
  {
    id: "3",
    name: "Mike Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    lastActivity: "30 minutes ago",
    last7DaysTraining: "4/7",
    last30DaysTraining: "18/30",
    category: "in-person",
    connected: true,
    email: "mike.wilson@example.com",
    phone: "+44 20 7946 0958",
    country: "United Kingdom",
    age: 35,
    clientFor: 730,
  },
  {
    id: "4",
    name: "Emily Davis",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    lastActivity: "3 days ago",
    last7DaysTraining: "3/7",
    last30DaysTraining: "15/30",
    category: "online",
    connected: false,
    email: "emily.davis@example.com",
    phone: "+1 (555) 345-6789",
    country: "United States",
    age: 29,
    clientFor: 90,
  },
  {
    id: "5",
    name: "David Brown",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    lastActivity: "5 hours ago",
    last7DaysTraining: "7/7",
    last30DaysTraining: "30/30",
    category: "in-person",
    connected: true,
    email: "david.brown@example.com",
    phone: "+61 2 9374 4000",
    country: "Australia",
    age: 41,
    clientFor: 1095,
  },
  {
    id: "6",
    name: "Lisa Anderson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    lastActivity: "1 week ago",
    last7DaysTraining: "2/7",
    last30DaysTraining: "10/30",
    category: "online",
    connected: false,
    email: "lisa.anderson@example.com",
    phone: "+1 (555) 456-7890",
    country: "United States",
    age: 26,
    clientFor: 60,
  },
  {
    id: "7",
    name: "Chris Martinez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris",
    lastActivity: "12 hours ago",
    last7DaysTraining: "6/7",
    last30DaysTraining: "25/30",
    category: "in-person",
    connected: true,
    email: "chris.martinez@example.com",
    phone: "+34 91 123 4567",
    country: "Spain",
    age: 38,
    clientFor: 365,
  },
  {
    id: "8",
    name: "Jessica Taylor",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
    lastActivity: "2 days ago",
    last7DaysTraining: "5/7",
    last30DaysTraining: "20/30",
    category: "online",
    connected: true,
    email: "jessica.taylor@example.com",
    phone: "+1 (555) 567-8901",
    country: "Canada",
    age: 31,
    clientFor: 240,
  },
]

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'John Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    lastMessage: 'Hey, how are you doing?',
    timestamp: '2:30 PM',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    lastMessage: 'Thanks for the workout plan!',
    timestamp: '1:15 PM',
    isOnline: false,
  },
  {
    id: '3',
    name: 'Mike Wilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    lastMessage: 'Can we schedule a session?',
    timestamp: '12:45 PM',
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: '4',
    name: 'Emily Davis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    lastMessage: 'The nutrition plan looks great',
    timestamp: 'Yesterday',
    isOnline: false,
  },
  {
    id: '5',
    name: 'David Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    lastMessage: 'See you at the gym tomorrow',
    timestamp: 'Yesterday',
    isOnline: true,
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    lastMessage: 'Perfect, thanks!',
    timestamp: '2 days ago',
    isOnline: false,
  },
]

export const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      text: 'Hey, how are you doing?',
      timestamp: '2:30 PM',
      isSent: false,
    },
    {
      id: 'm2',
      text: 'I\'m doing great, thanks for asking! How about you?',
      timestamp: '2:32 PM',
      isSent: true,
    },
    {
      id: 'm3',
      text: 'Pretty good! Just finished my workout.',
      timestamp: '2:33 PM',
      isSent: false,
    },
  ],
  '2': [
    {
      id: 'm4',
      text: 'Thanks for the workout plan!',
      timestamp: '1:15 PM',
      isSent: false,
    },
    {
      id: 'm5',
      text: 'You\'re welcome! Let me know if you have any questions.',
      timestamp: '1:16 PM',
      isSent: true,
    },
  ],
}

const isFuzzyMatch = (text: string, query: string) => {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return false
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

type AppShellProps = {
  children: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  const t = useTranslations()
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [isThemeMounted, setIsThemeMounted] = React.useState(false)
  const [currentLanguage, setCurrentLanguage] = React.useState("en")
  const pathname = usePathname()

  React.useEffect(() => {
    setIsThemeMounted(true)
  }, [])

  // Keep URL in hash format (/#/app/...) while using normal Next.js routes
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const currentHashPath = window.location.hash.slice(1)

    let hashPath = routePathToHashPath(pathname)

    if (!hashPath) {
      return
    }

    // Preserve deep messaging hashes like /app/messaging/1 so that the
    // messaging page can select the correct contact from the hash.
    if (
      pathname.startsWith("/app/messaging") &&
      currentHashPath.match(/^\/app\/messaging\/.+$/)
    ) {
      hashPath = currentHashPath
    }

    const desiredHash = `#${hashPath}`
    const isOnRoot = window.location.pathname === "/"

    if (!isOnRoot || window.location.hash !== desiredHash) {
      window.history.replaceState(null, "", `/${desiredHash}`)
    }
  }, [pathname])
  
  return (
    <SidebarProvider className="h-svh">
      <AppShellContent
        t={t}
        user={user}
        openUserProfile={openUserProfile}
        signOut={signOut}
        resolvedTheme={resolvedTheme}
        setTheme={setTheme}
        theme={theme}
        isThemeMounted={isThemeMounted}
        currentLanguage={currentLanguage}
        setCurrentLanguage={setCurrentLanguage}
        pathname={pathname}
      >
        {children}
      </AppShellContent>
    </SidebarProvider>
  )
}

const AppShellContent = ({
  children,
  t,
  user,
  openUserProfile,
  signOut,
  resolvedTheme,
  setTheme,
  theme,
  isThemeMounted,
  currentLanguage,
  setCurrentLanguage,
  pathname,
}: {
  children: ReactNode
  t: (key: string) => string
  user: ReturnType<typeof useUser>["user"]
  openUserProfile: () => void
  signOut: (options: { redirectUrl: string }) => void
  resolvedTheme: string | undefined
  setTheme: (theme: string) => void
  theme: string | undefined
  isThemeMounted: boolean
  currentLanguage: string
  setCurrentLanguage: (lang: string) => void
  pathname: string
}) => {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isClient, setIsClient] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [activePath, setActivePath] = React.useState(pathname)
  const router = useRouter()

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  // Derive the "active" path from the hash when present, falling back to Next.js pathname.
  React.useEffect(() => {
    if (typeof window === "undefined") {
      setActivePath(pathname)
      return
    }

    const hashPath = window.location.hash.slice(1)

    // If hash is exactly /app, redirect to /app/home
    if (hashPath === "/app") {
      window.history.replaceState(null, "", "/#/app/home")
      router.replace("/app/home")
      setActivePath("/app/home")
      return
    }

    const routeFromHash = hashPathToRoutePath(hashPath)

    if (routeFromHash) {
      setActivePath(routeFromHash)
      return
    }

    setActivePath(pathname)
  }, [pathname, router])

  const displayName =
    user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "User"
  const displayEmail = user?.primaryEmailAddress?.emailAddress

  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") || "U"

  const currentTheme = theme || "system"
  const isDark = isThemeMounted && resolvedTheme === "dark"

  const getActiveSidebarClasses = (isActive: boolean) => {
    if (!isActive) return ""
    // Default to light mode during SSR to prevent hydration mismatch
    if (!isThemeMounted) {
      return "data-[active=true]:!bg-neutral-800 data-[active=true]:!text-white [&_svg]:data-[active=true]:!text-white"
    }
    return isDark
      ? "data-[active=true]:!bg-neutral-100 data-[active=true]:!text-gray-900 [&_svg]:data-[active=true]:!text-gray-900"
      : "data-[active=true]:!bg-neutral-800 data-[active=true]:!text-white [&_svg]:data-[active=true]:!text-white"
  }

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const messageSearchResults = React.useMemo(
    () =>
      mockContacts.reduce<Array<{ contact: Contact }>>(
        (results, contact) => {
          const query = searchQuery.trim()

          if (!query) {
            return results
          }

          const contactMessages = mockMessages[contact.id] ?? []
          const hasMatchInContact =
            isFuzzyMatch(contact.name, query) || isFuzzyMatch(contact.lastMessage, query)

          const matchingMessage = contactMessages.find((message) =>
            isFuzzyMatch(message.text, query),
          )

          if (!hasMatchInContact && !matchingMessage) {
            return results
          }

          results.push({
            contact,
          })

          return results
        },
        [],
      ),
    [searchQuery],
  )

  const athleteSearchResults = React.useMemo(
    () =>
      mockAthletes.reduce<Array<{ athlete: Athlete }>>(
        (results, athlete) => {
          const query = searchQuery.trim()

          if (!query) {
            return results
          }

          const hasMatchInAthlete =
            isFuzzyMatch(athlete.name, query) ||
            isFuzzyMatch(athlete.email, query) ||
            isFuzzyMatch(athlete.phone, query) ||
            isFuzzyMatch(athlete.country, query) ||
            isFuzzyMatch(athlete.category, query)

          if (!hasMatchInAthlete) {
            return results
          }

          results.push({
            athlete,
          })

          return results
        },
        [],
      ),
    [searchQuery],
  )

  const handleSearchResultClick = (contactId: string) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("messagingSelectedContactId", contactId)
      } catch {
      }
    }

    router.push("/app/messaging")

    if (typeof window !== "undefined") {
      const newHash = `#/app/messaging/${contactId}`

      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }

    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const handleAthleteSearchResultClick = (athleteId: string) => {
    router.push(`/app/athletes/${athleteId}/overview`)

    if (typeof window !== "undefined") {
      const newHash = `#/app/athletes/${athleteId}/overview`

      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }

    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const generalNavItems = [
    {
      href: "/app/dashboard",
      labelKey: "sidebar.links.dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/app/workouts",
      labelKey: "sidebar.links.workouts",
      icon: Dumbbell,
    },
  ] as const

  const businessNavItems = [
    {
      href: "/app/marketing",
      labelKey: "sidebar.links.marketing",
      icon: Megaphone,
    },
    {
      href: "/app/calendar",
      labelKey: "sidebar.links.calendar",
      icon: CalendarDays,
    },
  ] as const

  const athletesNavItems = [
    {
      href: "/app/athletes",
      labelKey: "sidebar.links.athletes",
      icon: Users,
    },
    {
      href: "/app/messaging",
      labelKey: "sidebar.links.messaging",
      icon: MessageCircle,
    },
  ] as const

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        {isCollapsed ? (
          <div className="flex items-center justify-center px-2 py-1">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <span className="text-base font-semibold">OneNinety</span>
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </div>
        )}
        </SidebarHeader>
        <SidebarContent className="gap-0">
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePath === "/app/home"}
                    tooltip="Home"
                    className={cn("text-xs", getActiveSidebarClasses(activePath === "/app/home"))}
                  >
                    <Link href="/app/home">
                      <Home className="shrink-0" />
                      {!isCollapsed && <span>Home</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="pb-0">
            <div className="flex h-6 items-center px-2">
              {isCollapsed ? (
                <div className="mx-auto h-px w-8 bg-sidebar-border" />
              ) : (
                <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                  {t("sidebar.group.general")}
                </span>
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {generalNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activePath === item.href
                  const label = t(item.labelKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className={cn("text-xs", getActiveSidebarClasses(isActive))}
                      >
                        <Link href={item.href}>
                          <Icon className="shrink-0" />
                          {!isCollapsed && <span>{label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="pb-0">
            <div className="flex h-6 items-center px-2">
              {isCollapsed ? (
                <div className="mx-auto h-px w-8 bg-sidebar-border" />
              ) : (
                <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                  BUSINESS
                </span>
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {businessNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activePath === item.href
                  const label = t(item.labelKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className={cn("text-xs", getActiveSidebarClasses(isActive))}
                      >
                        <Link href={item.href}>
                          <Icon className="shrink-0" />
                          {!isCollapsed && <span>{label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="pb-0">
            <div className="flex h-6 items-center px-2">
              {isCollapsed ? (
                <div className="mx-auto h-px w-8 bg-sidebar-border" />
              ) : (
                <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                  ATHLETES
                </span>
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {athletesNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.href === "/app/athletes"
                    ? activePath === item.href || activePath.startsWith(`${item.href}/`)
                    : activePath === item.href
                  const label = t(item.labelKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className={cn("text-xs", getActiveSidebarClasses(isActive))}
                      >
                        <Link href={item.href}>
                          <Icon className="shrink-0" />
                          {!isCollapsed && <span>{label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mt-auto px-2 pb-3 pt-2 space-y-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={activePath === "/app/settings"}
              tooltip={t("sidebar.settings.label") || "Settings"}
              className={cn("text-xs", getActiveSidebarClasses(activePath === "/app/settings"))}
            >
              <Link href="/app/settings">
                <Settings className="shrink-0" />
                {!isCollapsed && <span>{t("sidebar.settings.label") || "Settings"}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {isCollapsed ? (
                  <button
                    type="button"
                    className="hover:bg-accent/60 flex h-11 w-full items-center justify-center rounded-md p-2"
                    aria-label="Open account menu"
                  >
                    <Avatar className="h-8 w-8 rounded-md">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                ) : (
                <button
                  type="button"
                  className="hover:bg-accent/60 text-sm flex h-11 w-full items-center justify-between gap-2 rounded-md p-2 text-left"
                  aria-label="Open account menu"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 rounded-md">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="text-foreground truncate text-sm font-medium">
                        {displayName}
                      </span>
                      {displayEmail && (
                        <span className="text-muted-foreground truncate text-xs">
                          {displayEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                )}
              </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="center"
              collisionPadding={{ bottom: 8 }}
              className="w-64 rounded-2xl p-0"
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage src={user?.imageUrl} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="text-foreground truncate text-sm font-medium">
                    {displayName}
                  </span>
                  {displayEmail && (
                    <span className="text-muted-foreground truncate text-xs">
                      {displayEmail}
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator className="my-0" />
              <DropdownMenuItem
                className="cursor-pointer px-3 py-2"
                onClick={() => openUserProfile()}
              >
                <User />
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer px-3 py-2"
                onClick={() => openUserProfile()}
              >
                <CreditCard />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-0" />
              <DropdownMenuItem
                className="cursor-pointer px-3 py-2"
                variant="destructive"
                onClick={() => signOut({ redirectUrl: "/" })}
              >
                <LogOut />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </SidebarMenuItem>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-col gap-2 p-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2 px-2 py-0.5">
            <div className="flex items-center gap-2 flex-1">
              <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <PopoverTrigger asChild>
                  <div className="relative flex items-center flex-1">
                    <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      ref={searchInputRef}
                      type="search"
                      placeholder="Search across OneNinety..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-8 pr-20 h-10"
                    />
                    <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
                      <Kbd className="h-5 px-1.5">
                        {isClient && navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "⌘" : "Ctrl"}
                      </Kbd>
                      <Kbd className="h-5 px-1.5">K</Kbd>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[var(--radix-popover-trigger-width)] p-0" 
                  align="start"
                  sideOffset={4}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col">
                    {!searchQuery.trim() && (
                      <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[400px]">
                        <Search className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Search for leads, clients or workouts
                        </p>
                      </div>
                    )}
                    {searchQuery.trim() && messageSearchResults.length === 0 && athleteSearchResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[320px]">
                        <p className="text-sm text-muted-foreground">
                          No results found for <span className="font-medium">"{searchQuery}"</span>.
                        </p>
                      </div>
                    )}
                    {searchQuery.trim() && (messageSearchResults.length > 0 || athleteSearchResults.length > 0) && (
                      <div className="py-2">
                        {messageSearchResults.length > 0 && (
                          <>
                            <div className="px-3 pb-1 pt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Messages
                              </p>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto">
                              {messageSearchResults.map((result) => (
                                <button
                                  key={result.contact.id}
                                  type="button"
                                  onClick={() => handleSearchResultClick(result.contact.id)}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  aria-label={`Open conversation with ${result.contact.name}`}
                                >
                                  <Avatar className="h-8 w-8 rounded-md">
                                    <AvatarImage src={result.contact.avatar} alt={result.contact.name} />
                                    <AvatarFallback>
                                      {result.contact.name
                                        .split(" ")
                                        .map((part) => part.charAt(0).toUpperCase())
                                        .slice(0, 2)
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-medium">
                                      {result.contact.name}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {athleteSearchResults.length > 0 && (
                          <>
                            {messageSearchResults.length > 0 && (
                              <div className="px-3 pt-4 pb-1">
                                <div className="h-px bg-border" />
                              </div>
                            )}
                            <div className="px-3 pb-1 pt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Athletes
                              </p>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto">
                              {athleteSearchResults.map((result) => {
                                const initials = result.athlete.name
                                  .split(" ")
                                  .map((part) => part.charAt(0).toUpperCase())
                                  .slice(0, 2)
                                  .join("")
                                return (
                                  <button
                                    key={result.athlete.id}
                                    type="button"
                                    onClick={() => handleAthleteSearchResultClick(result.athlete.id)}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`Open profile for ${result.athlete.name}`}
                                  >
                                    <Avatar className="h-8 w-8 rounded-md">
                                      <AvatarImage src={result.athlete.avatar} alt={result.athlete.name} />
                                      <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                      <span className="truncate text-sm font-medium">
                                        {result.athlete.name}
                                      </span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center justify-center px-2">
              <div className="h-6 border-l" />
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Select language (current: ${availableLanguages.find((lang) => lang.code === currentLanguage)?.label || "English"})`}
                  >
                    <span className="text-lg leading-none">
                      {availableLanguages.find((lang) => lang.code === currentLanguage)?.flag || "🇬🇧"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={currentLanguage}
                    onValueChange={setCurrentLanguage}
                  >
                    {availableLanguages.map((language) => (
                      <DropdownMenuRadioItem
                        key={language.code}
                        value={language.code}
                        className={cn(
                          currentLanguage === language.code && "bg-accent"
                        )}
                      >
                        <span className="mr-2 text-lg leading-none">{language.flag}</span>
                        <span className="flex-1">{language.label}</span>
                        {currentLanguage === language.code && (
                          <Check className="ml-2 size-4" />
                        )}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {isThemeMounted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={t("sidebar.theme.toggleAria")}
                    >
                      {currentTheme === "dark" ? (
                        <Moon className="size-4" />
                      ) : currentTheme === "light" ? (
                        <Sun className="size-4" />
                      ) : (
                        <Laptop className="size-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup
                      value={currentTheme}
                      onValueChange={(value) => setTheme(value)}
                    >
                      <DropdownMenuRadioItem
                        value="light"
                        className={cn(currentTheme === "light" && "bg-accent")}
                      >
                        <Sun className="mr-2 size-4" />
                        <span className="flex-1">Light</span>
                        {currentTheme === "light" && (
                          <Check className="ml-2 size-4" />
                        )}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="dark"
                        className={cn(currentTheme === "dark" && "bg-accent")}
                      >
                        <Moon className="mr-2 size-4" />
                        <span className="flex-1">Dark</span>
                        {currentTheme === "dark" && (
                          <Check className="ml-2 size-4" />
                        )}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="system"
                        className={cn(currentTheme === "system" && "bg-accent")}
                      >
                        <Laptop className="mr-2 size-4" />
                        <span className="flex-1">System</span>
                        {currentTheme === "system" && (
                          <Check className="ml-2 size-4" />
                        )}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                size="icon"
                aria-label="Help"
                onClick={() => {}}
              >
                <HelpCircle className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {children}
        </div>
      </SidebarInset>
    </>
  )
}



