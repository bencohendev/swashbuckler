'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/shared/lib/data'
import { useSidebar } from '@/shared/stores/sidebar'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { createClient } from '@/shared/lib/supabase/client'
import { useTutorial } from '../hooks/useTutorial'
import { TOURS } from '../lib/tours'
import { WelcomeDialog } from './WelcomeDialog'
import { SpotlightOverlay } from './SpotlightOverlay'
import { CoachMark } from './CoachMark'

/** Sidebar-targeted steps that require the sidebar to be visible */
const SIDEBAR_TARGETS = new Set([
  'sidebar-nav',
  'space-switcher',
  'type-sections',
  'nav-graph',
  'tags-section',
  'help-menu',
])

export function TutorialController() {
  const pathname = usePathname()
  const { user, isLoading: isAuthLoading } = useAuth()
  const { activeTourId, currentStep, next, back, skip, skipAll, startTour, completed, hydrateFromDb } = useTutorial()
  const { collapsed, toggle, setMobileOpen } = useSidebar()
  const isMobile = useIsMobile()
  const [targetEl, setTargetEl] = useState<Element | null>(null)
  const hasAutoStarted = useRef(false)
  const hasHydrated = useRef(false)
  const supabase = useMemo(() => createClient(), [])

  // Hydrate tour completion from DB for authenticated users
  useEffect(() => {
    if (hasHydrated.current || isAuthLoading || !user) return
    hasHydrated.current = true
    hydrateFromDb(supabase, user.id)
  }, [isAuthLoading, user, supabase, hydrateFromDb])

  const tour = activeTourId ? TOURS[activeTourId] : null
  const steps = tour?.steps ?? []
  const step = steps[currentStep] ?? null

  // Clear target immediately when step changes so CoachMark hides before repositioning
  const [prevStep, setPrevStep] = useState(currentStep)
  if (currentStep !== prevStep) {
    setPrevStep(currentStep)
    setTargetEl(null)
  }

  // Auto-start intro tour for new users
  useEffect(() => {
    if (hasAutoStarted.current) return
    if (isAuthLoading) return
    if (completed || activeTourId !== null) return

    const timer = setTimeout(() => {
      hasAutoStarted.current = true
      startTour('intro')
    }, 1000)
    return () => clearTimeout(timer)
  }, [isAuthLoading, completed, activeTourId, startTour])

  // Cancel active page tour if pathname changes away (but not for intro)
  useEffect(() => {
    if (!activeTourId || activeTourId === 'intro') return
    // The tour should only be active on its target page. If the user navigated away, skip it.
    skip()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to pathname changes
  }, [pathname])

  // Resolve the target element for the current step
  const resolveTarget = useCallback(() => {
    if (!step || step.type === 'dialog' || !step.target) {
      setTargetEl(null)
      return
    }

    const el = document.querySelector(step.target)
    setTargetEl(el)
    return el
  }, [step])

  // Ensure sidebar is visible for sidebar-targeted steps
  useEffect(() => {
    if (!activeTourId || !step || step.type === 'dialog') return

    const match = step.target?.match(/data-tour="([^"]+)"/)
    const tourAttr = match?.[1]

    if (tourAttr && SIDEBAR_TARGETS.has(tourAttr)) {
      if (isMobile) {
        setMobileOpen(true)
      } else if (collapsed) {
        toggle()
      }
    }
  }, [activeTourId, step, isMobile, collapsed, toggle, setMobileOpen])

  // Resolve target on step change
  useEffect(() => {
    if (!activeTourId || !step || step.type === 'dialog') return

    const match = step.target?.match(/data-tour="([^"]+)"/)
    const tourAttr = match?.[1]
    const needsSidebarDelay = tourAttr ? SIDEBAR_TARGETS.has(tourAttr) : false
    const delay = needsSidebarDelay ? 300 : 50

    const timer = setTimeout(() => {
      if (step.target) {
        const scrollTarget = document.querySelector(step.target)
        scrollTarget?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }

      const el = resolveTarget()
      if (!el) {
        next()
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [activeTourId, step, resolveTarget, next])

  // Live announcement for step transitions
  const announcement = activeTourId && step ? `Tutorial step: ${step.title}. ${step.description}` : ''

  if (!activeTourId || !step) return null

  // Welcome dialog
  if (step.type === 'dialog') {
    return (
      <>
        <div aria-live="polite" className="sr-only">{announcement}</div>
        <WelcomeDialog
          open
          title={tour?.title}
          description={tour?.description}
          showSkipAll
          onTakeTour={next}
          onSkip={skip}
          onSkipAll={skipAll}
        />
      </>
    )
  }

  // Coach mark steps
  return (
    <>
      <div aria-live="polite" className="sr-only">{announcement}</div>
      <SpotlightOverlay targetEl={targetEl} />
      {targetEl && (
        <CoachMark
          key={`${activeTourId}-${currentStep}`}
          targetEl={targetEl}
          title={step.title}
          description={step.description}
          placement={step.placement}
          currentStep={currentStep}
          totalSteps={steps.length}
          docUrl={step.docUrl}
          onNext={next}
          onBack={back}
          onSkip={skip}
          onSkipAll={skipAll}
        />
      )}
    </>
  )
}
