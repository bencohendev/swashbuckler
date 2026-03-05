'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ANALYTICS_CONSENT_KEY, writeAnalyticsConsent } from '@/shared/components/AnalyticsBanner'

export function AnalyticsConsentToggle() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'accepted'
  })

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    writeAnalyticsConsent(next ? 'accepted' : 'declined')
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ backgroundColor: enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
      >
        <span
          className="pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform"
          style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
      <p className="text-xs text-muted-foreground">
        Help improve Swashbuckler with anonymous analytics.{' '}
        <Link href="/privacy" className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">
          Privacy policy
        </Link>
      </p>
    </div>
  )
}
