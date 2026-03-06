'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import { getPrivateBlockOffsetAbove } from '../lib/privateBlockOffset'

const THROTTLE_MS = 50

interface UseMousePresenceOptions {
  containerRef: RefObject<HTMLElement | null>
  scrollRef?: RefObject<HTMLElement | null>
  awareness: Awareness | null
  enabled: boolean
}

export function useMousePresence({ containerRef, scrollRef, awareness, enabled }: UseMousePresenceOptions): void {
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
      const scrollTop = scrollRef?.current?.scrollTop ?? container.scrollTop
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
      const rawY = e.clientY - rect.top + scrollTop
      const privateOffset = getPrivateBlockOffsetAbove(container, rawY, scrollTop)
      const y = Math.round(rawY - privateOffset)

      const last = lastPositionRef.current
      if (last && last.x === x && last.y === y) return

      lastPositionRef.current = { x, y }
      awareness.setLocalStateField('mouse', { x, y })
      lastSentRef.current = performance.now()
      rafRef.current = null
    })
  }, [containerRef, scrollRef, awareness])

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

    // Attach events to the scroll container if provided, otherwise the content container
    const eventTarget = scrollRef?.current ?? container

    eventTarget.addEventListener('mousemove', handleMouseMove)
    eventTarget.addEventListener('mouseleave', clearMouse)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      eventTarget.removeEventListener('mousemove', handleMouseMove)
      eventTarget.removeEventListener('mouseleave', clearMouse)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      awareness.setLocalStateField('mouse', null)
    }
  }, [enabled, containerRef, scrollRef, awareness, handleMouseMove, clearMouse, handleVisibilityChange])
}
