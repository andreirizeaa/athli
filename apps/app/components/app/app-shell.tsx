'use client'

import React from "react"
import type { ReactNode } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import {
  Archive,
  Bell,
  Check,
  CreditCard,
  ChevronsLeft,
  Home,
  Laptop,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  HelpCircle,
  Moon,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  Users,
  CalendarDays,
} from "lucide-react"
import Link from "next/link"
import { LogoIcon } from "@/components/logo"
import { Spinner } from "@/components/ui/spinner"

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
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  replyTo?: {
    id: string
    text: string
    isSent: boolean
  }
  pdf?: {
    name: string
    data: string // base64 encoded
    type: string
    size: number
  }
  images?: Array<{
    name: string
    data: string // base64 encoded
    type: string
    size: number
  }>
  video?: {
    name: string
    data: string // base64 encoded
    type: string
    size: number
  }
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

export type Workout = {
  id: string
  program: string
  description: string
  type: string
  length: string
  totalExercises: number
  equipment: string
  created: string // dd-mm-yy format
}

export type Program = {
  id: string
  program: string
  description: string
  type: string
  length: string
  totalExercises: number
  equipment: string
  created: string // dd-mm-yy format
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

export const mockWorkouts: Workout[] = [
  {
    id: "1",
    program: "Strength Builder",
    description: "A comprehensive strength training program designed to build muscle mass and increase overall strength. This program focuses on compound movements and progressive overload principles.",
    type: "Strength",
    length: "12 weeks",
    equipment: "Barbell, Dumbbells, Bench",
    totalExercises: 24,
    created: "15-03-24",
  },
  {
    id: "2",
    program: "Cardio Blast",
    description: "High-intensity cardio workout program perfect for improving cardiovascular health and burning calories. Includes interval training and endurance exercises.",
    type: "Cardio",
    length: "8 weeks",
    totalExercises: 18,
    equipment: "Treadmill, Bike, Rowing Machine",
    created: "22-01-24",
  },
  {
    id: "3",
    program: "Flexibility Flow",
    description: "A yoga and stretching focused program that enhances flexibility, mobility, and relaxation. Ideal for recovery days and improving range of motion.",
    type: "Flexibility",
    length: "6 weeks",
    totalExercises: 15,
    equipment: "Yoga Mat, Blocks, Straps",
    created: "10-02-24",
  },
  {
    id: "4",
    program: "HIIT Power",
    description: "High-intensity interval training program that alternates between intense bursts of activity and fixed periods of rest. Great for time-efficient workouts.",
    type: "HIIT",
    length: "4 weeks",
    totalExercises: 12,
    equipment: "Bodyweight, Kettlebells",
    created: "05-04-24",
  },
  {
    id: "5",
    program: "Endurance Runner",
    description: "Progressive running program designed to build endurance and improve running performance. Includes tempo runs, intervals, and long-distance training.",
    type: "Endurance",
    length: "16 weeks",
    totalExercises: 20,
    equipment: "Running Shoes, Track",
    created: "18-12-23",
  },
  {
    id: "6",
    program: "Bodyweight Basics",
    description: "No-equipment workout program using only bodyweight exercises. Perfect for home workouts and building functional strength.",
    type: "Bodyweight",
    length: "10 weeks",
    totalExercises: 16,
    equipment: "None",
    created: "28-03-24",
  },
  {
    id: "7",
    program: "Powerlifting Prep",
    description: "Specialized program for powerlifting competition preparation. Focuses on squat, bench press, and deadlift with periodization.",
    type: "Powerlifting",
    length: "20 weeks",
    totalExercises: 8,
    equipment: "Power Rack, Barbell, Plates",
    created: "12-11-23",
  },
]

export const mockPrograms: Program[] = [
  {
    id: "1",
    program: "Strength Builder",
    description: "A comprehensive strength training program designed to build muscle mass and increase overall strength. This program focuses on compound movements and progressive overload principles.",
    type: "Strength",
    length: "12 weeks",
    equipment: "Barbell, Dumbbells, Bench",
    totalExercises: 24,
    created: "15-03-24",
  },
  {
    id: "2",
    program: "Cardio Blast",
    description: "High-intensity cardio workout program perfect for improving cardiovascular health and burning calories. Includes interval training and endurance exercises.",
    type: "Cardio",
    length: "8 weeks",
    totalExercises: 18,
    equipment: "Treadmill, Bike, Rowing Machine",
    created: "22-01-24",
  },
  {
    id: "3",
    program: "Flexibility Flow",
    description: "A yoga and stretching focused program that enhances flexibility, mobility, and relaxation. Ideal for recovery days and improving range of motion.",
    type: "Flexibility",
    length: "6 weeks",
    totalExercises: 15,
    equipment: "Yoga Mat, Blocks, Straps",
    created: "10-02-24",
  },
  {
    id: "4",
    program: "HIIT Power",
    description: "High-intensity interval training program that alternates between intense bursts of activity and fixed periods of rest. Great for time-efficient workouts.",
    type: "HIIT",
    length: "4 weeks",
    totalExercises: 12,
    equipment: "Bodyweight, Kettlebells",
    created: "05-04-24",
  },
  {
    id: "5",
    program: "Endurance Runner",
    description: "Progressive running program designed to build endurance and improve running performance. Includes tempo runs, intervals, and long-distance training.",
    type: "Endurance",
    length: "16 weeks",
    totalExercises: 20,
    equipment: "Running Shoes, Track",
    created: "18-12-23",
  },
  {
    id: "6",
    program: "Bodyweight Basics",
    description: "No-equipment workout program using only bodyweight exercises. Perfect for home workouts and building functional strength.",
    type: "Bodyweight",
    length: "10 weeks",
    totalExercises: 16,
    equipment: "None",
    created: "28-03-24",
  },
  {
    id: "7",
    program: "Powerlifting Prep",
    description: "Specialized program for powerlifting competition preparation. Focuses on squat, bench press, and deadlift with periodization.",
    type: "Powerlifting",
    length: "20 weeks",
    totalExercises: 8,
    equipment: "Power Rack, Barbell, Plates",
    created: "12-11-23",
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

  
  return (
    <SidebarProvider defaultOpen={false} className="h-svh">
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
  const { state, toggleSidebar, isHovered, setOpen, setIsHovered, setJustClosed } = useSidebar()
  const isCollapsed = state === "collapsed" && !isHovered
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false)
  const isPinnedOpen = state === "expanded" && !isHovered
  const isHoverExpanded = state === "collapsed" && isHovered

  // Keep sidebar open when profile dropdown is open, collapse when it closes
  React.useEffect(() => {
    if (isProfileDropdownOpen) {
      setOpen(true)
      setJustClosed(false)
    } else {
      // Collapse sidebar when profile dropdown closes
      setIsHovered(false)
      setJustClosed(true)
      setOpen(false)
      // Reset the justClosed flag after a short delay to allow hover to work again
      setTimeout(() => {
        setJustClosed(false)
      }, 300)
    }
  }, [isProfileDropdownOpen, setOpen, setIsHovered, setJustClosed])

  const handlePinMenu = () => {
    setOpen(true)
    setJustClosed(false)
  }

  const handleUnpinMenu = () => {
    setIsHovered(false)
    setJustClosed(true)
    setOpen(false)
    // Reset the justClosed flag after a short delay to allow hover to work again
    setTimeout(() => {
      setJustClosed(false)
    }, 300)
  }
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isClient, setIsClient] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [activePath, setActivePath] = React.useState(pathname)
  const router = useRouter()

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  // Use Next.js pathname directly
  React.useEffect(() => {
      setActivePath(pathname)
  }, [pathname])

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
    // Light mode: custom dark gray background (#3f3c39), white text (background)
    // Dark mode: white background (foreground), black text (background)
    // Override sidebar's default bg-primary/10 and text-primary with stronger specificity
    return "data-[active=true]:!bg-[#3f3c39] dark:data-[active=true]:!bg-foreground data-[active=true]:!text-background [&_svg]:data-[active=true]:!text-background"
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

  const workoutSearchResults = React.useMemo(
    () =>
      mockWorkouts.reduce<Array<{ workout: Workout }>>(
        (results, workout) => {
          const query = searchQuery.trim()

          if (!query) {
            return results
          }

          const hasMatchInWorkout =
            isFuzzyMatch(workout.program, query) ||
            isFuzzyMatch(workout.description, query) ||
            isFuzzyMatch(workout.type, query) ||
            isFuzzyMatch(workout.equipment, query)

          if (!hasMatchInWorkout) {
            return results
          }

          results.push({
            workout,
          })

          return results
        },
        [],
      ),
    [searchQuery],
  )

  const programSearchResults = React.useMemo(
    () =>
      mockPrograms.reduce<Array<{ program: Program }>>(
        (results, program) => {
          const query = searchQuery.trim()

          if (!query) {
            return results
          }

          const hasMatchInProgram =
            isFuzzyMatch(program.program, query) ||
            isFuzzyMatch(program.description, query) ||
            isFuzzyMatch(program.type, query) ||
            isFuzzyMatch(program.equipment, query)

          if (!hasMatchInProgram) {
            return results
          }

          results.push({
            program,
          })

          return results
        },
        [],
      ),
    [searchQuery],
  )

  const handleSearchResultClick = (contactId: string) => {
    router.push(`/messaging?contact=${contactId}`)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const handleAthleteSearchResultClick = (athleteId: string) => {
    router.push(`/athletes/${athleteId}/overview`)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const handleWorkoutSearchResultClick = (workoutId: string) => {
    router.push(`/library/workouts/${workoutId}`)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const handleProgramSearchResultClick = (programId: string) => {
    router.push(`/library/programs/${programId}`)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const generalNavItems = [
    {
      href: "/dashboard",
      labelKey: "sidebar.links.dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/library",
      label: "Library",
      icon: Archive,
    },
  ] as const

  const businessNavItems = [
    {
      href: "/marketing",
      labelKey: "sidebar.links.marketing",
      icon: Megaphone,
    },
    {
      href: "/calendar",
      labelKey: "sidebar.links.calendar",
      icon: CalendarDays,
    },
  ] as const

  const athletesNavItems = [
    {
      href: "/athletes",
      labelKey: "sidebar.links.athletes",
      icon: Users,
    },
    {
      href: "/messaging",
      labelKey: "sidebar.links.messaging",
      icon: MessageCircle,
    },
  ] as const

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        {isCollapsed ? (
          <div className="flex items-center justify-center px-2 py-1 h-10">
            <LogoIcon className="h-5 w-auto" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 py-1 h-10">
            <span className="text-base font-semibold">OneNinety</span>
            {isHoverExpanded ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handlePinMenu}
                    className="flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
                    aria-label="Keep menu open"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Keep menu open
                </TooltipContent>
              </Tooltip>
            ) : (
            <button
              type="button"
                onClick={handleUnpinMenu}
              className="flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
                aria-label="Close sidebar"
            >
                <PanelLeftClose className="h-4 w-4" />
            </button>
            )}
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
                    isActive={activePath === "/home"}
                    className={cn("text-xs", getActiveSidebarClasses(activePath === "/home"))}
                  >
                    <Link href="/home">
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
                  const isActive = item.href === "/library"
                    ? activePath === item.href || activePath.startsWith(`${item.href}/`)
                    : activePath === item.href
                  const label = "label" in item ? item.label : t(item.labelKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
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
                  const isActive = item.href === "/athletes"
                    ? activePath === item.href || activePath.startsWith(`${item.href}/`)
                    : activePath === item.href
                  const label = t(item.labelKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
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
                  const isActive =
                    activePath === item.href || activePath.startsWith(`${item.href}/`)
                  const label = t(item.labelKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
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
              isActive={activePath === "/settings"}
              className={cn("text-xs", getActiveSidebarClasses(activePath === "/settings"))}
            >
              <Link href="/settings">
                <Settings className="shrink-0" />
                {!isCollapsed && <span>{t("sidebar.settings.label") || "Settings"}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu open={isProfileDropdownOpen} onOpenChange={setIsProfileDropdownOpen}>
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
                  className="hover:bg-accent/60 text-sm flex h-11 w-full items-center justify-between gap-2 rounded-md pl-0 pr-2 pt-2 pb-2 text-left"
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
                onClick={() => {
                  setIsLoggingOut(true)
                  const wwwUrl = process.env.NODE_ENV === 'production' 
                    ? 'https://oneninety.com'
                    : 'http://localhost:3000'
                  signOut({ redirectUrl: wwwUrl })
                }}
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
                  <div className="flex flex-col max-h-[80vh] overflow-y-auto">
                    {!searchQuery.trim() && (
                      <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[400px]">
                        <Search className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Search for leads, clients or workouts
                        </p>
                      </div>
                    )}
                    {searchQuery.trim() && messageSearchResults.length === 0 && athleteSearchResults.length === 0 && workoutSearchResults.length === 0 && programSearchResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 min-h-[320px]">
                        <p className="text-sm text-muted-foreground">
                          No results found for <span className="font-medium">"{searchQuery}"</span>.
                        </p>
                      </div>
                    )}
                    {searchQuery.trim() && (messageSearchResults.length > 0 || athleteSearchResults.length > 0 || workoutSearchResults.length > 0 || programSearchResults.length > 0) && (
                      <div className="py-2">
                        {athleteSearchResults.length > 0 && (
                          <>
                            <div className="px-3 pb-1 pt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Athletes
                              </p>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                              <div className={cn(
                                "grid gap-2",
                                athleteSearchResults.length === 1 ? "grid-cols-1" : athleteSearchResults.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                              )}>
                                {athleteSearchResults.map((result) => {
                                  const initials = result.athlete.name
                                    .split(" ")
                                    .map((part) => part.charAt(0).toUpperCase())
                                    .slice(0, 2)
                                    .join("")
                                  return (
                                    <Card
                                      key={result.athlete.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => handleAthleteSearchResultClick(result.athlete.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault()
                                          handleAthleteSearchResultClick(result.athlete.id)
                                        }
                                      }}
                                      className="cursor-pointer hover:bg-accent transition-colors p-3"
                                      aria-label={`Open profile for ${result.athlete.name}`}
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-8 w-8 rounded-md">
                                            <AvatarImage src={result.athlete.avatar} alt={result.athlete.name} />
                                            <AvatarFallback>{initials}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm font-medium truncate">
                                            {result.athlete.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span>{result.athlete.category}</span>
                                          <span>•</span>
                                          <span>{result.athlete.country}</span>
                                        </div>
                                      </div>
                                    </Card>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        )}
                        {workoutSearchResults.length > 0 && (
                          <>
                            {(athleteSearchResults.length > 0) && (
                              <div className="px-3 pt-4 pb-1">
                                <div className="h-px bg-border" />
                              </div>
                            )}
                            <div className="px-3 pb-1 pt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Workouts
                              </p>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                              <div className={cn(
                                "grid gap-2",
                                workoutSearchResults.length === 1 ? "grid-cols-1" : workoutSearchResults.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                              )}>
                                {workoutSearchResults.map((result) => (
                                  <Card
                                    key={result.workout.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleWorkoutSearchResultClick(result.workout.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        handleWorkoutSearchResultClick(result.workout.id)
                                      }
                                    }}
                                    className="cursor-pointer hover:bg-accent transition-colors p-3"
                                    aria-label={`Open workout ${result.workout.program}`}
                                  >
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                          <Archive className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <span className="text-sm font-medium truncate">
                                          {result.workout.program}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{result.workout.type}</span>
                                        <span>•</span>
                                        <span>{result.workout.length}</span>
                                        <span>•</span>
                                        <span>{result.workout.totalExercises} exercises</span>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        {programSearchResults.length > 0 && (
                          <>
                            {(athleteSearchResults.length > 0 || workoutSearchResults.length > 0) && (
                              <div className="px-3 pt-4 pb-1">
                                <div className="h-px bg-border" />
                              </div>
                            )}
                            <div className="px-3 pb-1 pt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Programs
                              </p>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                              <div className={cn(
                                "grid gap-2",
                                programSearchResults.length === 1 ? "grid-cols-1" : programSearchResults.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                              )}>
                                {programSearchResults.map((result) => (
                                  <Card
                                    key={result.program.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleProgramSearchResultClick(result.program.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        handleProgramSearchResultClick(result.program.id)
                                      }
                                    }}
                                    className="cursor-pointer hover:bg-accent transition-colors p-3"
                                    aria-label={`Open program ${result.program.program}`}
                                  >
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                          <Archive className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <span className="text-sm font-medium truncate">
                                          {result.program.program}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{result.program.type}</span>
                                        <span>•</span>
                                        <span>{result.program.length}</span>
                                        <span>•</span>
                                        <span>{result.program.totalExercises} exercises</span>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        {messageSearchResults.length > 0 && (
                          <>
                            {(athleteSearchResults.length > 0 || workoutSearchResults.length > 0 || programSearchResults.length > 0) && (
                              <div className="px-3 pt-4 pb-1">
                                <div className="h-px bg-border" />
                              </div>
                            )}
                            <div className="px-3 pb-1 pt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Messages
                              </p>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto px-3 pb-2">
                              <div className={cn(
                                "grid gap-2",
                                messageSearchResults.length === 1 ? "grid-cols-1" : messageSearchResults.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                              )}>
                                {messageSearchResults.map((result) => {
                                  const initials = result.contact.name
                                    .split(" ")
                                    .map((part) => part.charAt(0).toUpperCase())
                                    .slice(0, 2)
                                    .join("")
                                  return (
                                    <Card
                                      key={result.contact.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => handleSearchResultClick(result.contact.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault()
                                          handleSearchResultClick(result.contact.id)
                                        }
                                      }}
                                      className="cursor-pointer hover:bg-accent transition-colors p-3"
                                      aria-label={`Open conversation with ${result.contact.name}`}
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-8 w-8 rounded-md">
                                            <AvatarImage src={result.contact.avatar} alt={result.contact.name} />
                                            <AvatarFallback>{initials}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm font-medium truncate">
                                            {result.contact.name}
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {result.contact.lastMessage}
                                        </div>
                                      </div>
                                    </Card>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex items-center justify-center px-2">
                <div className="h-6 border-l" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90"
                    aria-label="AI Assistant"
                  >
                    <Sparkles className="size-4" />
                    AI Assistant
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">Logging out...</p>
          </div>
        </div>
      )}
    </>
  )
}



