'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'
import type { Awareness } from 'y-protocols/awareness'

const THROTTLE_MS = 50

interface UseMousePresenceOptions {
  containerRef: RefObject<HTMLElement | null>
  awareness: Awareness | null
  enabled: boolean
}

export function useMousePresence({ containerRef, awareness, enabled }: UseMousePresenceOptions): void {
  const rafRef = useRef<number | null>(null)
  const lastSentRef = useRef<number>(0)
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current
    if (!container || !awareness) return

    const now = performance.now()
    if (now - lastSentRef.current < THROTTLE_MS) return

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect()
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
      const y = Math.round(e.clientY - rect.top + container.scrollTop)

      const last = lastPositionRef.current
      if (last && last.x === x && last.y === y) return

      lastPositionRef.current = { x, y }
      awareness.setLocalStateField('mouse', { x, y })
      lastSentRef.current = performance.now()
      rafRef.current = null
    })
  }, [containerRef, awareness])

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
