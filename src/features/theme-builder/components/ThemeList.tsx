'use client'

import { useState, useEffect } from 'react'
import { CheckIcon, SunIcon, MoonIcon, MonitorIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCustomThemeStore } from '../stores/customTheme'
import { ThemeCard } from './ThemeCard'
import type { CustomTheme } from '../types'

interface ThemeListProps {
  onEdit: (theme: CustomTheme) => void
}

const DEFAULT_THEMES = [
  { value: 'light' as const, label: 'Light', Icon: SunIcon },
  { value: 'dark' as const, label: 'Dark', Icon: MoonIcon },
  { value: 'system' as const, label: 'System', Icon: MonitorIcon },
]

export function ThemeList({ onEdit }: ThemeListProps) {
  const themes = useCustomThemeStore(s => s.themes)
  const activeThemeId = useCustomThemeStore(s => s.activeThemeId)
  const activateTheme = useCustomThemeStore(s => s.activateTheme)
  const deleteTheme = useCustomThemeStore(s => s.deleteTheme)
  const clearActiveTheme = useCustomThemeStore(s => s.clearActiveTheme)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true) // eslint-disable-line react-hooks/set-state-in-effect -- hydration detection
  }, [])

  function handleDefaultTheme(value: 'light' | 'dark' | 'system') {
    clearActiveTheme()
    setTheme(value)
  }

  return (
    <div className="space-y-6">
      {/* Default themes */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Default Themes</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {DEFAULT_THEMES.map(({ value, label, Icon }) => {
            const isActive = mounted && !activeThemeId && theme === value
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

      {/* Custom themes */}
      {themes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Custom Themes</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map(t => (
              <ThemeCard
                key={t.id}
                theme={t}
                isActive={activeThemeId === t.id}
                onActivate={activateTheme}
                onEdit={onEdit}
                onDelete={deleteTheme}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
