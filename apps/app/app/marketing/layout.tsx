"use client"

import React from "react"
import { useRouter, useSelectedLayoutSegments } from "next/navigation"
import { PageTabs } from "@/components/page-tabs"

type MarketingLayoutProps = {
  children: React.ReactNode
}

const tabs = [
  {
    value: "landing",
    label: "Landing Page",
  },
  {
    value: "analytics",
    label: "Analytics",
  },
  {
    value: "leads",
    label: "Leads",
  },
]

const MarketingLayout = ({ children }: MarketingLayoutProps) => {
  const router = useRouter()
  const segments = useSelectedLayoutSegments()

  const validTabValues = tabs.map((tab) => tab.value)
  const lastSegment = segments[segments.length - 1]
  const activeTab = lastSegment && validTabValues.includes(lastSegment) ? lastSegment : "landing"

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return
    }

    router.push(`/marketing/${value}`)
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full px-4">
        <h1 className="text-[22px] font-semibold mb-2 mt-2">Marketing</h1>
        <PageTabs
          tabs={tabs}
          value={activeTab}
          onValueChange={handleTabChange}
          className="mt-1"
        />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 bg-sidebar">
        {children}
      </div>
    </div>
  )
}

export default MarketingLayout


