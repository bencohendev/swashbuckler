import { create } from 'zustand'

const STORAGE_PREFIX = 'swashbuckler:recentAccess:'
const MAX_ENTRIES = 50

interface RecentEntry {
  id: string
  accessedAt: number
}

interface RecentAccessState {
  spaceId: string | null
  entries: RecentEntry[]
  init: (spaceId: string) => void
  trackAccess: (objectId: string) => void
  removeEntry: (objectId: string) => void
  getRecentIds: (limit: number) => string[]
}

function loadEntries(spaceId: string): RecentEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + spaceId)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is RecentEntry =>
        typeof e === 'object' && e !== null && typeof e.id === 'string' && typeof e.accessedAt === 'number',
    )
  } catch {
    return []
  }
}

function persistEntries(spaceId: string, entries: RecentEntry[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + spaceId, JSON.stringify(entries))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export const useRecentAccess = create<RecentAccessState>((set, get) => ({
  spaceId: null,
  entries: [],

  init: (spaceId: string) => {
    if (get().spaceId === spaceId) return
    set({ spaceId, entries: loadEntries(spaceId) })
  },

  trackAccess: (objectId: string) => {
    const { spaceId, entries } = get()
    if (!spaceId) return
    const now = Date.now()
    const filtered = entries.filter((e) => e.id !== objectId)
    const next = [{ id: objectId, accessedAt: now }, ...filtered].slice(0, MAX_ENTRIES)
    set({ entries: next })
    persistEntries(spaceId, next)
  },

  removeEntry: (objectId: string) => {
    const { spaceId, entries } = get()
    if (!spaceId) return
    const next = entries.filter((e) => e.id !== objectId)
    if (next.length === entries.length) return // nothing changed
    set({ entries: next })
    persistEntries(spaceId, next)
  },

  getRecentIds: (limit: number) => {
    return get().entries.slice(0, limit).map((e) => e.id)
  },
}))
