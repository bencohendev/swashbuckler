'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTutorial } from '../hooks/useTutorial'
import { getTourIdForPath, TOURS } from '../lib/tours'

/**
 * Auto-triggers page-specific tours on first visit.
 * Mounted alongside TutorialController in providers.tsx.
 */
export function PageTourTrigger() {
  const pathname = usePathname()
  const { activeTourId, startTour, isTourCompleted, allSkipped } = useTutorial()
  const lastTriggeredPath = useRef<string | null>(null)

  useEffect(() => {
    // Don't trigger if all tours are skipped
    if (allSkipped) return
    // Don't trigger if another tour is active
    if (activeTourId !== null) return
    // Intro tour must be completed first
    if (!isTourCompleted('intro')) return
    // Don't re-trigger on the same pathname within a session
    if (pathname === lastTriggeredPath.current) return

    const tourId = getTourIdForPath(pathname)
    if (!tourId || tourId === 'intro') return
    if (isTourCompleted(tourId)) return

    lastTriggeredPath.current = pathname

    // Skip the welcome dialog for page tours — the user already opted in via the intro tour
    const tour = TOURS[tourId]
    const startStep = tour.steps[0]?.type === 'dialog' ? 1 : 0

    const timer = setTimeout(() => {
      startTour(tourId, { startStep })
    }, 1500)
    return () => clearTimeout(timer)
  }, [pathname, activeTourId, startTour, isTourCompleted, allSkipped])

  return null
}
