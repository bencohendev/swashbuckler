import { type ReactNode } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/server"
import { Sidebar } from "@/features/sidebar/components"
import { Header } from "@/shared/components/layout"

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header email={user.email} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
