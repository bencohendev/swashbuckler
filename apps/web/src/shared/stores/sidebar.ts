'use client'

import { create } from 'zustand'

const STORAGE_KEY = 'swashbuckler:sidebarCollapsed'

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

interface SidebarState {
  collapsed: boolean
  toggle: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  pendingPath: string | null
  setPendingPath: (path: string | null) => void
}

export const useSidebar = create<SidebarState>((set) => ({
  collapsed: readCollapsed(),
  toggle: () =>
    set((state) => {
      const next = !state.collapsed
      localStorage.setItem(STORAGE_KEY, String(next))
      return { collapsed: next }
    }),
  mobileOpen: false,
  setMobileOpen: (open: boolean) => set({ mobileOpen: open }),
  pendingPath: null,
  setPendingPath: (path: string | null) => set({ pendingPath: path }),
}))
