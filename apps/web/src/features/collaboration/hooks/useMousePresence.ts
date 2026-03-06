'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'
import type { Awareness } from 'y-protocols/awareness'

const THROTTLE_MS = 50

interface UseMousePresenceOptions {
  /** Element to listen for mouse events on (typically the scrollable area) */
  containerRef: RefObject<HTMLElement | null>
  /** Element to measure coordinates from (where the cursor overlay renders).
   *  Falls back to containerRef if not provided. */
  coordinateRef?: RefObject<HTMLElement | null>
  awareness: Awareness | null
  enabled: boolean
}

export function useMousePresence({ containerRef, coordinateRef, awareness, enabled }: UseMousePresenceOptions): void {
  const rafRef = useRef<number | null>(null)
  const lastSentRef = useRef<number>(0)
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const coordEl = coordinateRef?.current ?? containerRef.current
    if (!coordEl || !awareness) return

    const now = performance.now()
    if (now - lastSentRef.current < THROTTLE_MS) return

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const rect = coordEl.getBoundingClientRect()
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
      // getBoundingClientRect is scroll-aware: rect.top shifts as the
      // parent scrolls, so no manual scrollTop adjustment is needed when
      // coordinateRef is a non-scrolling child of a scrollable container.
      const y = Math.round(e.clientY - rect.top + coordEl.scrollTop)

      const last = lastPositionRef.current
      if (last && last.x === x && last.y === y) return

      lastPositionRef.current = { x, y }
      awareness.setLocalStateField('mouse', { x, y })
      lastSentRef.current = performance.now()
      rafRef.current = null
    })
  }, [containerRef, coordinateRef, awareness])

  const clearMouse = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    lastPositionRef.current = null
    awareness?.setLocalStateField('mouse', null)
  }, [awareness])

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      clearMouse()
    }
  }, [clearMouse])

  useEffect(() => {
    if (!enabled || !awareness) return

    const container = containerRef.current
    if (!container) return

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', clearMouse)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', clearMouse)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      awareness.setLocalStateField('mouse', null)
    }
  }, [enabled, containerRef, awareness, handleMouseMove, clearMouse, handleVisibilityChange])
}
