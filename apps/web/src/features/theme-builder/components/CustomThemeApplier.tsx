'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useCurrentSpace } from '@/shared/lib/data'
import { useCustomThemeStore } from '../stores/customTheme'
import type { ThemeResolvedColors } from '../types'

const CSS_VAR_KEYS: (keyof ThemeResolvedColors)[] = [
  'background', 'foreground', 'primary', 'primary-foreground',
  'secondary', 'secondary-foreground', 'accent', 'accent-foreground',
  'muted', 'muted-foreground', 'destructive', 'destructive-foreground',
  'border', 'input', 'ring',
  'card', 'card-foreground', 'popover', 'popover-foreground',
  'sidebar', 'sidebar-foreground', 'sidebar-primary',
  'sidebar-primary-foreground', 'sidebar-accent',
  'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
]

function clearOverrides() {
  const root = document.documentElement
  for (const key of CSS_VAR_KEYS) {
    root.style.removeProperty(`--${key}`)
  }
}

export function CustomThemeApplier() {
  const { space } = useCurrentSpace()
  const spaceThemes = useCustomThemeStore(s => s.spaceThemes)
  const themes = useCustomThemeStore(s => s.themes)
  const { setTheme } = useTheme()

  useEffect(() => {
    if (!space) {
      clearOverrides()
      return
    }

    const assignment = spaceThemes[space.id]

    if (!assignment) {
      clearOverrides()
      return
    }

    if (assignment.type === 'default') {
      clearOverrides()
      setTheme(assignment.value)
      return
    }

    // Custom theme assignment
    const activeTheme = themes.find(t => t.id === assignment.themeId) ?? null
    if (!activeTheme) {
      // Theme was deleted but assignment wasn't cleaned up — clear overrides
      clearOverrides()
      return
    }

    // Sync next-themes base so Tailwind dark: variants work
    setTheme(activeTheme.base)

    // Apply all resolved colors as CSS custom properties
    const root = document.documentElement
    for (const key of CSS_VAR_KEYS) {
      root.style.setProperty(`--${key}`, activeTheme.resolvedColors[key])
    }

    return () => clearOverrides()
  }, [space, spaceThemes, themes, setTheme])

  return null
}
