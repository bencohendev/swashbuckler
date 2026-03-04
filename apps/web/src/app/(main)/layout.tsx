import { type ReactNode } from "react"
import { getUser } from "@/shared/lib/supabase/server"
import { Sidebar } from "@/features/sidebar/components"
import { SectionErrorBoundary } from "@/shared/components/SectionErrorBoundary"
import { Header } from "@/shared/components/layout"
import { GuestBanner } from "@/shared/components/GuestBanner"
import { LazyObjectEditorModal } from "@/features/objects/components/LazyObjectEditorModal"
import { NavigationProgress } from "@/shared/components/NavigationProgress"

export default async function MainLayout({ children }: { children: ReactNode }) {
  const user = await getUser()

  return (
    <div className="flex h-dvh">
      <NavigationProgress />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:border">
        Skip to main content
      </a>
      <SectionErrorBoundary fallbackLabel="Sidebar">
        <Sidebar />
      </SectionErrorBoundary>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <GuestBanner />
        <Header email={user?.email} />
        <main id="main-content" className="relative flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <LazyObjectEditorModal />
    </div>
  )
}
