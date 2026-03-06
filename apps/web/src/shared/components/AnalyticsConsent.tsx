'use client'

import { useSyncExternalStore } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const ANALYTICS_CONSENT_KEY = 'swashbuckler:analyticsConsent'

type ConsentState = 'pending' | 'accepted' | 'declined'

// Notify subscribers when consent changes within the same tab
// (storage events only fire cross-tab)
const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

function getSnapshot(): ConsentState {
  const value = localStorage.getItem(ANALYTICS_CONSENT_KEY)
  if (value === 'accepted' || value === 'declined') return value
  return 'pending'
}

function getServerSnapshot(): ConsentState {
  return 'declined'
}

export function writeAnalyticsConsent(value: 'accepted' | 'declined') {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, value)
  emitChange()
}

/**
 * Conditionally renders Vercel Analytics + SpeedInsights based on stored consent.
 * Consent is collected during onboarding (NewUserDialog / GuestModeDialog).
 */
export function AnalyticsProvider() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const analyticsEnabled = consent === 'accepted'

  if (!analyticsEnabled) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
