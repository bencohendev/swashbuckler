import { describe, it, expect } from 'vitest'
import { contrastRatio, contrastLevel } from '@/features/theme-builder/lib/colorUtils'

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    const ratio = contrastRatio('#000000', '#ffffff')
    expect(ratio).toBeCloseTo(21, 0)
  })

  it('returns 1:1 for same color', () => {
    const ratio = contrastRatio('#ff0000', '#ff0000')
    expect(ratio).toBeCloseTo(1, 1)
  })

  it('is symmetric (order-independent)', () => {
    const ab = contrastRatio('#336699', '#ffffff')
    const ba = contrastRatio('#ffffff', '#336699')
    expect(ab).toBeCloseTo(ba, 5)
  })

  it('computes a mid-range ratio correctly', () => {
    // Gray #767676 on white has ratio ~4.54 (known WCAG reference)
    const ratio = contrastRatio('#767676', '#ffffff')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(ratio).toBeLessThan(5)
  })
})

describe('contrastLevel', () => {
  it('returns "aaa" for ratio >= 7', () => {
    expect(contrastLevel(21)).toBe('aaa')
    expect(contrastLevel(7)).toBe('aaa')
  })

  it('returns "aa" for ratio >= 4.5 and < 7', () => {
    expect(contrastLevel(4.5)).toBe('aa')
    expect(contrastLevel(6.9)).toBe('aa')
  })

  it('returns "aa-large" for ratio >= 3 and < 4.5', () => {
    expect(contrastLevel(3)).toBe('aa-large')
    expect(contrastLevel(4.4)).toBe('aa-large')
  })

  it('returns "fail" for ratio < 3', () => {
    expect(contrastLevel(2.9)).toBe('fail')
    expect(contrastLevel(1)).toBe('fail')
  })
})
