import { describe, it, expect } from 'vitest'
import { extractTextFromContent } from '@/features/search/lib/extractText'
import { contentWithText, nestedContent, contentWithMentions } from '../../fixtures/content'

describe('extractTextFromContent', () => {
  it('returns empty string for null input', () => {
    expect(extractTextFromContent(null)).toBe('')
  })

  it('returns empty string for undefined input', () => {
    expect(extractTextFromContent(undefined)).toBe('')
  })

  it('returns empty string for non-array input (string)', () => {
    expect(extractTextFromContent('hello')).toBe('')
  })

  it('returns empty string for non-array input (number)', () => {
    expect(extractTextFromContent(42)).toBe('')
  })

  it('returns empty string for non-array input (object)', () => {
    expect(extractTextFromContent({ text: 'hello' })).toBe('')
  })

  it('returns empty string for empty array', () => {
    expect(extractTextFromContent([])).toBe('')
  })

  it('extracts text from flat paragraph nodes', () => {
    const result = extractTextFromContent(contentWithText)
    expect(result).toBe('Hello world Second paragraph')
  })

  it('extracts text from nested children (blockquote > paragraph > text)', () => {
    const result = extractTextFromContent(nestedContent)
    expect(result).toContain('Nested')
    expect(result).toContain('deep text')
  })

  it('ignores non-text nodes without text property', () => {
    const content = [
      {
        type: 'p',
        children: [
          { type: 'mention', objectId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', children: [{ text: '' }] },
        ],
      },
    ]
    // The mention node has no text prop, but its child has text: ''
    const result = extractTextFromContent(content)
    expect(result.trim()).toBe('')
  })

  it('extracts text from mixed text and non-text nodes', () => {
    const result = extractTextFromContent(contentWithMentions)
    // Should extract 'Check out ', '', ' and ', '' from the text nodes
    expect(result).toContain('Check out')
    expect(result).toContain('and')
  })
})
