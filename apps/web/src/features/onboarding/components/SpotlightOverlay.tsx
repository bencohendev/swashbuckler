'use client'

import { useEffect, useState, useCallback } from 'react'

interface SpotlightOverlayProps {
  targetEl: Element | null
  padding?: number
}

function getRect(el: Element, padding: number): { x: number; y: number; w: number; h: number; r: number } {
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left - padding,
    y: rect.top - padding,
    w: rect.width + padding * 2,
    h: rect.height + padding * 2,
    r: 8,
  }
}

export function SpotlightOverlay({ targetEl, padding = 6 }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number; r: number } | null>(null)

  const measure = useCallback(() => {
    if (!targetEl) {
      setRect(null)
      return
    }
    setRect(getRect(targetEl, padding))
  }, [targetEl, padding])

  useEffect(() => {
    // Initial measurement deferred to rAF to avoid synchronous setState in effect
    const raf = requestAnimationFrame(measure)

    if (!targetEl) return () => cancelAnimationFrame(raf)

    const ro = new ResizeObserver(measure)
    ro.observe(targetEl)

    // Passive scroll listener on capturing phase to catch scrolling in any container
    window.addEventListener('scroll', measure, { capture: true, passive: true })
    window.addEventListener('resize', measure, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', measure, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', measure)
    }
  }, [targetEl, measure])

  if (!rect) return null

  // Outer rect = entire viewport, inner rect = spotlight cutout
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0

  // evenodd clip-path: outer rect minus rounded-rect cutout
  const clipPath = `
    M 0 0
    H ${vw}
    V ${vh}
    H 0
    Z
    M ${rect.x + rect.r} ${rect.y}
    H ${rect.x + rect.w - rect.r}
    Q ${rect.x + rect.w} ${rect.y} ${rect.x + rect.w} ${rect.y + rect.r}
    V ${rect.y + rect.h - rect.r}
    Q ${rect.x + rect.w} ${rect.y + rect.h} ${rect.x + rect.w - rect.r} ${rect.y + rect.h}
    H ${rect.x + rect.r}
    Q ${rect.x} ${rect.y + rect.h} ${rect.x} ${rect.y + rect.h - rect.r}
    V ${rect.y + rect.r}
    Q ${rect.x} ${rect.y} ${rect.x + rect.r} ${rect.y}
    Z
  `.trim()

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: vw, height: vh }}
    >
      <path
        d={clipPath}
        fillRule="evenodd"
        className="fill-black/50 transition-all duration-200 motion-reduce:transition-none"
      />
    </svg>
  )
}
