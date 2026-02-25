'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useNavigation } from '@/shared/stores/navigation'

const SAFETY_TIMEOUT = 10_000

export function NavigationProgress() {
  const isNavigating = useNavigation((s) => s.isNavigating)
  const setNavigating = useNavigation((s) => s.setNavigating)
  const pathname = usePathname()
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Clear navigating state when route changes
  useEffect(() => {
    setNavigating(false)
  }, [pathname, setNavigating])

  // Safety timeout to clear stuck state
  useEffect(() => {
    if (isNavigating) {
      timeoutRef.current = setTimeout(() => setNavigating(false), SAFETY_TIMEOUT)
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
  }, [isNavigating, setNavigating])

  if (!isNavigating) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-0.5" role="progressbar" aria-label="Navigating">
      <div className="h-full bg-primary animate-progress-bar" />
    </div>
  )
}
