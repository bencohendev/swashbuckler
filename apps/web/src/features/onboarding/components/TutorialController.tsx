'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/shared/lib/data'
import { useSidebar } from '@/shared/stores/sidebar'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useTutorial } from '../hooks/useTutorial'
import { TUTORIAL_STEPS } from '../lib/steps'
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
  const { user, isLoading: isAuthLoading } = useAuth()
  const { active, completed, currentStep, start, next, back, skip } = useTutorial()
  const { collapsed, toggle, setMobileOpen } = useSidebar()
  const isMobile = useIsMobile()
  const [targetEl, setTargetEl] = useState<Element | null>(null)
  const hasAutoStarted = useRef(false)

  // Clear target immediately when step changes so CoachMark hides before repositioning
  const [prevStep, setPrevStep] = useState(currentStep)
  if (currentStep !== prevStep) {
    setPrevStep(currentStep)
    setTargetEl(null)
  }

  // Auto-start for new authenticated users (once)
  useEffect(() => {
    if (hasAutoStarted.current) return
    if (isAuthLoading || !user) return
    if (completed || active) return

    hasAutoStarted.current = true
    // Delay to let UI settle after first sign-in
    const timer = setTimeout(() => {
      start()
    }, 1000)
    return () => clearTimeout(timer)
  }, [isAuthLoading, user, completed, active, start])

  // Resolve the target element for the current step
  const resolveTarget = useCallback(() => {
    const step = TUTORIAL_STEPS[currentStep]
    if (!step || step.type === 'dialog' || !step.target) {
      setTargetEl(null)
      return
    }

    const el = document.querySelector(step.target)
    setTargetEl(el)
    return el
  }, [currentStep])

  // Ensure sidebar is visible for sidebar-targeted steps
  useEffect(() => {
    if (!active) return
    const step = TUTORIAL_STEPS[currentStep]
    if (!step || step.type === 'dialog') return

    // Extract the data-tour value from the selector
    const match = step.target?.match(/data-tour="([^"]+)"/)
    const tourId = match?.[1]

    if (tourId && SIDEBAR_TARGETS.has(tourId)) {
      if (isMobile) {
        setMobileOpen(true)
      } else if (collapsed) {
        toggle()
      }
    }
  }, [active, currentStep, isMobile, collapsed, toggle, setMobileOpen])

  // Resolve target on step change
  useEffect(() => {
    if (!active) return

    const step = TUTORIAL_STEPS[currentStep]
    if (!step || step.type === 'dialog') return

    // Determine if this step targets a sidebar element (needs longer delay for sidebar animation)
    const match = step.target?.match(/data-tour="([^"]+)"/)
    const tourId = match?.[1]
    const needsSidebarDelay = tourId ? SIDEBAR_TARGETS.has(tourId) : false
    const delay = needsSidebarDelay ? 300 : 50

    const timer = setTimeout(() => {
      // Scroll target into view if needed (e.g. tags section below the fold)
      if (step.target) {
        const scrollTarget = document.querySelector(step.target)
        scrollTarget?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }

      const el = resolveTarget()
      // Auto-skip if target is missing
      if (!el) {
        next()
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [active, currentStep, resolveTarget, next])

  // Live announcement for step transitions
  const step = TUTORIAL_STEPS[currentStep]
  const announcement = active && step ? `Tutorial step: ${step.title}. ${step.description}` : ''

  if (!active) return null

  // Welcome dialog (step 0)
  if (step?.type === 'dialog') {
    return (
      <>
        <div aria-live="polite" className="sr-only">{announcement}</div>
        <WelcomeDialog
          open
          onTakeTour={next}
          onSkip={skip}
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
          key={currentStep}
          targetEl={targetEl}
          title={step?.title ?? ''}
          description={step?.description ?? ''}
          placement={step?.placement ?? 'bottom'}
          currentStep={currentStep}
          totalSteps={TUTORIAL_STEPS.length}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      )}
    </>
  )
}
