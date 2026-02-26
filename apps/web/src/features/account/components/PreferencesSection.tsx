'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { CheckIcon, ChevronsUpDownIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useSpaces } from '@/shared/lib/data'
import { useTutorial } from '@/features/onboarding'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { Button } from '@/shared/components/ui/Button'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
] as const

export function PreferencesSection({ user }: { user: User }) {
  const { theme, setTheme } = useTheme()
  const { spaces } = useSpaces()
  const restartTutorial = useTutorial((s) => s.restart)
  const [mounted, setMounted] = useState(false)

  const metadata = user.user_metadata ?? {}
  const [defaultSpaceId, setDefaultSpaceId] = useState<string>(metadata.default_space_id ?? '')

  useEffect(() => {
    setMounted(true) // eslint-disable-line react-hooks/set-state-in-effect -- hydration detection
  }, [])

  async function handleDefaultSpaceChange(spaceId: string) {
    setDefaultSpaceId(spaceId)
    const supabase = createClient()
    await supabase.auth.updateUser({
      data: { default_space_id: spaceId || null },
    })
  }

  const selectedSpace = spaces.find(s => s.id === defaultSpaceId)
  const selectedLabel = selectedSpace
    ? `${selectedSpace.icon} ${selectedSpace.name}`
    : 'None (use last selected)'

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Preferences</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Theme</label>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  mounted && theme === value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        {spaces.length > 1 && (
          <div>
            <span className="mb-1 block text-sm font-medium">
              Default space
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring">
                <span className="truncate">{selectedLabel}</span>
                <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem
                  onClick={() => handleDefaultSpaceChange('')}
                  className="gap-2"
                >
                  <span className="flex-1">None (use last selected)</span>
                  {!defaultSpaceId && <CheckIcon className="size-4 text-primary" />}
                </DropdownMenuItem>
                {spaces.map(space => (
                  <DropdownMenuItem
                    key={space.id}
                    onClick={() => handleDefaultSpaceChange(space.id)}
                    className="gap-2"
                  >
                    <span className="text-base">{space.icon}</span>
                    <span className="flex-1 truncate">{space.name}</span>
                    {defaultSpaceId === space.id && <CheckIcon className="size-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose which space to open by default.
            </p>
          </div>
        )}
        <div>
          <span className="mb-1 block text-sm font-medium">Tutorial</span>
          <Button variant="outline" size="sm" onClick={restartTutorial}>
            Restart tutorial
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Walk through the app features again.
          </p>
        </div>
      </div>
    </div>
  )
}
