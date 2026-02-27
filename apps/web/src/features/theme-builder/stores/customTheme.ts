'use client'

import { create } from 'zustand'
import type { CustomTheme, ThemeCoreColors, ThemeBase, SpaceThemeAssignment } from '../types'
import { deriveAllColors } from '../lib/deriveColors'

const THEMES_KEY = 'swashbuckler:customThemes'
const SPACE_THEMES_KEY = 'swashbuckler:spaceThemes'
const LAST_CUSTOM_KEY = 'swashbuckler:lastCustomThemeIds'
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

function readLastCustomThemeIds(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LAST_CUSTOM_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistLastCustomThemeIds(ids: Record<string, string>) {
  localStorage.setItem(LAST_CUSTOM_KEY, JSON.stringify(ids))
}

interface CustomThemeState {
  themes: CustomTheme[]
  spaceThemes: Record<string, SpaceThemeAssignment>
  lastCustomThemeIds: Record<string, string>

  addTheme: (name: string, base: ThemeBase, coreColors: ThemeCoreColors) => CustomTheme
  updateTheme: (id: string, name: string, base: ThemeBase, coreColors: ThemeCoreColors) => void
  deleteTheme: (id: string) => void
  setSpaceTheme: (spaceId: string, assignment: SpaceThemeAssignment) => void
  togglePreset: (spaceId: string, presetId: string) => void
  clearSpaceTheme: (spaceId: string) => void
}

export const useCustomThemeStore = create<CustomThemeState>((set, get) => ({
  themes: readThemes(),
  spaceThemes: readSpaceThemes(),
  lastCustomThemeIds: readLastCustomThemeIds(),

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

    // Clear any last-custom references to the deleted theme
    const lastCustomThemeIds = { ...get().lastCustomThemeIds }
    let lastChanged = false
    for (const spaceId of Object.keys(lastCustomThemeIds)) {
      if (lastCustomThemeIds[spaceId] === id) {
        delete lastCustomThemeIds[spaceId]
        lastChanged = true
      }
    }
    if (lastChanged) persistLastCustomThemeIds(lastCustomThemeIds)

    set({ themes: next, spaceThemes, lastCustomThemeIds })
  },

  setSpaceTheme: (spaceId, assignment) => {
    const current = get().spaceThemes[spaceId]
    const lastCustomThemeIds = { ...get().lastCustomThemeIds }

    // Remember the custom theme ID when switching away from it
    if (current?.type === 'custom' && assignment.type === 'default') {
      lastCustomThemeIds[spaceId] = current.themeId
      persistLastCustomThemeIds(lastCustomThemeIds)
    } else if (assignment.type === 'custom') {
      // Clear last-custom when actively choosing a custom theme
      delete lastCustomThemeIds[spaceId]
      persistLastCustomThemeIds(lastCustomThemeIds)
    }

    // When cycling default themes, preserve existing presetId
    if (assignment.type === 'default' && current?.type === 'default' && current.presetId && !('presetId' in assignment)) {
      assignment = { ...assignment, presetId: current.presetId }
    }

    const spaceThemes = { ...get().spaceThemes, [spaceId]: assignment }
    persistSpaceThemes(spaceThemes)
    set({ spaceThemes, lastCustomThemeIds })
  },

  togglePreset: (spaceId, presetId) => {
    const current = get().spaceThemes[spaceId]

    let next: SpaceThemeAssignment
    if (current?.type === 'default') {
      // Toggle preset on/off
      next = current.presetId === presetId
        ? { type: 'default', value: current.value }
        : { type: 'default', value: current.value, presetId }
    } else if (!current) {
      // No assignment — create default with preset
      next = { type: 'default', value: 'system', presetId }
    } else {
      // Custom theme active — switch to default with preset
      const lastCustomThemeIds = { ...get().lastCustomThemeIds }
      lastCustomThemeIds[spaceId] = current.themeId
      persistLastCustomThemeIds(lastCustomThemeIds)
      next = { type: 'default', value: 'system', presetId }
      const spaceThemes = { ...get().spaceThemes, [spaceId]: next }
      persistSpaceThemes(spaceThemes)
      set({ spaceThemes, lastCustomThemeIds })
      return
    }

    const spaceThemes = { ...get().spaceThemes, [spaceId]: next }
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
