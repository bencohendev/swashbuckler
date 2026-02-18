import { create } from 'zustand'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

export type ViewMode = 'table' | 'list' | 'card'

const STORAGE_KEY = 'swashbuckler:typeViewMode'

function readInitial(): Record<string, ViewMode> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ViewMode>) : {}
  } catch {
    return {}
  }
}

interface ViewModeState {
  modes: Record<string, ViewMode>
  getMode: (slug: string) => ViewMode
  setMode: (slug: string, mode: ViewMode) => void
}

export const useViewModeStore = create<ViewModeState>((set, get) => ({
  modes: readInitial(),
  getMode: (slug: string) => get().modes[slug] ?? 'table',
  setMode: (slug: string, mode: ViewMode) =>
    set((state) => {
      const next = { ...state.modes, [slug]: mode }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return { modes: next }
    }),
}))

export function useViewMode(slug: string) {
  const isMobile = useIsMobile()
  const storedMode = useViewModeStore((s) => s.getMode(slug))
  const setMode = useViewModeStore((s) => s.setMode)
  // Default to card view on mobile if user hasn't explicitly chosen a mode
  const hasExplicitMode = useViewModeStore((s) => slug in s.modes)
  const mode = isMobile && !hasExplicitMode ? 'card' : storedMode
  return { mode, setMode: (m: ViewMode) => setMode(slug, m) }
}
