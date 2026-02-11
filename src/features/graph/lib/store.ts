import { create } from 'zustand'

interface GraphStore {
  disabledTypeIds: Set<string>
  toggleType: (typeId: string) => void
  enableAllTypes: () => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void

  highlightedNodeIds: Set<string>
  setHighlightedNodeIds: (ids: Set<string>) => void

  reset: () => void
}

export const useGraphStore = create<GraphStore>((set) => ({
  disabledTypeIds: new Set(),
  toggleType: (typeId) =>
    set((state) => {
      const next = new Set(state.disabledTypeIds)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return { disabledTypeIds: next }
    }),
  enableAllTypes: () => set({ disabledTypeIds: new Set() }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  highlightedNodeIds: new Set(),
  setHighlightedNodeIds: (ids) => set({ highlightedNodeIds: ids }),

  reset: () =>
    set({
      disabledTypeIds: new Set(),
      searchQuery: '',
      selectedNodeId: null,
      highlightedNodeIds: new Set(),
    }),
}))
