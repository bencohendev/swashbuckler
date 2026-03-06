'use client'

import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useSpaces } from '@/shared/lib/data'
import { useTutorial } from '@/features/onboarding'
import { useMouseCursorPreference } from '@/features/collaboration'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { Button } from '@/shared/components/ui/Button'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'

export function PreferencesSection({ user }: { user: User }) {
  const { spaces } = useSpaces()
  const restartTutorial = useTutorial((s) => s.restart)
  const { showMouseCursors, toggleMouseCursors } = useMouseCursorPreference()

  const metadata = user.user_metadata ?? {}
  const [defaultSpaceId, setDefaultSpaceId] = useState<string>(metadata.default_space_id ?? '')

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
          <span className="mb-1 block text-sm font-medium">Show collaborator mouse cursors</span>
          <Button
            variant={showMouseCursors ? 'default' : 'outline'}
            size="sm"
            onClick={toggleMouseCursors}
            aria-pressed={showMouseCursors}
          >
            {showMouseCursors ? 'On' : 'Off'}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Display other users&apos; mouse positions when editing together.
          </p>
        </div>
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
