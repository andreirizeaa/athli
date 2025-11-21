'use client'

import React from "react"
import type { ReactNode } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import {
  Bell,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Moon,
  MoreVertical,
  Sun,
  User,
  Users,
  CalendarDays,
} from "lucide-react"
import Link from "next/link"

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
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type DashboardShellProps = {
  children: ReactNode
}

export const DashboardShell = ({ children }: DashboardShellProps) => {
  const t = useTranslations()
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { resolvedTheme, setTheme } = useTheme()
  const [isThemeMounted, setIsThemeMounted] = React.useState(false)
  const pathname = usePathname()

  const displayName =
    user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "User"
  const displayEmail = user?.primaryEmailAddress?.emailAddress

  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") || "U"

  React.useEffect(() => {
    setIsThemeMounted(true)
  }, [])

  const handleToggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }

  const handleLanguageClick = () => {
    // Language switcher hook-in point.
  }

  const isDarkTheme = resolvedTheme === "dark"
  const nextTheme = isDarkTheme ? "light" : "dark"
  const themeLabel =
    nextTheme === "light"
      ? t("sidebar.theme.lightMode")
      : t("sidebar.theme.darkMode")
  const ThemeIcon = nextTheme === "light" ? Sun : Moon

  const navItems = [
    {
      href: "/dashboard",
      labelKey: "sidebar.links.dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/marketing",
      labelKey: "sidebar.links.marketing",
      icon: Megaphone,
    },
    {
      href: "/dashboard/messaging",
      labelKey: "sidebar.links.messaging",
      icon: MessageCircle,
    },
    {
      href: "/dashboard/workouts",
      labelKey: "sidebar.links.workouts",
      icon: Dumbbell,
    },
    {
      href: "/dashboard/clients",
      labelKey: "sidebar.links.athletes",
      icon: Users,
    },
    {
      href: "/dashboard/calendar",
      labelKey: "sidebar.links.calendar",
      icon: CalendarDays,
    },
  ] as const

  return (
    <SidebarProvider>
      <Sidebar className="border-r">
        <SidebarHeader className="border-b">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-base font-semibold">OneNinety</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.group.general")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  const label = t(item.labelKey)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                      >
                        <Link href={item.href}>
                          <Icon className="shrink-0" />
                          <span>{label}</span>
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
          <div className="space-y-0">
            {isThemeMounted && (
              <button
                type="button"
                onClick={handleToggleTheme}
                className={cn(
                  "hover:bg-muted flex h-9 w-full items-center justify-between rounded-md px-2 text-sm font-medium text-foreground transition-colors"
                )}
                aria-label={t("sidebar.theme.toggleAria")}
              >
                <div className="flex items-center gap-2">
                  <ThemeIcon className="h-3.5 w-3.5" />
                  <span>{themeLabel}</span>
                </div>
              </button>
            )}
            <button
              type="button"
              onClick={handleLanguageClick}
              className="hover:bg-muted flex h-9 w-full items-center justify-between rounded-md px-2 text-sm font-medium text-foreground transition-colors"
              aria-label={t("sidebar.language.aria")}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">🇬🇧</span>
                <span>{t("sidebar.language.label")}</span>
              </div>
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

