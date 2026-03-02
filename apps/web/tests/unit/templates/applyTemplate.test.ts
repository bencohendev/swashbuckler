import { describe, it, expect } from 'vitest'
import { applyTemplateContent, mergeProperties } from '@/features/templates/lib/applyTemplate'

describe('applyTemplateContent', () => {
  const templateContent = [
    { type: 'p', children: [{ text: 'Template paragraph' }] },
  ]
  const existingContent = [
    { type: 'p', children: [{ text: 'Existing paragraph' }] },
  ]

  describe('replace mode', () => {
    it('returns template content, discarding existing', () => {
      const result = applyTemplateContent(templateContent, existingContent, 'replace')
      expect(result).toEqual(templateContent)
    })

    it('returns empty paragraph when template is null', () => {
      const result = applyTemplateContent(null, existingContent, 'replace')
      expect(result).toEqual([{ type: 'p', children: [{ text: '' }] }])
    })

    it('returns empty paragraph when template is empty array', () => {
      const result = applyTemplateContent([], existingContent, 'replace')
      expect(result).toEqual([{ type: 'p', children: [{ text: '' }] }])
    })
  })

  describe('prepend mode', () => {
    it('places template content before existing', () => {
      const result = applyTemplateContent(templateContent, existingContent, 'prepend')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(templateContent[0])
      expect(result[1]).toEqual(existingContent[0])
    })

    it('returns existing content when template is null', () => {
      const result = applyTemplateContent(null, existingContent, 'prepend')
      expect(result).toEqual(existingContent)
    })

    it('returns template content when existing is null', () => {
      const result = applyTemplateContent(templateContent, null, 'prepend')
      expect(result).toEqual(templateContent)
    })

    it('returns empty paragraph when both are null', () => {
      const result = applyTemplateContent(null, null, 'prepend')
      expect(result).toEqual([{ type: 'p', children: [{ text: '' }] }])
    })

    it('returns existing when template is empty array', () => {
      const result = applyTemplateContent([], existingContent, 'prepend')
      expect(result).toEqual(existingContent)
    })
  })

  it('deep-clones template content (no mutation)', () => {
    const template = [{ type: 'p', children: [{ text: 'Original' }] }]
    const result = applyTemplateContent(template, null, 'replace')
    // Mutating the result should not affect the original
    ;(result[0] as Record<string, unknown>).type = 'h1'
    expect(template[0].type).toBe('p')
  })
})

describe('mergeProperties', () => {
  it('fills absent keys from template', () => {
    const result = mergeProperties({ color: 'red', size: 'large' }, {})
    expect(result).toEqual({ color: 'red', size: 'large' })
  })

  it('fills null keys from template', () => {
    const result = mergeProperties({ color: 'red' }, { color: null })
    expect(result).toEqual({ color: 'red' })
  })

  it('fills empty-string keys from template', () => {
    const result = mergeProperties({ color: 'red' }, { color: '' })
    expect(result).toEqual({ color: 'red' })
  })

  it('does not overwrite existing non-empty values', () => {
    const result = mergeProperties(
      { color: 'red', size: 'large' },
      { color: 'blue', size: 'small' },
    )
    expect(result).toEqual({ color: 'blue', size: 'small' })
  })

  it('preserves existing keys not in template', () => {
    const result = mergeProperties({}, { custom: 'value' })
    expect(result).toEqual({ custom: 'value' })
  })

  it('handles mixed — some filled, some preserved', () => {
    const result = mergeProperties(
      { a: 'template-a', b: 'template-b', c: 'template-c' },
      { a: 'existing-a', b: '', c: null },
    )
    expect(result).toEqual({
      a: 'existing-a',
      b: 'template-b',
      c: 'template-c',
    })
  })

  it('preserves falsy but non-empty values (0, false)', () => {
    const result = mergeProperties(
      { count: 99, active: true },
      { count: 0, active: false },
    )
    expect(result).toEqual({ count: 0, active: false })
  })
})
