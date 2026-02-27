'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/shared/lib/utils'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { Button } from '@/shared/components/ui/Button'
import { TUTORIAL_STEPS } from '../lib/steps'
import type { Placement } from '../lib/steps'

const GAP = 12 // px between target and popover
const EDGE_PADDING = 8 // minimum px from viewport edge

interface CoachMarkProps {
  targetEl: Element | null
  title: string
  description: string
  placement: Placement
  currentStep: number
  totalSteps: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface Position {
  top: number
  left: number
  actualPlacement: Placement
}

function computePosition(
  targetRect: DOMRect,
  popoverRect: { width: number; height: number },
  preferred: Placement,
): Position {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Try preferred placement, then fallback order
  const order: Placement[] = [preferred]
  const fallbacks: Placement[] = ['bottom', 'top', 'right', 'left']
  for (const p of fallbacks) {
    if (!order.includes(p)) order.push(p)
  }

  for (const placement of order) {
    let top = 0
    let left = 0

    switch (placement) {
      case 'bottom':
        top = targetRect.bottom + GAP
        left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2
        break
      case 'top':
        top = targetRect.top - GAP - popoverRect.height
        left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2
        left = targetRect.right + GAP
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2
        left = targetRect.left - GAP - popoverRect.width
        break
    }

    // Clamp to viewport
    left = Math.max(EDGE_PADDING, Math.min(left, vw - popoverRect.width - EDGE_PADDING))
    top = Math.max(EDGE_PADDING, Math.min(top, vh - popoverRect.height - EDGE_PADDING))

    // Check if it fits reasonably well (doesn't overlap the target too much)
    const popoverBottom = top + popoverRect.height
    const popoverRight = left + popoverRect.width
    const overlapsTarget =
      top < targetRect.bottom &&
      popoverBottom > targetRect.top &&
      left < targetRect.right &&
      popoverRight > targetRect.left

    if (!overlapsTarget) {
      return { top, left, actualPlacement: placement }
    }
  }

  // Last resort: place below
  return {
    top: targetRect.bottom + GAP,
    left: Math.max(EDGE_PADDING, targetRect.left + targetRect.width / 2 - popoverRect.width / 2),
    actualPlacement: 'bottom',
  }
}

export function CoachMark({
  targetEl,
  title,
  description,
  placement,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: CoachMarkProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [position, setPosition] = useState<Position | null>(null)
  // Track whether position has been measured for the current target
  const [ready, setReady] = useState(false)

  // Buffer displayed content — only update when becoming ready so the old
  // content stays visible during the fade-out instead of flashing new text.
  const [shownTitle, setShownTitle] = useState(title)
  const [shownDescription, setShownDescription] = useState(description)
  const [shownStep, setShownStep] = useState(currentStep)
  if (ready && (shownTitle !== title || shownDescription !== description || shownStep !== currentStep)) {
    setShownTitle(title)
    setShownDescription(description)
    setShownStep(currentStep)
  }

  // Derive state from props: hide popover when target changes so we don't
  // show new content at the old element's position. Keep old position so the
  // hidden popover doesn't flash at (0,0) before the new measurement arrives.
  const [prevTarget, setPrevTarget] = useState<Element | null>(null)
  if (targetEl !== prevTarget) {
    setPrevTarget(targetEl)
    setReady(false)
  }

  const measure = useCallback(() => {
    if (!targetEl || !popoverRef.current || isMobile) return
    const targetRect = targetEl.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()
    setPosition(computePosition(targetRect, { width: popoverRect.width, height: popoverRect.height }, placement))
    setReady(true)
  }, [targetEl, placement, isMobile])

  useEffect(() => {
    // Measure after initial render so popoverRef has dimensions
    requestAnimationFrame(measure)
  }, [measure])

  useEffect(() => {
    if (!targetEl || isMobile) return

    const ro = new ResizeObserver(measure)
    ro.observe(targetEl)
    window.addEventListener('scroll', measure, { capture: true, passive: true })
    window.addEventListener('resize', measure, { passive: true })

    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', measure, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', measure)
    }
  }, [targetEl, measure, isMobile])

  // Focus management — wait for the popover to become ready
  useEffect(() => {
    if (ready) {
      popoverRef.current?.focus()
    }
  }, [ready, currentStep])

  // Escape to skip
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onSkip()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSkip])

  const isLast = shownStep === totalSteps - 1
  const isFirst = shownStep === 0

  // Step dots (only for coachmark steps — skip index 0 which is the welcome dialog)
  const coachmarkSteps = TUTORIAL_STEPS.filter((s) => s.type === 'coachmark')
  const coachmarkIndex = shownStep - 1 // offset by welcome dialog step

  const content = (
    <>
      <div className="mb-1 text-sm font-semibold">{shownTitle}</div>
      <p className="mb-3 text-sm text-muted-foreground">{shownDescription}</p>
      {/* Step dots */}
      <div className="mb-3 flex justify-center gap-1" aria-hidden="true">
        {coachmarkSteps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'size-1.5 rounded-full transition-colors',
              i === coachmarkIndex ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs text-muted-foreground">
          Skip tour
        </Button>
        <div className="flex gap-2">
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLast ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </>
  )

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={shownTitle}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-[51] rounded-t-xl border-t bg-background p-4 shadow-xl outline-none animate-in slide-in-from-bottom-4 motion-reduce:animate-none"
      >
        {content}
      </div>
    )
  }

  // Desktop: positioned popover with smooth fade transitions between steps
  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={shownTitle}
      tabIndex={-1}
      className={cn(
        'fixed z-[51] w-72 rounded-lg border bg-background p-4 shadow-xl outline-none',
        'transition-opacity duration-150 motion-reduce:transition-none',
        ready && position ? 'opacity-100' : 'opacity-0',
      )}
      style={
        position
          ? { top: position.top, left: position.left }
          : { top: 0, left: 0, pointerEvents: 'none' as const }
      }
    >
      {content}
    </div>
  )
}
