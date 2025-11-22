"use client"

import React from "react"
import Link from "next/link"
import { Check, Laptop, Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useClerk, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { availableLanguages } from "@/lib/intl-provider"

const menuItems = [
  { name: "Features", href: "#link" },
  { name: "Solution", href: "#link" },
  { name: "Pricing", href: "#link" },
  { name: "About", href: "#link" },
]

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isThemeMounted, setIsThemeMounted] = React.useState(false)
  const [currentLanguage, setCurrentLanguage] = React.useState("en")
  const { resolvedTheme, setTheme, theme } = useTheme()
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const router = useRouter()

  const currentTheme = theme || "system"

  const handleAuthClick = () => {
    if (isSignedIn) {
      router.push("/app/home")
      return
    }

    openSignIn({
      redirectUrl: "/app/home",
    })
  }

  React.useEffect(() => {
    setIsThemeMounted(true)

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-20 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "max-w-4xl rounded-2xl border bg-background/50 backdrop-blur-lg lg:px-5"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full items-center justify-between lg:w-auto">
              <Link
                href="/"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState === true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className="block text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 in-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="block text-muted-foreground duration-150 hover:text-accent-foreground"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full justify-end md:w-fit">
                <div className="flex items-center gap-1.5">
                  {!isScrolled && (
                    <Button variant="outline" size="sm" onClick={handleAuthClick}>
                      <span>Login</span>
                    </Button>
                  )}
                  {isScrolled && (
                    <Button size="sm" onClick={handleAuthClick}>
                      <span>Grow Today</span>
                    </Button>
                  )}
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
                          aria-label="Toggle theme"
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
          </div>
        </div>
      </nav>
    </header>
  )
}
