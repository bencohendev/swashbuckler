import { describe, it, expect, vi } from 'vitest'
import { sanitizeContent } from '@/features/editor/lib/sanitizeContent'

describe('sanitizeContent', () => {
  it('returns null for non-array input', () => {
    expect(sanitizeContent(null)).toBeNull()
    expect(sanitizeContent(undefined)).toBeNull()
    expect(sanitizeContent('string')).toBeNull()
    expect(sanitizeContent(42)).toBeNull()
    expect(sanitizeContent({})).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(sanitizeContent([])).toBeNull()
  })

  it('accepts valid Plate content', () => {
    const content = [
      { type: 'p', children: [{ text: 'Hello' }] },
    ]
    expect(sanitizeContent(content)).toEqual(content)
  })

  it('accepts multiple valid nodes', () => {
    const content = [
      { type: 'p', children: [{ text: 'One' }] },
      { type: 'h1', children: [{ text: 'Two' }] },
      { type: 'blockquote', children: [{ text: 'Three' }] },
    ]
    expect(sanitizeContent(content)).toEqual(content)
  })

  it('returns null when a node is missing type', () => {
    const content = [
      { children: [{ text: 'No type' }] },
    ]
    expect(sanitizeContent(content)).toBeNull()
  })

  it('returns null when type is not a string', () => {
    const content = [
      { type: 123, children: [{ text: 'Bad type' }] },
    ]
    expect(sanitizeContent(content)).toBeNull()
  })

  it('returns null when a node is missing children', () => {
    const content = [
      { type: 'p' },
    ]
    expect(sanitizeContent(content)).toBeNull()
  })

  it('returns null when children is not an array', () => {
    const content = [
      { type: 'p', children: 'not an array' },
    ]
    expect(sanitizeContent(content)).toBeNull()
  })

  it('returns null when any node in array is null', () => {
    const content = [
      { type: 'p', children: [{ text: 'Valid' }] },
      null,
    ]
    expect(sanitizeContent(content)).toBeNull()
  })

  it('logs a warning for malformed content', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sanitizeContent([{ type: 'p' }])
    expect(spy).toHaveBeenCalledWith(
      '[Editor] Dropping malformed content node:',
      { type: 'p' },
    )
    spy.mockRestore()
  })
})
