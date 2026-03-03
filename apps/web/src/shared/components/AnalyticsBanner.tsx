'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { cn } from '@/shared/lib/utils'
import { Button } from './ui/Button'

const STORAGE_KEY = 'swashbuckler:analyticsConsent'

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
  const value = localStorage.getItem(STORAGE_KEY)
  if (value === 'accepted' || value === 'declined') return value
  return 'pending'
}

function getServerSnapshot(): ConsentState {
  return 'pending'
}

function writeConsent(value: 'accepted' | 'declined') {
  localStorage.setItem(STORAGE_KEY, value)
  emitChange()
}

export function AnalyticsBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const analyticsEnabled = consent !== 'declined'
  const showBanner = consent === 'pending'

  return (
    <>
      {analyticsEnabled && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
      <div
        role="status"
        aria-label="Analytics consent"
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 overflow-hidden transition-all duration-200",
          showBanner ? "max-h-20 visible" : "max-h-0 invisible"
        )}
      >
        <div className="bg-muted border-t px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              We use anonymous analytics to improve Swashbuckler.{' '}
              <Link href="/privacy" className="font-medium underline hover:no-underline">
                Privacy policy
              </Link>
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => writeConsent('declined')}
                className="text-muted-foreground"
              >
                Decline
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => writeConsent('accepted')}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
