import { describe, it, expect } from 'vitest'
import { objectSchema, createObjectSchema } from '@/shared/lib/data/types'

// Valid RFC4122 UUIDs (Zod 4 requires proper version/variant nibbles)
const PAGE_TYPE_ID = '7a9e3a69-dbcb-466d-8a5c-391ca99b9ba4'
const NOTE_TYPE_ID = '4a89731b-f05a-4748-8f0e-4ee4dd76615b'
const SPACE_ID = '99b075ae-465d-4843-a324-cc3d48a80d6e'

describe('Data Validation Schemas', () => {
  describe('objectSchema', () => {
    const validObject = {
      id: '94679fd3-108a-4cbb-892b-aa3366b20061',
      title: 'Test Object',
      type_id: PAGE_TYPE_ID,
      owner_id: null,
      space_id: SPACE_ID,
      parent_id: null,
      icon: '📄',
      cover_image: null,
      properties: {},
      content: null,
      is_deleted: false,
      deleted_at: null,
      is_archived: false,
      archived_at: null,
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

    it('rejects invalid type_id', () => {
      const result = objectSchema.safeParse({ ...validObject, type_id: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('allows page type_id', () => {
      const result = objectSchema.safeParse({ ...validObject, type_id: PAGE_TYPE_ID })
      expect(result.success).toBe(true)
    })

    it('allows note type_id', () => {
      const result = objectSchema.safeParse({ ...validObject, type_id: NOTE_TYPE_ID })
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
        type_id: PAGE_TYPE_ID,
      })
      expect(result.success).toBe(true)
    })

    it('allows optional fields', () => {
      const result = createObjectSchema.safeParse({
        title: 'New Page',
        type_id: PAGE_TYPE_ID,
        icon: '🎉',
        properties: { status: 'draft' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing title', () => {
      const result = createObjectSchema.safeParse({
        type_id: PAGE_TYPE_ID,
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing type_id', () => {
      const result = createObjectSchema.safeParse({
        title: 'New Page',
      })
      expect(result.success).toBe(false)
    })
  })
})
