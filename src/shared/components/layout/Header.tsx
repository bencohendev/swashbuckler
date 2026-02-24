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
import { LogInIcon, LogOutIcon, MenuIcon, MonitorIcon, MoonIcon, SearchIcon, SettingsIcon, SunIcon, UserIcon, UserPlusIcon } from "lucide-react"
import { useAuth } from "@/shared/lib/data"
import { useSpacePermission } from "@/features/sharing"
import { useSidebar } from "@/shared/stores/sidebar"
import { useTheme } from "next-themes"
import { GlobalSearchDialog } from "@/features/search"
import { QuickCaptureDialog, QuickCaptureButton } from "@/features/quick-capture"
import { useCustomThemeStore } from "@/features/theme-builder"

export function Header({ email }: { email?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const { setMobileOpen } = useSidebar()
  const { canEdit } = useSpacePermission()
  const isGuest = !email
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const clearActiveTheme = useCustomThemeStore(s => s.clearActiveTheme)
  const [mounted, setMounted] = useState(false)

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

  const initials = email
    ? email.slice(0, 2).toUpperCase()
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
            clearActiveTheme()
            if (theme === 'light') setTheme('dark')
            else if (theme === 'dark') setTheme('system')
            else setTheme('light')
          }}
          title={mounted ? `Theme: ${theme}` : "Theme"}
          aria-label={mounted ? `Theme: ${theme}` : "Toggle theme"}
        >
          {mounted ? (
            theme === 'system' ? <MonitorIcon className="size-4" /> :
            resolvedTheme === 'dark' ? <MoonIcon className="size-4" /> :
            <SunIcon className="size-4" />
          ) : (
            <SunIcon className="size-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
              <Avatar size="sm">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={email || "User"} />}
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
                  {email}
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
      {canEdit && (
        <>
          <QuickCaptureDialog open={quickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
          <QuickCaptureButton onClick={() => setQuickCaptureOpen(true)} />
        </>
      )}
    </header>
  )
}
