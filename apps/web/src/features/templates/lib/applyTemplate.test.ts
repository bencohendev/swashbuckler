import { describe, it, expect } from 'vitest'
import type { Value } from '@udecode/plate'
import { applyTemplateContent, mergeProperties } from './applyTemplate'

describe('applyTemplateContent', () => {
  const templateContent: Value = [
    { type: 'p', children: [{ text: 'Template paragraph' }] },
  ]
  const existingContent: Value = [
    { type: 'p', children: [{ text: 'Existing paragraph' }] },
  ]

  it('replace mode returns template content', () => {
    const result = applyTemplateContent(templateContent, existingContent, 'replace')
    expect(result).toHaveLength(1)
    expect((result[0] as Record<string, unknown>).type).toBe('p')
    expect(((result[0] as Record<string, unknown>).children as Array<{ text: string }>)[0].text).toBe('Template paragraph')
  })

  it('replace mode returns empty paragraph when template is null', () => {
    const result = applyTemplateContent(null, existingContent, 'replace')
    expect(result).toHaveLength(1)
    expect((result[0] as Record<string, unknown>).type).toBe('p')
  })

  it('prepend mode puts template before existing', () => {
    const result = applyTemplateContent(templateContent, existingContent, 'prepend')
    expect(result).toHaveLength(2)
    expect(((result[0] as Record<string, unknown>).children as Array<{ text: string }>)[0].text).toBe('Template paragraph')
    expect(((result[1] as Record<string, unknown>).children as Array<{ text: string }>)[0].text).toBe('Existing paragraph')
  })

  it('prepend mode returns existing when template is null', () => {
    const result = applyTemplateContent(null, existingContent, 'prepend')
    expect(result).toHaveLength(1)
    expect(((result[0] as Record<string, unknown>).children as Array<{ text: string }>)[0].text).toBe('Existing paragraph')
  })

  it('prepend mode returns template when existing is null', () => {
    const result = applyTemplateContent(templateContent, null, 'prepend')
    expect(result).toHaveLength(1)
    expect(((result[0] as Record<string, unknown>).children as Array<{ text: string }>)[0].text).toBe('Template paragraph')
  })

  it('both null returns empty paragraph', () => {
    const result = applyTemplateContent(null, null, 'replace')
    expect(result).toHaveLength(1)
    expect((result[0] as Record<string, unknown>).type).toBe('p')

    const result2 = applyTemplateContent(null, null, 'prepend')
    expect(result2).toHaveLength(1)
  })

  it('replace mode deep-clones template content', () => {
    const result = applyTemplateContent(templateContent, null, 'replace')
    expect(result).not.toBe(templateContent)
  })
})

describe('mergeProperties', () => {
  it('fills empty fields from template', () => {
    const result = mergeProperties(
      { color: 'red', size: 'large' },
      { color: 'blue' }
    )
    expect(result).toEqual({ color: 'blue', size: 'large' })
  })

  it('does not overwrite existing values', () => {
    const result = mergeProperties(
      { name: 'template' },
      { name: 'existing' }
    )
    expect(result.name).toBe('existing')
  })

  it('fills null and empty-string fields', () => {
    const result = mergeProperties(
      { a: 'from-template', b: 'from-template' },
      { a: null, b: '' }
    )
    expect(result.a).toBe('from-template')
    expect(result.b).toBe('from-template')
  })

  it('preserves fields not in template', () => {
    const result = mergeProperties(
      { x: 1 },
      { x: 2, y: 3 }
    )
    expect(result).toEqual({ x: 2, y: 3 })
  })
})
