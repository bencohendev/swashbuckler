import { type ReactNode } from "react"
import { createClient } from "@/shared/lib/supabase/server"
import { Sidebar } from "@/features/sidebar/components"
import { Header } from "@/shared/components/layout"
import { GuestBanner } from "@/shared/components/GuestBanner"
import { ObjectEditorModal } from "@/features/objects/components/ObjectEditorModal"

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <GuestBanner />
        <Header email={user?.email} />
        <main className="relative flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <ObjectEditorModal />
    </div>
  )
}
