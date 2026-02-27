'use client'

import { useMemo } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import type { ThemeResolvedColors } from '../types'
import { contrastRatio } from '../lib/colorUtils'

interface ContrastPair {
  label: string
  foreground: string
  background: string
}

const PAIRS: ((c: ThemeResolvedColors) => ContrastPair)[] = [
  (c) => ({ label: 'Text on background', foreground: c.foreground, background: c.background }),
  (c) => ({ label: 'Button text on primary', foreground: c['primary-foreground'], background: c.primary }),
  (c) => ({ label: 'Secondary text on background', foreground: c['muted-foreground'], background: c.background }),
]

const MIN_RATIO = 4.5

interface ContrastWarningsProps {
  resolvedColors: ThemeResolvedColors
}

export function ContrastWarnings({ resolvedColors }: ContrastWarningsProps) {
  const warnings = useMemo(() => {
    return PAIRS
      .map((getPair) => {
        const pair = getPair(resolvedColors)
        const ratio = contrastRatio(pair.foreground, pair.background)
        return { ...pair, ratio }
      })
      .filter((w) => w.ratio < MIN_RATIO)
  }, [resolvedColors])

  if (warnings.length === 0) return null

  return (
    <div role="alert" className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
      <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
        <AlertTriangleIcon className="size-4 shrink-0" />
        Low contrast detected
      </div>
      <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
        {warnings.map((w) => (
          <li key={w.label}>
            {w.label}: <strong>{w.ratio.toFixed(1)}:1</strong> (minimum 4.5:1)
          </li>
        ))}
      </ul>
    </div>
  )
}
