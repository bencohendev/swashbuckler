'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/shared/lib/utils'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { Button } from '@/shared/components/ui/Button'
import type { Placement } from '../lib/steps'

const GAP = 12 // px between target and popover
const EDGE_PADDING = 8 // minimum px from viewport edge

interface CoachMarkProps {
  targetEl: Element
  title: string
  description: string
  placement: Placement
  currentStep: number
  totalSteps: number
  docUrl?: string
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onSkipAll?: () => void
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
  docUrl,
  onNext,
  onBack,
  onSkip,
  onSkipAll,
}: CoachMarkProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [position, setPosition] = useState<Position | null>(null)

  const measure = useCallback(() => {
    if (!popoverRef.current || isMobile) return
    const targetRect = targetEl.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()
    setPosition(computePosition(targetRect, { width: popoverRect.width, height: popoverRect.height }, placement))
  }, [targetEl, placement, isMobile])

  useEffect(() => {
    // Measure after initial render so popoverRef has dimensions
    requestAnimationFrame(measure)
  }, [measure])

  useEffect(() => {
    if (isMobile) return

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

  // Focus management
  useEffect(() => {
    popoverRef.current?.focus()
  }, [currentStep])

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

  const isLast = currentStep === totalSteps - 1
  const isFirst = currentStep === 0

  // Compute coachmark-only step dots (skip dialog steps)
  // currentStep is 0-based index into all steps; step 0 is usually the dialog
  // so coachmark steps start at index 1
  const coachmarkCount = totalSteps - 1 // total minus the welcome dialog
  const coachmarkIndex = currentStep - 1 // offset by welcome dialog step

  const content = (
    <>
      <div className="mb-1 text-sm font-semibold">{title}</div>
      <p className="mb-1 text-sm text-muted-foreground">{description}</p>
      {docUrl && (
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 inline-block text-xs text-primary hover:underline"
        >
          Learn more
        </a>
      )}
      {/* Step dots */}
      {coachmarkCount > 0 && (
        <div className="mb-3 flex justify-center gap-1" aria-hidden="true">
          {Array.from({ length: coachmarkCount }, (_, i) => (
            <div
              key={i}
              className={cn(
                'size-1.5 rounded-full transition-colors',
                i === coachmarkIndex ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs text-muted-foreground">
            Skip tour
          </Button>
          {onSkipAll && (
            <Button variant="ghost" size="sm" onClick={onSkipAll} className="text-xs text-muted-foreground">
              Skip all
            </Button>
          )}
        </div>
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
        aria-label={title}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-[51] rounded-t-xl border-t bg-background p-4 shadow-xl outline-none animate-in slide-in-from-bottom-4 motion-reduce:animate-none"
      >
        {content}
      </div>
    )
  }

  // Desktop: positioned popover — mounts fresh each step via key in parent,
  // so animate-in runs on every step transition.
  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      className="fixed z-[51] w-72 rounded-lg border bg-background p-4 shadow-xl outline-none animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
      style={
        position
          ? { top: position.top, left: position.left }
          : { top: 0, left: 0, opacity: 0, pointerEvents: 'none' as const }
      }
    >
      {content}
    </div>
  )
}
