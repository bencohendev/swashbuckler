'use client'

import { create } from 'zustand'
import { TUTORIAL_STEPS } from '../lib/steps'

const STORAGE_KEY = 'swashbuckler:tutorialCompleted'

function readCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

interface TutorialState {
  completed: boolean
  active: boolean
  currentStep: number
  start: () => void
  next: () => void
  back: () => void
  skip: () => void
  complete: () => void
  restart: () => void
}

export const useTutorial = create<TutorialState>((set) => ({
  completed: readCompleted(),
  active: false,
  currentStep: 0,
  start: () => set({ active: true, currentStep: 0 }),
  next: () =>
    set((state) => {
      const nextStep = state.currentStep + 1
      if (nextStep >= TUTORIAL_STEPS.length) {
        localStorage.setItem(STORAGE_KEY, 'true')
        return { active: false, completed: true, currentStep: 0 }
      }
      return { currentStep: nextStep }
    }),
  back: () =>
    set((state) => ({
      currentStep: Math.max(0, state.currentStep - 1),
    })),
  skip: () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    set({ active: false, completed: true, currentStep: 0 })
  },
  complete: () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    set({ active: false, completed: true, currentStep: 0 })
  },
  restart: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ completed: false, active: true, currentStep: 0 })
  },
}))
