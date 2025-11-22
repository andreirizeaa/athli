'use client'

import React from "react"
import type { ReactNode } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
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

type DashboardShellProps = {
  children: ReactNode
}

export const DashboardShell = ({ children }: DashboardShellProps) => {
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

    const hashPath = routePathToHashPath(pathname)
    if (!hashPath) {
      return
    }

    const desiredHash = `#${hashPath}`
    const isOnRoot = window.location.pathname === "/"

    if (!isOnRoot || window.location.hash !== desiredHash) {
      window.history.replaceState(null, "", `/${desiredHash}`)
    }
  }, [pathname])

  return (
    <SidebarProvider>
      <DashboardShellContent
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
      </DashboardShellContent>
    </SidebarProvider>
  )
}

const DashboardShellContent = ({
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
  const searchContainerRef = React.useRef<HTMLDivElement>(null)
  const [activePath, setActivePath] = React.useState(pathname)

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

    const routeFromHash = hashPathToRoutePath(hashPath)

    if (routeFromHash) {
      setActivePath(routeFromHash)
      return
    }

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

  const handleSearchFocus = () => {
    setIsSearchOpen(true)
  }

  const handleSearchBlur = (e: React.FocusEvent) => {
    // Don't close if clicking inside the popover
    if (searchContainerRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    setIsSearchOpen(false)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setIsSearchOpen(true)
  }

  const generalNavItems = [
    {
      href: "/app",
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

  const clientsNavItems = [
    {
      href: "/app/clients",
      labelKey: "sidebar.links.athletes",
      icon: Users,
    },
    {
      href: "/app/messaging",
      labelKey: "sidebar.links.messaging",
      icon: MessageCircle,
    },
  ] as const

  const pageTitleMap: Record<string, string> = {
    "/app": t("sidebar.links.dashboard"),
    "/app/home": "Home",
    "/app/marketing": t("sidebar.links.marketing"),
    "/app/messaging": t("sidebar.links.messaging"),
    "/app/workouts": t("sidebar.links.workouts"),
    "/app/clients": t("sidebar.links.athletes"),
    "/app/calendar": t("sidebar.links.calendar"),
    "/app/settings": t("sidebar.settings.label") || "Settings",
  }

  const getPageTitle = () => {
    return pageTitleMap[activePath] || "Dashboard"
  }

  const pageTitle = getPageTitle()

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
        <SidebarContent className={cn("gap-2", !isCollapsed && "gap-0")}>
          <SidebarGroup className={cn("pb-1", !isCollapsed && "pt-0 pb-0")}>
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
          {isCollapsed && (
            <div className="flex justify-center my-0.5 px-2">
              <div className="h-px w-8 bg-sidebar-border" />
            </div>
          )}
          <SidebarGroup className={cn("pb-1", !isCollapsed && "pt-0 pb-0")}>
            <SidebarGroupLabel className={cn("text-xs uppercase", isCollapsed && "text-[10px] opacity-100 -mt-0", !isCollapsed && "pt-1 pb-1 mt-1.5")}>
              {t("sidebar.group.general")}
            </SidebarGroupLabel>
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
          {isCollapsed && (
            <div className="flex justify-center my-0.5 px-2">
              <div className="h-px w-8 bg-sidebar-border" />
            </div>
          )}
          <SidebarGroup className={cn("pb-1", !isCollapsed && "pt-0 pb-0")}>
            <SidebarGroupLabel className={cn("text-xs uppercase", isCollapsed && "text-[10px] opacity-100 -mt-0", !isCollapsed && "pt-1 pb-1 mt-1.5")}>
              BUSINESS
            </SidebarGroupLabel>
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
          {isCollapsed && (
            <div className="flex justify-center my-0.5 px-2">
              <div className="h-px w-8 bg-sidebar-border" />
            </div>
          )}
          <SidebarGroup className={cn("pb-1", !isCollapsed && "pt-0 pb-0")}>
            <SidebarGroupLabel className={cn("text-xs uppercase", isCollapsed && "text-[10px] opacity-100 -mt-0", !isCollapsed && "pt-1 pb-1 mt-1.5")}>
              CLIENTS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {clientsNavItems.map((item) => {
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <div className="flex justify-center w-full">
                  <button
                    type="button"
                    className="hover:bg-accent/60 flex h-9 w-9 items-center justify-center rounded-md"
                    aria-label="Open account menu"
                  >
                    <Avatar className="h-8 w-8 rounded-md">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </div>
              ) : (
              <button
                type="button"
                className="hover:bg-accent/60 text-sm flex h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left"
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
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col gap-2 p-2 border-b">
          <div className="flex items-center justify-between gap-2 px-2 py-0.5">
            <span className="text-base font-semibold">{pageTitle}</span>
            <div className="flex items-center justify-center px-2">
              <div className="h-6 border-l" />
            </div>
            <div className="flex items-center gap-2 flex-1" ref={searchContainerRef}>
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
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                      className="pl-8 pr-20 h-8"
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
                    <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[400px]">
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Search for leads, clients or workouts
                      </p>
                    </div>
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
                    size="icon-sm"
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
                      size="icon-sm"
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
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </SidebarInset>
    </>
  )
}

