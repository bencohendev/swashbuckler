import { create } from 'zustand'

interface NavigationStore {
  isNavigating: boolean
  setNavigating: (v: boolean) => void
}

export const useNavigation = create<NavigationStore>((set) => ({
  isNavigating: false,
  setNavigating: (v) => set({ isNavigating: v }),
}))
