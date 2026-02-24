import { describe, it, expect } from 'vitest'
import { getPasswordStrength } from '@/features/auth/lib/passwordStrength'

describe('getPasswordStrength', () => {
  it('returns score 0 for empty string', () => {
    expect(getPasswordStrength('')).toEqual({ score: 0, label: '' })
  })

  it('returns Weak for short lowercase-only password', () => {
    expect(getPasswordStrength('abc')).toEqual({ score: 1, label: 'Weak' })
  })

  it('returns Weak for 8+ chars with only lowercase', () => {
    // +1 for length, no other points → clamped to 1
    expect(getPasswordStrength('abcdefgh')).toEqual({ score: 1, label: 'Weak' })
  })

  it('returns Fair for 8+ chars with mixed case', () => {
    // +1 length + 1 mixed case = 2
    expect(getPasswordStrength('Abcdefgh')).toEqual({ score: 2, label: 'Fair' })
  })

  it('returns Strong for 8+ chars with mixed case and digit', () => {
    // +1 length + 1 mixed case + 1 digit = 3
    expect(getPasswordStrength('Abcdefg1')).toEqual({ score: 3, label: 'Strong' })
  })

  it('returns Very strong for 8+ chars with mixed case, digit, and special', () => {
    // +1 length + 1 mixed case + 1 digit + 1 special = 4
    expect(getPasswordStrength('Abcdef1!')).toEqual({ score: 4, label: 'Very strong' })
  })

  it('returns Very strong for 12+ chars with full diversity', () => {
    // +1 (≥8) + 1 (≥12) + 1 mixed + 1 digit + 1 special = 5, clamped to 4
    expect(getPasswordStrength('Abcdefghij1!')).toEqual({ score: 4, label: 'Very strong' })
  })

  it('caps score at 4', () => {
    expect(getPasswordStrength('SuperSecure123!@#').score).toBe(4)
  })

  it('returns Fair for 12+ lowercase-only', () => {
    // +1 (≥8) + 1 (≥12) = 2
    expect(getPasswordStrength('abcdefghijkl')).toEqual({ score: 2, label: 'Fair' })
  })

  it('returns Weak for digit-only short password', () => {
    // 0 points → clamped to 1
    expect(getPasswordStrength('12345')).toEqual({ score: 1, label: 'Weak' })
  })

  it('returns Fair for 8+ digits only', () => {
    // +1 length + 1 digit = 2
    expect(getPasswordStrength('12345678')).toEqual({ score: 2, label: 'Fair' })
  })

  it('returns Weak for single character', () => {
    expect(getPasswordStrength('a')).toEqual({ score: 1, label: 'Weak' })
  })
})
