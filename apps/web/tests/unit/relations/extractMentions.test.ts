import { describe, it, expect } from 'vitest'
import { extractMentionIds } from '@/features/relations/lib/extractMentions'
import {
  emptyContent,
  contentWithText,
  contentWithMentions,
  contentWithDuplicateMentions,
  nestedContent,
} from '../../fixtures/content'
import type { Value } from '@udecode/plate'

describe('extractMentionIds', () => {
  it('returns empty array for empty content', () => {
    expect(extractMentionIds(emptyContent)).toEqual([])
  })

  it('returns empty array for content with no mentions', () => {
    expect(extractMentionIds(contentWithText)).toEqual([])
  })

  it('returns objectId for a single mention', () => {
    const content: Value = [
      {
        type: 'p',
        children: [
          { type: 'mention', objectId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', children: [{ text: '' }] },
        ],
      },
    ]
    const result = extractMentionIds(content)
    expect(result).toEqual(['a1b2c3d4-e5f6-4789-abcd-ef0123456789'])
  })

  it('returns all unique objectIds from multiple mentions', () => {
    const result = extractMentionIds(contentWithMentions)
    expect(result).toHaveLength(2)
    expect(result).toContain('a1b2c3d4-e5f6-4789-abcd-ef0123456789')
    expect(result).toContain('b2c3d4e5-f6a7-4890-bcde-f01234567890')
  })

  it('deduplicates mention IDs', () => {
    const result = extractMentionIds(contentWithDuplicateMentions)
    expect(result).toHaveLength(1)
    expect(result).toEqual(['a1b2c3d4-e5f6-4789-abcd-ef0123456789'])
  })

  it('finds mentions nested in other elements', () => {
    const result = extractMentionIds(nestedContent)
    expect(result).toEqual(['c3d4e5f6-a7b8-4901-cdef-012345678901'])
  })

  it('ignores mention nodes without objectId', () => {
    const content: Value = [
      {
        type: 'p',
        children: [
          { type: 'mention', children: [{ text: '' }] },
        ],
      },
    ]
    expect(extractMentionIds(content)).toEqual([])
  })

  it('ignores mention nodes where objectId is not a string', () => {
    const content: Value = [
      {
        type: 'p',
        children: [
          { type: 'mention', objectId: 123, children: [{ text: '' }] },
          { type: 'mention', objectId: null, children: [{ text: '' }] },
        ],
      },
    ]
    expect(extractMentionIds(content)).toEqual([])
  })
})
