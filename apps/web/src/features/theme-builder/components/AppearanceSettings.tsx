'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import { ThemeList } from './ThemeList'

export function AppearanceSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Settings
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Appearance</h1>
          <p className="text-muted-foreground">
            Choose a theme for this space.
          </p>
        </div>
      </div>

      <ThemeList selectionOnly />
    </div>
  )
}
