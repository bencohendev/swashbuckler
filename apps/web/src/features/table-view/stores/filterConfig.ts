'use client'

import { create } from 'zustand'
import { EMPTY_EXPRESSION, type FilterExpression } from '../lib/filterTypes'

const STORAGE_KEY = 'swashbuckler:filterExpression:v2'

function readInitial(): Record<string, FilterExpression> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, FilterExpression>
  } catch {
    return {}
  }
}

interface FilterConfigState {
  configs: Record<string, FilterExpression>
  getExpression: (slug: string) => FilterExpression
  setExpression: (slug: string, expr: FilterExpression) => void
}

export const useFilterConfigStore = create<FilterConfigState>((set, get) => ({
  configs: readInitial(),
  getExpression: (slug: string) => get().configs[slug] ?? EMPTY_EXPRESSION,
  setExpression: (slug: string, expr: FilterExpression) =>
    set((state) => {
      const next = { ...state.configs, [slug]: expr }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return { configs: next }
    }),
}))

export function usePersistedFilters(slug: string) {
  const expression = useFilterConfigStore((s) => s.getExpression(slug))
  const setExpression = useFilterConfigStore((s) => s.setExpression)
  return { expression, setExpression: (e: FilterExpression) => setExpression(slug, e) }
}
