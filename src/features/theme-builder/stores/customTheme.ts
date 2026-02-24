import { create } from 'zustand'
import type { CustomTheme, ThemeCoreColors, ThemeBase } from '../types'
import { deriveAllColors } from '../lib/deriveColors'

const THEMES_KEY = 'swashbuckler:customThemes'
const ACTIVE_KEY = 'swashbuckler:activeCustomTheme'

function readThemes(): CustomTheme[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(THEMES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function readActiveId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_KEY)
}

function persistThemes(themes: CustomTheme[]) {
  localStorage.setItem(THEMES_KEY, JSON.stringify(themes))
}

function persistActiveId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id)
  } else {
    localStorage.removeItem(ACTIVE_KEY)
  }
}

interface CustomThemeState {
  themes: CustomTheme[]
  activeThemeId: string | null

  addTheme: (name: string, base: ThemeBase, coreColors: ThemeCoreColors) => CustomTheme
  updateTheme: (id: string, name: string, base: ThemeBase, coreColors: ThemeCoreColors) => void
  deleteTheme: (id: string) => void
  activateTheme: (id: string) => void
  clearActiveTheme: () => void
}

export const useCustomThemeStore = create<CustomThemeState>((set, get) => ({
  themes: readThemes(),
  activeThemeId: readActiveId(),

  addTheme: (name, base, coreColors) => {
    const now = new Date().toISOString()
    const theme: CustomTheme = {
      id: crypto.randomUUID(),
      name,
      base,
      coreColors,
      resolvedColors: deriveAllColors(coreColors, base),
      createdAt: now,
      updatedAt: now,
    }
    const next = [...get().themes, theme]
    persistThemes(next)
    set({ themes: next })
    return theme
  },

  updateTheme: (id, name, base, coreColors) => {
    const next = get().themes.map(t =>
      t.id === id
        ? {
            ...t,
            name,
            base,
            coreColors,
            resolvedColors: deriveAllColors(coreColors, base),
            updatedAt: new Date().toISOString(),
          }
        : t,
    )
    persistThemes(next)
    set({ themes: next })
  },

  deleteTheme: (id) => {
    const next = get().themes.filter(t => t.id !== id)
    persistThemes(next)
    const activeId = get().activeThemeId === id ? null : get().activeThemeId
    persistActiveId(activeId)
    set({ themes: next, activeThemeId: activeId })
  },

  activateTheme: (id) => {
    persistActiveId(id)
    set({ activeThemeId: id })
  },

  clearActiveTheme: () => {
    persistActiveId(null)
    set({ activeThemeId: null })
  },
}))
