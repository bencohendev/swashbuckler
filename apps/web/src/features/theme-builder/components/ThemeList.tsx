'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckIcon, SunIcon, MoonIcon, MonitorIcon, ArrowRightIcon, SwordsIcon } from 'lucide-react'
import { useCurrentSpace } from '@/shared/lib/data'
import { useCustomThemeStore } from '../stores/customTheme'
import { THEME_PRESETS } from '../lib/presets'
import { ThemeCard } from './ThemeCard'
import type { CustomTheme } from '../types'

const PRESET_ICONS: Record<string, typeof SwordsIcon> = {
  Swords: SwordsIcon,
}

interface ThemeListProps {
  onEdit?: (theme: CustomTheme) => void
  selectionOnly?: boolean
}

const DEFAULT_THEMES = [
  { value: 'light' as const, label: 'Light', Icon: SunIcon },
  { value: 'dark' as const, label: 'Dark', Icon: MoonIcon },
  { value: 'system' as const, label: 'System', Icon: MonitorIcon },
]

export function ThemeList({ onEdit, selectionOnly }: ThemeListProps) {
  const themes = useCustomThemeStore(s => s.themes)
  const spaceThemes = useCustomThemeStore(s => s.spaceThemes)
  const setSpaceTheme = useCustomThemeStore(s => s.setSpaceTheme)
  const togglePreset = useCustomThemeStore(s => s.togglePreset)
  const deleteTheme = useCustomThemeStore(s => s.deleteTheme)
  const { space } = useCurrentSpace()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true) // eslint-disable-line react-hooks/set-state-in-effect -- hydration detection
  }, [])

  const assignment = space ? spaceThemes[space.id] : undefined

  function handleDefaultTheme(value: 'light' | 'dark' | 'system') {
    if (!space) return
    setSpaceTheme(space.id, { type: 'default', value })
  }

  function handleActivateCustom(id: string) {
    if (!space) return
    setSpaceTheme(space.id, { type: 'custom', themeId: id })
  }

  function handlePresetTheme(presetId: string) {
    if (!space) return
    togglePreset(space.id, presetId)
  }

  return (
    <div className="space-y-6">
      {/* Space context */}
      {space && (
        <p className="text-sm text-muted-foreground">
          Theme for <span className="font-medium text-foreground">{space.name}</span>
        </p>
      )}

      {/* Default themes */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Default Themes</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {DEFAULT_THEMES.map(({ value, label, Icon }) => {
            const isActive = mounted && assignment?.type === 'default' && assignment.value === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleDefaultTheme(value)}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'hover:bg-muted/30'
                }`}
                aria-pressed={isActive}
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
                {isActive && <CheckIcon className="ml-auto size-4 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preset themes */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Preset Themes</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Preset themes add decorative styling on top of your light or dark theme.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEME_PRESETS.map(preset => {
            const Icon = PRESET_ICONS[preset.icon] ?? SwordsIcon
            const isActive = mounted && assignment?.type === 'default' && assignment.presetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetTheme(preset.id)}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'hover:bg-muted/30'
                }`}
                aria-pressed={isActive}
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">{preset.label}</span>
                {isActive && <CheckIcon className="ml-auto size-4 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom themes — guard with mounted to avoid hydration mismatch (store reads localStorage) */}
      {mounted && themes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Custom Themes</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map(t => (
              <ThemeCard
                key={t.id}
                theme={t}
                isActive={assignment?.type === 'custom' && assignment.themeId === t.id}
                showPreview={selectionOnly}
                onActivate={handleActivateCustom}
                {...(!selectionOnly && {
                  onEdit,
                  onDelete: deleteTheme,
                })}
              />
            ))}
          </div>
          {selectionOnly && (
            <Link
              href="/settings/themes"
              className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Manage custom themes
              <ArrowRightIcon className="size-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
