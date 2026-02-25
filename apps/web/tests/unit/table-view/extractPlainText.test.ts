import { describe, it, expect } from 'vitest'
import { extractPlainText } from '@/features/table-view/lib/extractPlainText'
import { emptyContent, contentWithText, nestedContent, contentWithMentions } from '../../fixtures/content'
import type { Value } from '@udecode/plate'

describe('extractPlainText', () => {
  it('returns empty string for empty content', () => {
    expect(extractPlainText(emptyContent)).toBe('')
  })

  it('extracts text from a single paragraph', () => {
    const content: Value = [
      { type: 'p', children: [{ text: 'Hello world' }] },
    ]

    expect(extractPlainText(content)).toBe('Hello world')
  })

  it('extracts text from multiple paragraphs with space between', () => {
    expect(extractPlainText(contentWithText)).toBe('Hello world Second paragraph')
  })

  it('skips img type nodes', () => {
    const content: Value = [
      { type: 'p', children: [{ text: 'Before' }] },
      { type: 'img', url: 'http://example.com/image.png', children: [{ text: '' }] },
      { type: 'p', children: [{ text: 'After' }] },
    ]

    expect(extractPlainText(content)).toBe('Before After')
  })

  it('skips code_block type nodes', () => {
    const content: Value = [
      { type: 'p', children: [{ text: 'Text' }] },
      { type: 'code_block', children: [{ text: 'const x = 1' }] },
    ]

    expect(extractPlainText(content)).toBe('Text')
  })

  it('skips table type nodes', () => {
    const content: Value = [
      { type: 'p', children: [{ text: 'Intro' }] },
      {
        type: 'table',
        children: [
          { type: 'tr', children: [{ type: 'td', children: [{ text: 'cell' }] }] },
        ],
      },
    ]

    expect(extractPlainText(content)).toBe('Intro')
  })

  it('truncates at maxLength with ellipsis', () => {
    const longText = 'A'.repeat(200)
    const content: Value = [
      { type: 'p', children: [{ text: longText }] },
    ]

    const result = extractPlainText(content, 50)
    expect(result.length).toBe(51) // 50 chars + ellipsis
    expect(result.endsWith('…')).toBe(true)
  })

  it('does not truncate when under maxLength', () => {
    const content: Value = [
      { type: 'p', children: [{ text: 'Short' }] },
    ]

    expect(extractPlainText(content, 120)).toBe('Short')
  })

  it('extracts text from nested nodes', () => {
    // nestedContent has a blockquote > p > text + mention + bold
    const result = extractPlainText(nestedContent)
    expect(result).toContain('Nested')
    expect(result).toContain('deep text')
  })

  it('handles content with mention nodes', () => {
    // contentWithMentions has text interspersed with mention elements
    const result = extractPlainText(contentWithMentions)
    expect(result).toContain('Check out')
    expect(result).toContain('and')
  })

  it('uses default maxLength of 120', () => {
    const longText = 'B'.repeat(200)
    const content: Value = [
      { type: 'p', children: [{ text: longText }] },
    ]

    const result = extractPlainText(content)
    expect(result.length).toBe(121) // 120 + ellipsis
  })
})
