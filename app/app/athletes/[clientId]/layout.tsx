"use client"

import React, { useState } from "react"
import { useParams, useRouter, useSelectedLayoutSegments } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PageTabs } from "@/components/page-tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { MessageCircle, Trash2, Users, X } from "lucide-react"
import { mockAthletes } from "@/components/app/app-shell"

type ClientProfileLayoutProps = {
  children: React.ReactNode
}

const ClientProfileLayout = ({ children }: ClientProfileLayoutProps) => {
  const router = useRouter()
  const segments = useSelectedLayoutSegments()
  const params = useParams<{ clientId: string }>()
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId

  const athlete = mockAthletes.find((item) => item.id === clientId)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const tabs = [
    {
      value: "overview",
      label: "Overview",
    },
    {
      value: "metrics",
      label: "Metrics",
    },
    {
      value: "workouts",
      label: "Workouts",
    },
    {
      value: "training-calendar",
      label: "Training Calendar",
    },
    {
      value: "app-settings",
      label: "App Settings",
    },
  ]

  const validTabValues = tabs.map((tab) => tab.value)
  const lastSegment = segments[segments.length - 1]
  const activeTab = lastSegment && validTabValues.includes(lastSegment) ? lastSegment : "overview"

  const handleTabChange = (value: string) => {
    if (!clientId) {
      return
    }

    if (value === activeTab) {
      return
    }

    router.push(`/app/athletes/${clientId}/${value}`)
  }

  const handleNavigateToAthletes = () => {
    router.push("/app/athletes")

    if (typeof window !== "undefined") {
      const newHash = "#/app/athletes"
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
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

    router.push("/app/messaging")

    if (typeof window !== "undefined") {
      const newHash = `#/app/messaging/${athleteId}`
      window.setTimeout(() => {
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }, 0)
    }
  }

  const handleDelete = () => {
    setIsDeleteModalOpen(false)
    toast.success("Client deleted successfully", {
      style: {
        background: "rgb(220 252 231)",
        color: "rgb(20 83 45)",
        border: "1px solid rgb(187 247 208)",
      },
    })
  }

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false)
  }

  if (!athlete) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="w-full relative">
          <div className="px-4 flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">Client not found</h1>
            <Button
              onClick={handleNavigateToAthletes}
              className="gap-2"
              aria-label="View all clients"
            >
              <Users className="size-4" />
              <span>All Clients</span>
            </Button>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
        <div className="w-full flex-1 overflow-auto px-4 py-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            We could not find a client with this id.
          </p>
        </div>
      </div>
    )
  }

  const initials = athlete.name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("")

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between mb-2 mt-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={athlete.avatar} alt={athlete.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <h1 className="text-[22px] font-semibold">
              {athlete.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleNavigateToMessages(clientId)}
              variant="secondary"
              className="gap-2"
              aria-label="Open message with this client"
            >
              <MessageCircle className="size-4" />
              <span>Message</span>
            </Button>
            <Button
              onClick={handleNavigateToAthletes}
              className="gap-2 bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-800 dark:hover:bg-gray-100"
              aria-label="View all clients"
            >
              <Users className="size-4" />
              <span>All Clients</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="gap-2"
                  aria-label="Delete client options"
                >
                  <Trash2 className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)}>
                  Continue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="px-4">
          <PageTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={handleTabChange}
            className="mt-1"
          />
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 bg-sidebar">
        {children}
      </div>
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="w-full max-w-[500px] sm:max-w-[500px] flex flex-col" showCloseButton={false}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">Delete</DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 mt-4">
            {/* Content will be added here later */}
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ClientProfileLayout


