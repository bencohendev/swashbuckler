'use client'

import { create } from 'zustand'

interface ObjectModalState {
  objectId: string | null
  autoFocus: boolean
  open: (id: string, opts?: { autoFocus?: boolean }) => void
  close: () => void
}

export const useObjectModal = create<ObjectModalState>((set) => ({
  objectId: null,
  autoFocus: false,
  open: (id, opts) => set({ objectId: id, autoFocus: opts?.autoFocus ?? false }),
  close: () => set({ objectId: null, autoFocus: false }),
}))
