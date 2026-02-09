import { create } from 'zustand'

interface ObjectModalState {
  objectId: string | null
  open: (id: string) => void
  close: () => void
}

export const useObjectModal = create<ObjectModalState>((set) => ({
  objectId: null,
  open: (id) => set({ objectId: id }),
  close: () => set({ objectId: null }),
}))
