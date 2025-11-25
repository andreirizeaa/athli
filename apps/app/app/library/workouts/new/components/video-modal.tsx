"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Exercise } from "@/lib/exercise-search"

type VideoModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise: Exercise | null
}

export const VideoModal = ({ open, onOpenChange, exercise }: VideoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl flex flex-col" showCloseButton={false}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-left">{exercise?.name}</DialogTitle>
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
        {exercise && (
          <div className="mt-4 w-full aspect-video">
            <video
              src={exercise.videoUrl}
              controls
              autoPlay
              className="w-full h-full rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

