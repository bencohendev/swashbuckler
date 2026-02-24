export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4

export type PasswordStrengthResult = {
  score: PasswordStrengthLevel
  label: '' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'
}

const labels = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Strong',
  4: 'Very strong',
} as const satisfies Record<PasswordStrengthLevel, string>

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (password.length === 0) return { score: 0, label: '' }

  let points = 0

  if (password.length >= 8) points += 1
  if (password.length >= 12) points += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1
  if (/\d/.test(password)) points += 1
  if (/[^a-zA-Z0-9]/.test(password)) points += 1

  const score = Math.min(4, Math.max(1, points)) as PasswordStrengthLevel

  return { score, label: labels[score] }
}
