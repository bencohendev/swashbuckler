'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function useFocusOnNavigation() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // After navigation, focus the main heading or a tabindex landmark
    requestAnimationFrame(() => {
      const target = document.querySelector('main h1, main [tabindex="-1"]') as HTMLElement | null
      if (target) {
        target.focus({ preventScroll: false })
        return
      }

      const main = document.getElementById('main-content')
      if (main) {
        if (!main.hasAttribute('tabindex')) {
          main.setAttribute('tabindex', '-1')
        }
        main.focus({ preventScroll: false })
      }
    })
  }, [pathname])
}
