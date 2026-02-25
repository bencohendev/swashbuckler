import { create } from 'zustand'
import type { CustomTheme, ThemeCoreColors, ThemeBase, SpaceThemeAssignment } from '../types'
import { deriveAllColors } from '../lib/deriveColors'

const THEMES_KEY = 'swashbuckler:customThemes'
const SPACE_THEMES_KEY = 'swashbuckler:spaceThemes'
const OLD_ACTIVE_KEY = 'swashbuckler:activeCustomTheme'

function readThemes(): CustomTheme[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(THEMES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function readSpaceThemes(): Record<string, SpaceThemeAssignment> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SPACE_THEMES_KEY)
    if (raw) return JSON.parse(raw)

    // Migration: convert old activeCustomTheme to spaceThemes for current space
    const oldActiveId = localStorage.getItem(OLD_ACTIVE_KEY)
    if (oldActiveId) {
      const currentSpaceId = localStorage.getItem('swashbuckler:currentSpaceId')
      if (currentSpaceId) {
        const migrated: Record<string, SpaceThemeAssignment> = {
          [currentSpaceId]: { type: 'custom', themeId: oldActiveId },
        }
        localStorage.setItem(SPACE_THEMES_KEY, JSON.stringify(migrated))
        localStorage.removeItem(OLD_ACTIVE_KEY)
        return migrated
      }
    }

    return {}
  } catch {
    return {}
  }
}

function persistThemes(themes: CustomTheme[]) {
  localStorage.setItem(THEMES_KEY, JSON.stringify(themes))
}

function persistSpaceThemes(spaceThemes: Record<string, SpaceThemeAssignment>) {
  localStorage.setItem(SPACE_THEMES_KEY, JSON.stringify(spaceThemes))
}

interface CustomThemeState {
  themes: CustomTheme[]
  spaceThemes: Record<string, SpaceThemeAssignment>

  addTheme: (name: string, base: ThemeBase, coreColors: ThemeCoreColors) => CustomTheme
  updateTheme: (id: string, name: string, base: ThemeBase, coreColors: ThemeCoreColors) => void
  deleteTheme: (id: string) => void
  setSpaceTheme: (spaceId: string, assignment: SpaceThemeAssignment) => void
  clearSpaceTheme: (spaceId: string) => void
}

export const useCustomThemeStore = create<CustomThemeState>((set, get) => ({
  themes: readThemes(),
  spaceThemes: readSpaceThemes(),

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

    // Remove any space assignments referencing the deleted theme
    const spaceThemes = { ...get().spaceThemes }
    let changed = false
    for (const spaceId of Object.keys(spaceThemes)) {
      const assignment = spaceThemes[spaceId]
      if (assignment.type === 'custom' && assignment.themeId === id) {
        delete spaceThemes[spaceId]
        changed = true
      }
    }
    if (changed) persistSpaceThemes(spaceThemes)
    set({ themes: next, spaceThemes })
  },

  setSpaceTheme: (spaceId, assignment) => {
    const spaceThemes = { ...get().spaceThemes, [spaceId]: assignment }
    persistSpaceThemes(spaceThemes)
    set({ spaceThemes })
  },

  clearSpaceTheme: (spaceId) => {
    const spaceThemes = { ...get().spaceThemes }
    delete spaceThemes[spaceId]
    persistSpaceThemes(spaceThemes)
    set({ spaceThemes })
  },
}))
