import { create } from 'zustand'
import { EMPTY_FILTERS, type TypePageFilters } from '../lib/filterObjects'

const STORAGE_KEY = 'swashbuckler:typeFilterConfig'

export interface SerializedFilters {
  search: string
  selectFilters: Record<string, string[]>
  checkboxFilters: Record<string, boolean | undefined>
  tagFilter: string[]
  dateFilters: Record<string, { from?: string; to?: string }>
  numberFilters: Record<string, { min?: number; max?: number }>
  textFilters: Record<string, string>
}

export function serializeFilters(filters: TypePageFilters): SerializedFilters {
  const selectFilters: Record<string, string[]> = {}
  for (const [key, set] of Object.entries(filters.selectFilters)) {
    selectFilters[key] = [...set]
  }
  return {
    search: filters.search,
    selectFilters,
    checkboxFilters: filters.checkboxFilters,
    tagFilter: [...filters.tagFilter],
    dateFilters: filters.dateFilters,
    numberFilters: filters.numberFilters,
    textFilters: filters.textFilters,
  }
}

export function deserializeFilters(raw: SerializedFilters): TypePageFilters {
  const selectFilters: Record<string, Set<string>> = {}
  for (const [key, arr] of Object.entries(raw.selectFilters ?? {})) {
    selectFilters[key] = new Set(arr)
  }
  return {
    search: raw.search ?? '',
    selectFilters,
    checkboxFilters: raw.checkboxFilters ?? {},
    tagFilter: new Set(raw.tagFilter ?? []),
    dateFilters: raw.dateFilters ?? {},
    numberFilters: raw.numberFilters ?? {},
    textFilters: raw.textFilters ?? {},
  }
}

function readInitial(): Record<string, TypePageFilters> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SerializedFilters>
    const result: Record<string, TypePageFilters> = {}
    for (const [slug, serialized] of Object.entries(parsed)) {
      result[slug] = deserializeFilters(serialized)
    }
    return result
  } catch {
    return {}
  }
}

interface FilterConfigState {
  configs: Record<string, TypePageFilters>
  getFilters: (slug: string) => TypePageFilters
  setFilters: (slug: string, filters: TypePageFilters) => void
}

export const useFilterConfigStore = create<FilterConfigState>((set, get) => ({
  configs: readInitial(),
  getFilters: (slug: string) => get().configs[slug] ?? EMPTY_FILTERS,
  setFilters: (slug: string, filters: TypePageFilters) =>
    set((state) => {
      const next = { ...state.configs, [slug]: filters }
      const serialized: Record<string, SerializedFilters> = {}
      for (const [key, val] of Object.entries(next)) {
        serialized[key] = serializeFilters(val)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
      return { configs: next }
    }),
}))

export function usePersistedFilters(slug: string) {
  const filters = useFilterConfigStore((s) => s.getFilters(slug))
  const setFilters = useFilterConfigStore((s) => s.setFilters)
  return { filters, setFilters: (f: TypePageFilters) => setFilters(slug, f) }
}
