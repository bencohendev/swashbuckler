'use client'

import { getPasswordStrength, type PasswordStrengthLevel } from '../lib/passwordStrength'
import { cn } from '@/shared/lib/utils'

const barColors: Record<PasswordStrengthLevel, string> = {
  0: '',
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-emerald-500',
  4: 'bg-emerald-500',
}

const textColors: Record<PasswordStrengthLevel, string> = {
  0: '',
  1: 'text-red-600 dark:text-red-400',
  2: 'text-amber-600 dark:text-amber-400',
  3: 'text-emerald-600 dark:text-emerald-400',
  4: 'text-emerald-600 dark:text-emerald-400',
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = getPasswordStrength(password)

  if (score === 0) return null

  return (
    <div className="space-y-1.5">
      <div
        className="flex gap-1"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label={`Password strength: ${label}`}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < score ? barColors[score] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs', textColors[score])}>{label}</p>
    </div>
  )
}
