import { useEffect } from 'react'
import { create } from 'zustand'

const STORAGE_KEY = 'swashbuckler:sidebarCollapsed'

interface SidebarState {
  collapsed: boolean
  hydrated: boolean
  toggle: () => void
  _hydrate: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

export const useSidebar = create<SidebarState>((set) => ({
  collapsed: false,
  hydrated: false,
  toggle: () =>
    set((state) => {
      const next = !state.collapsed
      localStorage.setItem(STORAGE_KEY, String(next))
      return { collapsed: next }
    }),
  _hydrate: () =>
    set({
      collapsed: localStorage.getItem(STORAGE_KEY) === 'true',
      hydrated: true,
    }),
  mobileOpen: false,
  setMobileOpen: (open: boolean) => set({ mobileOpen: open }),
}))

/** Call once at app root to sync sidebar state from localStorage after hydration. */
export function useSidebarHydration() {
  const hydrated = useSidebar((s) => s.hydrated)
  const hydrate = useSidebar((s) => s._hydrate)
  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])
}
