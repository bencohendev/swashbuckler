'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ANALYTICS_CONSENT_KEY, writeAnalyticsConsent } from '@/shared/components/AnalyticsConsent'

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
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3">
      <input
        type="checkbox"
        checked={enabled}
        onChange={toggle}
        className="size-4 shrink-0 rounded border-border accent-primary"
      />
      <span className="text-xs text-muted-foreground">
        Help improve Swashbuckler with anonymous analytics.{' '}
        <Link href="/privacy" className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">
          Privacy policy
        </Link>
      </span>
    </label>
  )
}
