'use client'

import { useEffect, useState, useCallback } from 'react'

interface SpotlightOverlayProps {
  targetEl: Element | null
  padding?: number
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

function getRect(el: Element, padding: number): Rect {
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
  // Never clear rect — keeping the last valid position lets the CSS transition
  // smoothly animate the cutout to the new target instead of vanishing between steps.
  const [rect, setRect] = useState<Rect | null>(null)

  const measure = useCallback(() => {
    if (!targetEl) return // Don't clear — keep last rect during transition
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

  // Fade out when between steps (targetEl null), fade in once new target resolves.
  // Only transition opacity — not the path — so the cutout snaps to the new
  // position instead of sliding across the screen.
  const visible = targetEl !== null

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-200 motion-reduce:transition-none"
      style={{ width: vw, height: vh, opacity: visible ? 1 : 0 }}
    >
      <path
        d={clipPath}
        fillRule="evenodd"
        className="fill-black/60"
      />
    </svg>
  )
}
