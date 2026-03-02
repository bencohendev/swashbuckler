import { describe, it, expect } from 'vitest'
import { stripPrivateContent } from '@/features/editor/lib/stripPrivateContent'

describe('stripPrivateContent', () => {
  it('returns empty array for empty input', () => {
    expect(stripPrivateContent([])).toEqual([])
  })

  it('passes through normal paragraphs unchanged', () => {
    const value = [
      { type: 'p', children: [{ text: 'Hello world' }] },
    ]
    expect(stripPrivateContent(value)).toEqual(value)
  })

  it('removes private_block elements', () => {
    const value = [
      { type: 'p', children: [{ text: 'Public' }] },
      { type: 'private_block', children: [{ text: 'Secret' }] },
      { type: 'p', children: [{ text: 'Also public' }] },
    ]
    const result = stripPrivateContent(value)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ type: 'p', children: [{ text: 'Public' }] })
    expect(result[1]).toEqual({ type: 'p', children: [{ text: 'Also public' }] })
  })

  it('removes text nodes with private mark', () => {
    const value = [
      {
        type: 'p',
        children: [
          { text: 'Visible ' },
          { text: 'hidden', private: true },
          { text: ' end' },
        ],
      },
    ]
    const result = stripPrivateContent(value)
    expect(result).toHaveLength(1)
    expect(result[0].children).toEqual([
      { text: 'Visible ' },
      { text: ' end' },
    ])
  })

  it('inserts empty text when all children are private', () => {
    const value = [
      {
        type: 'p',
        children: [
          { text: 'secret', private: true },
        ],
      },
    ]
    const result = stripPrivateContent(value)
    expect(result).toHaveLength(1)
    expect(result[0].children).toEqual([{ text: '' }])
  })

  it('handles nested elements recursively', () => {
    const value = [
      {
        type: 'blockquote',
        children: [
          { type: 'p', children: [{ text: 'Public quote' }] },
          { type: 'private_block', children: [{ text: 'Private quote' }] },
        ],
      },
    ]
    const result = stripPrivateContent(value)
    expect(result).toHaveLength(1)
    expect(result[0].children).toEqual([
      { type: 'p', children: [{ text: 'Public quote' }] },
    ])
  })

  it('preserves non-private text marks', () => {
    const value = [
      {
        type: 'p',
        children: [
          { text: 'bold text', bold: true },
          { text: 'secret', private: true },
        ],
      },
    ]
    const result = stripPrivateContent(value)
    expect(result[0].children).toEqual([{ text: 'bold text', bold: true }])
  })

  it('handles deeply nested private content', () => {
    const value = [
      {
        type: 'ul',
        children: [
          {
            type: 'li',
            children: [
              {
                type: 'p',
                children: [
                  { text: 'public', private: false },
                  { text: 'hidden', private: true },
                ],
              },
            ],
          },
        ],
      },
    ]
    const result = stripPrivateContent(value)
    const ul = result[0] as { children: { children: { children: unknown[] }[] }[] }
    expect(ul.children[0].children[0].children).toEqual([
      { text: 'public', private: false },
    ])
  })

  it('preserves elements without children', () => {
    const value = [
      { type: 'hr', children: [{ text: '' }] },
      { type: 'p', children: [{ text: 'After hr' }] },
    ]
    const result = stripPrivateContent(value)
    expect(result).toEqual(value)
  })
})
