'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import type { CustomTheme } from '../types'
import { ThemeList } from './ThemeList'
import { ThemeBuilder } from './ThemeBuilder'

type BuilderState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; theme: CustomTheme }

export function AppearanceSettings() {
  const [builder, setBuilder] = useState<BuilderState>({ mode: 'closed' })

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Appearance</h1>
            <p className="text-muted-foreground">
              Customize your theme and color scheme.
            </p>
          </div>
          {builder.mode === 'closed' && (
            <Button onClick={() => setBuilder({ mode: 'create' })}>
              <PlusIcon />
              New Theme
            </Button>
          )}
        </div>
      </div>

      {/* Builder or list */}
      {builder.mode !== 'closed' ? (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {builder.mode === 'edit' ? `Edit: ${builder.theme.name}` : 'Create Theme'}
          </h2>
          <ThemeBuilder
            editingTheme={builder.mode === 'edit' ? builder.theme : null}
            onClose={() => setBuilder({ mode: 'closed' })}
          />
        </div>
      ) : (
        <ThemeList onEdit={theme => setBuilder({ mode: 'edit', theme })} />
      )}
    </div>
  )
}
