'use client'

import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

let mql: MediaQueryList | null = null

function getMql(): MediaQueryList {
  if (!mql) mql = window.matchMedia(QUERY)
  return mql
}

function subscribe(callback: () => void): () => void {
  const mediaQuery = getMql()
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return getMql().matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
