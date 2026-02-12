'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useSpaces } from '@/shared/lib/data'
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
  const [mounted, setMounted] = useState(false)

  const metadata = user.user_metadata ?? {}
  const [defaultSpaceId, setDefaultSpaceId] = useState<string>(metadata.default_space_id ?? '')

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleDefaultSpaceChange(spaceId: string) {
    setDefaultSpaceId(spaceId)
    const supabase = createClient()
    await supabase.auth.updateUser({
      data: { default_space_id: spaceId || null },
    })
  }

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
            <label htmlFor="default-space" className="mb-1 block text-sm font-medium">
              Default space
            </label>
            <select
              id="default-space"
              value={defaultSpaceId}
              onChange={e => handleDefaultSpaceChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None (use last selected)</option>
              {spaces.map(space => (
                <option key={space.id} value={space.id}>
                  {space.icon} {space.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose which space to open by default.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
