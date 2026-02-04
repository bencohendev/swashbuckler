import { describe, it, expect } from 'vitest'
import { objectSchema, createObjectSchema } from '@/shared/lib/data/types'

describe('Data Validation Schemas', () => {
  describe('objectSchema', () => {
    const validObject = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Object',
      type: 'page',
      owner_id: '123e4567-e89b-12d3-a456-426614174001',
      parent_id: null,
      icon: '📄',
      cover_image: null,
      properties: {},
      content: null,
      is_template: false,
      is_deleted: false,
      deleted_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('validates a valid object', () => {
      const result = objectSchema.safeParse(validObject)
      expect(result.success).toBe(true)
    })

    it('rejects invalid UUID for id', () => {
      const result = objectSchema.safeParse({ ...validObject, id: 'not-a-uuid' })
      expect(result.success).toBe(false)
    })

    it('rejects empty title', () => {
      const result = objectSchema.safeParse({ ...validObject, title: '' })
      expect(result.success).toBe(false)
    })

    it('rejects title over 255 characters', () => {
      const result = objectSchema.safeParse({ ...validObject, title: 'a'.repeat(256) })
      expect(result.success).toBe(false)
    })

    it('rejects invalid type', () => {
      const result = objectSchema.safeParse({ ...validObject, type: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('allows page type', () => {
      const result = objectSchema.safeParse({ ...validObject, type: 'page' })
      expect(result.success).toBe(true)
    })

    it('allows note type', () => {
      const result = objectSchema.safeParse({ ...validObject, type: 'note' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid cover_image URL', () => {
      const result = objectSchema.safeParse({ ...validObject, cover_image: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('allows valid cover_image URL', () => {
      const result = objectSchema.safeParse({
        ...validObject,
        cover_image: 'https://example.com/image.jpg',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createObjectSchema', () => {
    it('validates minimal create input', () => {
      const result = createObjectSchema.safeParse({
        title: 'New Page',
        type: 'page',
      })
      expect(result.success).toBe(true)
    })

    it('allows optional fields', () => {
      const result = createObjectSchema.safeParse({
        title: 'New Page',
        type: 'page',
        icon: '🎉',
        properties: { status: 'draft' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing title', () => {
      const result = createObjectSchema.safeParse({
        type: 'page',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing type', () => {
      const result = createObjectSchema.safeParse({
        title: 'New Page',
      })
      expect(result.success).toBe(false)
    })
  })
})
