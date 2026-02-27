'use client'

import { create } from 'zustand'
import type { SortConfig } from '../lib/sortObjects'
import { DEFAULT_SORT } from '../lib/sortObjects'

const STORAGE_KEY = 'swashbuckler:typeSortConfig'

function readInitial(): Record<string, SortConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, SortConfig>) : {}
  } catch {
    return {}
  }
}

interface SortConfigState {
  configs: Record<string, SortConfig>
  getSort: (slug: string) => SortConfig
  setSort: (slug: string, sort: SortConfig) => void
}

export const useSortConfigStore = create<SortConfigState>((set, get) => ({
  configs: readInitial(),
  getSort: (slug: string) => get().configs[slug] ?? DEFAULT_SORT,
  setSort: (slug: string, sort: SortConfig) =>
    set((state) => {
      const next = { ...state.configs, [slug]: sort }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return { configs: next }
    }),
}))

export function useSortConfig(slug: string) {
  const sort = useSortConfigStore((s) => s.getSort(slug))
  const setSort = useSortConfigStore((s) => s.setSort)
  return { sort, setSort: (s: SortConfig) => setSort(slug, s) }
}
