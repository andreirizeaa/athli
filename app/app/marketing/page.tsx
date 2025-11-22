"use client"

import { useState } from "react"
import { PageTabs } from "@/components/page-tabs"

const MarketingPage = () => {
  const [activeTab, setActiveTab] = useState("landing-page")

  const tabs = [
    {
      value: "landing-page",
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

  const renderContent = () => {
    switch (activeTab) {
      case "landing-page":
        return (
        <div className="flex h-full w-full items-start justify-start">
            <p>Landing Page</p>
        </div>
        )
      case "analytics":
  return (
          <div className="flex h-full w-full items-start justify-start">
            <p>Analytics</p>
            </div>
        )
      case "leads":
        return (
          <div className="flex h-full w-full items-start justify-start">
            <p>Leads</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full px-4">
        <h1 className="text-[22px] font-semibold mb-2 mt-2">Marketing</h1>
        <PageTabs
          tabs={tabs}
          value={activeTab}
          onValueChange={setActiveTab}
          defaultValue="landing-page"
          className="mt-1"
        />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 bg-sidebar">{renderContent()}</div>
    </div>
  )
}

export default MarketingPage


