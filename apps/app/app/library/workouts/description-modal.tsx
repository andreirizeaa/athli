"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type DescriptionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  description: string
  programName: string
}

const DescriptionModal = ({ open, onOpenChange, description, programName }: DescriptionModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{programName} - Description</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DescriptionModal

