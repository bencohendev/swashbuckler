import { describe, it, expect } from 'vitest'
import { getUserColor } from '@/features/collaboration/lib/user-colors'

const PALETTE = [
  '#E06C75', '#61AFEF', '#98C379', '#E5C07B', '#C678DD', '#56B6C2',
  '#D19A66', '#BE5046', '#7EC8E3', '#B8BB26', '#FF79C6', '#8BE9FD',
]

describe('getUserColor', () => {
  it('returns a string starting with #', () => {
    const color = getUserColor('test-user')
    expect(color).toMatch(/^#/)
  })

  it('returns one of the palette colors', () => {
    const color = getUserColor('test-user')
    expect(PALETTE).toContain(color)
  })

  it('is deterministic: same input always returns same output', () => {
    const first = getUserColor('consistent-user-id')
    const second = getUserColor('consistent-user-id')
    const third = getUserColor('consistent-user-id')
    expect(first).toBe(second)
    expect(second).toBe(third)
  })

  it('can produce different colors for different inputs', () => {
    const color1 = getUserColor('user-1')
    const color2 = getUserColor('user-2')
    // These specific inputs should hash to different colors
    expect(color1).not.toBe(color2)
  })

  it('works with UUID-style strings', () => {
    const color = getUserColor('a1b2c3d4-e5f6-4789-abcd-ef0123456789')
    expect(PALETTE).toContain(color)
  })
})
