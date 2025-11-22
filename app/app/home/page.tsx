"use client"

import { useUser } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { Separator } from "@/components/ui/separator"

const HomePage = () => {
  const { user } = useUser()
  const t = useTranslations()

  const hour = new Date().getHours()
  const firstName = user?.firstName || "there"

  let greetingKey = "greetings.goodMorning"
  if (hour >= 12 && hour < 18) {
    greetingKey = "greetings.goodAfternoon"
  } else if (hour >= 18) {
    greetingKey = "greetings.goodEvening"
  }

  const greeting = `${t(greetingKey)}, ${firstName}`

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">{greeting}</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4">
        {/* Home content */}
      </div>
    </div>
  )
}

export default HomePage

