'use client'

import { create } from 'zustand'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabasePreferencesClient } from '@/shared/lib/data/preferences'
import { TOURS, type TourId } from '../lib/tours'

const STORAGE_PREFIX = 'swashbuckler:tour:'
const LEGACY_KEY = 'swashbuckler:tutorialCompleted'
const SKIP_ALL_KEY = 'swashbuckler:toursSkippedAll'

function storageKey(tourId: TourId): string {
  return `${STORAGE_PREFIX}${tourId}`
}

function readCompletedTours(): Set<TourId> {
  if (typeof window === 'undefined') return new Set()

  const completed = new Set<TourId>()

  // Check skip-all flag
  if (localStorage.getItem(SKIP_ALL_KEY) === 'true') {
    for (const id of Object.keys(TOURS)) {
      completed.add(id as TourId)
    }
    return completed
  }

  // Migrate legacy key
  if (localStorage.getItem(LEGACY_KEY) === 'true') {
    localStorage.setItem(storageKey('intro'), 'true')
    localStorage.removeItem(LEGACY_KEY)
  }

  for (const id of Object.keys(TOURS)) {
    if (localStorage.getItem(storageKey(id as TourId)) === 'true') {
      completed.add(id as TourId)
    }
  }
  return completed
}

/** Write completed tours to localStorage (synchronous cache) */
function writeToLocalStorage(completedTours: Set<TourId>, allSkipped: boolean) {
  if (typeof window === 'undefined') return
  if (allSkipped) {
    localStorage.setItem(SKIP_ALL_KEY, 'true')
  }
  for (const id of completedTours) {
    localStorage.setItem(storageKey(id), 'true')
  }
}

/** Fire-and-forget DB persistence for authenticated users */
function persistToDb(completedTours: Set<TourId>, allSkipped: boolean) {
  const { _supabase: supabase, _userId: userId } = useTutorial.getState()
  if (!supabase || !userId) return

  const client = createSupabasePreferencesClient(supabase, userId)
  client.upsert({
    completed_tours: [...completedTours],
    tours_skipped_all: allSkipped,
  }).catch((err) => {
    console.error('Failed to persist tour state:', err)
  })
}

function markTourCompleted(state: TutorialState, tourId: TourId): Partial<TutorialState> {
  localStorage.setItem(storageKey(tourId), 'true')
  const newCompleted = new Set(state.completedTours)
  newCompleted.add(tourId)
  persistToDb(newCompleted, state.allSkipped)
  return {
    activeTourId: null,
    currentStep: 0,
    completedTours: newCompleted,
    active: false,
    completed: newCompleted.has('intro'),
  }
}

interface TutorialState {
  activeTourId: TourId | null
  currentStep: number
  completedTours: Set<TourId>
  allSkipped: boolean

  // Kept for backward compatibility
  completed: boolean
  active: boolean

  // DB sync references (set via hydrateFromDb)
  _supabase: SupabaseClient | null
  _userId: string | null

  startTour: (id: TourId) => void
  next: () => void
  back: () => void
  skip: () => void
  skipAll: () => void
  complete: () => void
  restartTour: (id: TourId) => void

  /** @deprecated Use startTour('intro') */
  start: () => void
  /** @deprecated Use restartTour('intro') */
  restart: () => void

  isTourCompleted: (id: TourId) => boolean

  /** Load tour state from DB for authenticated users. Call once on mount. */
  hydrateFromDb: (supabase: SupabaseClient, userId: string) => Promise<void>
}

export const useTutorial = create<TutorialState>((set, get) => {
  const initialCompleted = readCompletedTours()
  const initialAllSkipped = typeof window !== 'undefined' && localStorage.getItem(SKIP_ALL_KEY) === 'true'

  return {
    activeTourId: null,
    currentStep: 0,
    completedTours: initialCompleted,
    allSkipped: initialAllSkipped,
    _supabase: null,
    _userId: null,

    // Backward compat: "completed" means intro is completed
    completed: initialCompleted.has('intro'),
    active: false,

    startTour: (id) => {
      const state = get()
      // No-op if another tour is active
      if (state.activeTourId !== null) return
      set({
        activeTourId: id,
        currentStep: 0,
        active: true,
      })
    },

    next: () =>
      set((state) => {
        if (!state.activeTourId) return state
        const tour = TOURS[state.activeTourId]
        const nextStep = state.currentStep + 1
        if (nextStep >= tour.steps.length) {
          return markTourCompleted(state, state.activeTourId)
        }
        return { currentStep: nextStep }
      }),

    back: () =>
      set((state) => ({
        currentStep: Math.max(0, state.currentStep - 1),
      })),

    skip: () =>
      set((state) => {
        if (!state.activeTourId) return state
        return markTourCompleted(state, state.activeTourId)
      }),

    skipAll: () => {
      const allCompleted = new Set<TourId>()
      for (const id of Object.keys(TOURS)) {
        allCompleted.add(id as TourId)
      }
      writeToLocalStorage(allCompleted, true)
      persistToDb(allCompleted, true)
      set({
        activeTourId: null,
        currentStep: 0,
        completedTours: allCompleted,
        allSkipped: true,
        active: false,
        completed: true,
      })
    },

    complete: () =>
      set((state) => {
        if (!state.activeTourId) return state
        return markTourCompleted(state, state.activeTourId)
      }),

    restartTour: (id) => {
      const state = get()
      localStorage.removeItem(storageKey(id))
      const newCompleted = new Set(state.completedTours)
      newCompleted.delete(id)
      // If restarting any tour, clear the skip-all flag
      localStorage.removeItem(SKIP_ALL_KEY)
      persistToDb(newCompleted, false)
      set({
        activeTourId: id,
        currentStep: 0,
        completedTours: newCompleted,
        allSkipped: false,
        active: true,
        completed: newCompleted.has('intro'),
      })
    },

    // Backward compat
    start: () => get().startTour('intro'),
    restart: () => get().restartTour('intro'),

    isTourCompleted: (id) => get().completedTours.has(id),

    hydrateFromDb: async (supabase, userId) => {
      // Store references for future DB writes
      set({ _supabase: supabase, _userId: userId })

      try {
        const client = createSupabasePreferencesClient(supabase, userId)
        const result = await client.get()
        if (result.error || !result.data) return

        const { completed_tours, tours_skipped_all } = result.data
        const dbCompleted = new Set<TourId>()

        if (tours_skipped_all) {
          for (const id of Object.keys(TOURS)) {
            dbCompleted.add(id as TourId)
          }
        } else {
          for (const id of completed_tours) {
            if (id in TOURS) {
              dbCompleted.add(id as TourId)
            }
          }
        }

        // Merge: DB is source of truth, but also include any localStorage entries
        const merged = new Set<TourId>([...get().completedTours, ...dbCompleted])
        const mergedSkipAll = tours_skipped_all || get().allSkipped

        // Update localStorage cache
        writeToLocalStorage(merged, mergedSkipAll)

        set({
          completedTours: merged,
          allSkipped: mergedSkipAll,
          completed: merged.has('intro'),
        })
      } catch {
        // DB not available — localStorage remains the source of truth
      }
    },
  }
})
