import { type ReactNode } from "react"
import { createClient } from "@/shared/lib/supabase/server"
import { Sidebar } from "@/features/sidebar/components"
import { Header } from "@/shared/components/layout"
import { GuestBanner } from "@/shared/components/GuestBanner"
import { ObjectEditorModal } from "@/features/objects/components/ObjectEditorModal"
import { NavigationProgress } from "@/shared/components/NavigationProgress"

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex h-screen">
      <NavigationProgress />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:border">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <GuestBanner isGuestServer={!user} />
        <Header email={user?.email} />
        <main id="main-content" className="relative flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <ObjectEditorModal />
    </div>
  )
}
