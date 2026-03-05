'use client'

import { create } from 'zustand'
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

interface TutorialState {
  activeTourId: TourId | null
  currentStep: number
  completedTours: Set<TourId>
  allSkipped: boolean

  // Kept for backward compatibility
  completed: boolean
  active: boolean

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
}

export const useTutorial = create<TutorialState>((set, get) => {
  const initialCompleted = readCompletedTours()
  const initialAllSkipped = typeof window !== 'undefined' && localStorage.getItem(SKIP_ALL_KEY) === 'true'

  return {
    activeTourId: null,
    currentStep: 0,
    completedTours: initialCompleted,
    allSkipped: initialAllSkipped,

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
          // Complete the tour
          const tourId = state.activeTourId
          localStorage.setItem(storageKey(tourId), 'true')
          const newCompleted = new Set(state.completedTours)
          newCompleted.add(tourId)
          return {
            activeTourId: null,
            currentStep: 0,
            completedTours: newCompleted,
            active: false,
            completed: newCompleted.has('intro'),
          }
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
        const tourId = state.activeTourId
        localStorage.setItem(storageKey(tourId), 'true')
        const newCompleted = new Set(state.completedTours)
        newCompleted.add(tourId)
        return {
          activeTourId: null,
          currentStep: 0,
          completedTours: newCompleted,
          active: false,
          completed: newCompleted.has('intro'),
        }
      }),

    skipAll: () => {
      localStorage.setItem(SKIP_ALL_KEY, 'true')
      const allCompleted = new Set<TourId>()
      for (const id of Object.keys(TOURS)) {
        const tourId = id as TourId
        localStorage.setItem(storageKey(tourId), 'true')
        allCompleted.add(tourId)
      }
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
        const tourId = state.activeTourId
        localStorage.setItem(storageKey(tourId), 'true')
        const newCompleted = new Set(state.completedTours)
        newCompleted.add(tourId)
        return {
          activeTourId: null,
          currentStep: 0,
          completedTours: newCompleted,
          active: false,
          completed: newCompleted.has('intro'),
        }
      }),

    restartTour: (id) => {
      const state = get()
      // Stop any active tour first
      if (state.activeTourId !== null) {
        // Don't mark the interrupted tour as completed
      }
      localStorage.removeItem(storageKey(id))
      const newCompleted = new Set(state.completedTours)
      newCompleted.delete(id)
      // If restarting any tour, clear the skip-all flag
      localStorage.removeItem(SKIP_ALL_KEY)
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
  }
})
