'use client'

import { create } from 'zustand'
import type { GraphLayoutMode } from './types'

interface GraphStore {
  enabledTypeIds: Set<string>
  toggleType: (typeId: string) => void
  showAllTypes: () => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void

  highlightedNodeIds: Set<string>
  setHighlightedNodeIds: (ids: Set<string>) => void

  layoutMode: GraphLayoutMode
  setLayoutMode: (mode: GraphLayoutMode) => void

  reset: () => void
}

export const useGraphStore = create<GraphStore>((set) => ({
  enabledTypeIds: new Set(),
  toggleType: (typeId) =>
    set((state) => {
      const next = new Set(state.enabledTypeIds)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return { enabledTypeIds: next }
    }),
  showAllTypes: () => set({ enabledTypeIds: new Set() }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  highlightedNodeIds: new Set(),
  setHighlightedNodeIds: (ids) => set({ highlightedNodeIds: ids }),

  layoutMode: 'force',
  setLayoutMode: (mode) => set({ layoutMode: mode }),

  reset: () =>
    set({
      enabledTypeIds: new Set(),
      searchQuery: '',
      selectedNodeId: null,
      highlightedNodeIds: new Set(),
      layoutMode: 'force',
    }),
}))
