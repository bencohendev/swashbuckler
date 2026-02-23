'use client'

import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    setIsMobile(mql.matches) // eslint-disable-line react-hooks/set-state-in-effect -- initial sync from media query before subscribing

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
