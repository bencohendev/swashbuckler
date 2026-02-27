'use client'

import { create } from 'zustand'

interface ObjectModalState {
  objectId: string | null
  autoFocus: boolean
  onClose: (() => void) | null
  open: (id: string, opts?: { autoFocus?: boolean; onClose?: () => void }) => void
  close: () => void
}

export const useObjectModal = create<ObjectModalState>((set, get) => ({
  objectId: null,
  autoFocus: false,
  onClose: null,
  open: (id, opts) => set({
    objectId: id,
    autoFocus: opts?.autoFocus ?? false,
    onClose: opts?.onClose ?? null,
  }),
  close: () => {
    const { onClose } = get()
    set({ objectId: null, autoFocus: false, onClose: null })
    onClose?.()
  },
}))
