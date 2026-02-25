import { create } from 'zustand'

const STORAGE_KEY = 'swashbuckler:boardGroupField'

function readInitial(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

interface BoardGroupingState {
  fields: Record<string, string>
  getField: (slug: string) => string | null
  setField: (slug: string, fieldId: string | null) => void
}

export const useBoardGroupingStore = create<BoardGroupingState>((set, get) => ({
  fields: readInitial(),
  getField: (slug: string) => get().fields[slug] ?? null,
  setField: (slug: string, fieldId: string | null) =>
    set((state) => {
      const next = { ...state.fields }
      if (fieldId === null) {
        delete next[slug]
      } else {
        next[slug] = fieldId
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return { fields: next }
    }),
}))

export function useBoardGrouping(slug: string) {
  const groupFieldId = useBoardGroupingStore((s) => s.getField(slug))
  const setGroupField = useBoardGroupingStore((s) => s.setField)
  return {
    groupFieldId,
    setGroupField: (fieldId: string | null) => setGroupField(slug, fieldId),
  }
}
