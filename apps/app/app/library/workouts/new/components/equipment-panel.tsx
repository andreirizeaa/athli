"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type ExerciseWithEquipment = {
  equipments?: string[]
}

type EquipmentPanelProps = {
  sections: Array<{
    exercises?: ExerciseWithEquipment[]
  }>
}

export const EquipmentPanel = ({ sections }: EquipmentPanelProps) => {
  const uniqueEquipment = useMemo(() => {
    const equipmentSet = new Set<string>()
    sections.forEach((section) => {
      section.exercises?.forEach((exercise) => {
        exercise.equipments?.forEach((equipment) => {
          if (equipment && equipment.trim() !== "") {
            equipmentSet.add(equipment)
          }
        })
      })
    })
    return Array.from(equipmentSet).sort()
  }, [sections])

  return (
    <>
      <h2 className="text-left mb-3">Equipment</h2>
      <div className="min-h-[50px] mb-3">
        <div className="flex flex-wrap gap-2">
          {uniqueEquipment.length > 0 ? (
            uniqueEquipment.map((equipment) => (
              <Badge key={equipment} variant="outline">
                {equipment}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No equipment required</p>
          )}
        </div>
      </div>
      <div className="mb-3 -mx-4 w-[calc(100%+2rem)]">
        <Separator className="w-full" />
      </div>
    </>
  )
}

