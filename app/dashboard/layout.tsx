import type { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

type DashboardLayoutProps = {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/")
  }

  return <>{children}</>
}


