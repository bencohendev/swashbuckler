"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/client"
import { Button } from "@/shared/components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/Avatar"
import { LogInIcon, LogOutIcon, MenuIcon, MonitorIcon, MoonIcon, PaletteIcon, SearchIcon, SettingsIcon, SunIcon, SwordsIcon, UserIcon, UserPlusIcon } from "lucide-react"
import { useAuth, useCurrentSpace } from "@/shared/lib/data"
import { useSpacePermission } from "@/features/sharing"
import { useSidebar } from "@/shared/stores/sidebar"
import { useTheme } from "next-themes"
import { GlobalSearchDialog } from "@/features/search"
import { QuickCaptureDialog, QuickCaptureButton } from "@/features/quick-capture"
import { useCustomThemeStore } from "@/features/theme-builder"
import type { SpaceThemeAssignment } from "@/features/theme-builder"

export function Header({ email }: { email?: string }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { setMobileOpen } = useSidebar()
  const { canEdit } = useSpacePermission()
  const isGuest = isLoading ? !email : !user
  const resolvedEmail = user?.email ?? email
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const { space } = useCurrentSpace()
  const spaceThemes = useCustomThemeStore(s => s.spaceThemes)
  const setSpaceTheme = useCustomThemeStore(s => s.setSpaceTheme)
  const lastCustomThemeIds = useCustomThemeStore(s => s.lastCustomThemeIds)
  const themes = useCustomThemeStore(s => s.themes)
  const [mounted, setMounted] = useState(false)

  const assignment = space ? spaceThemes[space.id] : undefined
  const lastRaw = space ? lastCustomThemeIds[space.id] : undefined
  // Parse the stored last non-default assignment (JSON or legacy plain ID)
  const lastNonDefault: SpaceThemeAssignment | undefined = (() => {
    if (!lastRaw) return undefined
    try {
      const parsed = JSON.parse(lastRaw)
      if (parsed && typeof parsed === 'object' && 'type' in parsed) return parsed
    } catch { /* legacy plain ID */ }
    // Legacy: plain theme ID string
    return { type: 'custom' as const, themeId: lastRaw }
  })()
  // Only offer the non-default theme in the cycle if it still exists
  const hasLastNonDefault = lastNonDefault != null && (
    lastNonDefault.type === 'preset' ||
    (lastNonDefault.type === 'custom' && themes.some(t => t.id === lastNonDefault.themeId))
  )

  useEffect(() => {
    setMounted(true) // eslint-disable-line react-hooks/set-state-in-effect -- hydration detection
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && canEdit) {
        e.preventDefault()
        setQuickCaptureOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canEdit])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = resolvedEmail
    ? resolvedEmail.slice(0, 2).toUpperCase()
    : "G"

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground md:hidden"
        onClick={() => setMobileOpen(true)}
        title="Open sidebar"
        aria-label="Open sidebar"
      >
        <MenuIcon className="size-5" />
      </Button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <Button
          data-tour="search"
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setSearchOpen(true)}
          title="Search"
          aria-label="Search"
        >
          <SearchIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => {
            if (!space) return
            // If custom or preset theme, switch to light default
            if (assignment?.type === 'custom' || assignment?.type === 'preset') {
              setSpaceTheme(space.id, { type: 'default', value: 'light' })
              return
            }
            // Cycle: light → dark → system → [last non-default] → light
            const current = assignment?.type === 'default' ? assignment.value : 'system'
            const next: SpaceThemeAssignment =
              current === 'light' ? { type: 'default', value: 'dark' } :
              current === 'dark' ? { type: 'default', value: 'system' } :
              current === 'system' && hasLastNonDefault ? lastNonDefault! :
              { type: 'default', value: 'light' }
            setSpaceTheme(space.id, next)
          }}
          title={mounted ? `Theme: ${assignment?.type === 'default' ? assignment.value : assignment?.type === 'custom' ? 'custom' : assignment?.type === 'preset' ? 'fantasy' : 'system'}` : "Theme"}
          aria-label={mounted ? `Theme: ${assignment?.type === 'default' ? assignment.value : assignment?.type === 'custom' ? 'custom' : assignment?.type === 'preset' ? 'fantasy' : 'system'}` : "Toggle theme"}
        >
          {mounted ? (
            assignment?.type === 'preset'
              ? <SwordsIcon className="size-4" />
              : assignment?.type === 'custom'
                ? <PaletteIcon className="size-4" />
                : assignment?.type === 'default' && assignment.value === 'system'
                  ? <MonitorIcon className="size-4" />
                  : resolvedTheme === 'dark'
                    ? <MoonIcon className="size-4" />
                    : <SunIcon className="size-4" />
          ) : (
            <SunIcon className="size-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
              <Avatar size="sm">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={resolvedEmail || "User"} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isGuest ? (
              <>
                <DropdownMenuItem disabled>
                  <UserIcon className="size-4" />
                  Guest
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/signup">
                    <UserPlusIcon className="size-4" />
                    Sign up
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <LogInIcon className="size-4" />
                    Sign in
                  </Link>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem disabled>
                  <UserIcon className="size-4" />
                  {resolvedEmail}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings/account">
                    <SettingsIcon className="size-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOutIcon className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickCaptureDialog open={quickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
      <QuickCaptureButton onClick={() => setQuickCaptureOpen(true)} className={canEdit ? '' : 'invisible'} />
    </header>
  )
}
