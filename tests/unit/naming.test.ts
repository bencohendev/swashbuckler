import { describe, it, expect } from 'vitest'
import { getNextDefaultName } from '@/shared/lib/naming'

describe('getNextDefaultName', () => {
  it('returns base name when no existing titles', () => {
    expect(getNextDefaultName('Page', [])).toBe('New Page')
  })

  it('returns base name when it is not taken', () => {
    expect(getNextDefaultName('Page', ['My Page', 'Notes'])).toBe('New Page')
  })

  it('returns " 2" when base name exists', () => {
    expect(getNextDefaultName('Page', ['New Page'])).toBe('New Page 2')
  })

  it('returns next number after highest existing', () => {
    expect(
      getNextDefaultName('Page', ['New Page', 'New Page 2', 'New Page 3'])
    ).toBe('New Page 4')
  })

  it('does not fill gaps — picks next after highest', () => {
    expect(
      getNextDefaultName('Page', ['New Page', 'New Page 5'])
    ).toBe('New Page 6')
  })

  it('handles different type names independently', () => {
    const titles = ['New Page', 'New Page 2', 'New Note']
    expect(getNextDefaultName('Page', titles)).toBe('New Page 3')
    expect(getNextDefaultName('Note', titles)).toBe('New Note 2')
    expect(getNextDefaultName('Task', titles)).toBe('New Task')
  })

  it('ignores unrelated titles that partially match', () => {
    const titles = ['New Page', 'New Page Extra', 'New Page 2 notes']
    expect(getNextDefaultName('Page', titles)).toBe('New Page 2')
  })

  it('handles type names with special regex characters', () => {
    expect(
      getNextDefaultName('Q&A (FAQ)', ['New Q&A (FAQ)'])
    ).toBe('New Q&A (FAQ) 2')
  })
})
