import { create } from 'zustand'

const STORAGE_KEY = 'swashbuckler:sidebarCollapsed'

function readInitial(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

interface SidebarState {
  collapsed: boolean
  toggle: () => void
}

export const useSidebar = create<SidebarState>((set) => ({
  collapsed: readInitial(),
  toggle: () =>
    set((state) => {
      const next = !state.collapsed
      localStorage.setItem(STORAGE_KEY, String(next))
      return { collapsed: next }
    }),
}))
