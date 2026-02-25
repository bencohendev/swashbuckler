import { describe, it, expect } from 'vitest'
import {
  spaceSchema,
  objectTypeSchema,
  fieldDefinitionSchema,
  templateSchema,
  objectRelationSchema,
  tagSchema,
  objectTagSchema,
  pinSchema,
  spaceShareSchema,
  shareExclusionSchema,
} from '@/shared/lib/data/types'

// Valid RFC4122 UUIDs
const UUID1 = '7a9e3a69-dbcb-466d-8a5c-391ca99b9ba4'
const UUID2 = '4a89731b-f05a-4748-8f0e-4ee4dd76615b'
const SPACE_ID = '99b075ae-465d-4843-a324-cc3d48a80d6e'
const NOW = '2024-01-01T00:00:00Z'

describe('Schema Validation (additional schemas)', () => {
  describe('spaceSchema', () => {
    const validSpace = {
      id: UUID1,
      name: 'My Space',
      icon: '📁',
      owner_id: UUID2,
      is_archived: false,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
    }

    it('validates a valid space', () => {
      expect(spaceSchema.safeParse(validSpace).success).toBe(true)
    })

    it('rejects empty name', () => {
      expect(spaceSchema.safeParse({ ...validSpace, name: '' }).success).toBe(false)
    })

    it('rejects name over 100 characters', () => {
      expect(spaceSchema.safeParse({ ...validSpace, name: 'a'.repeat(101) }).success).toBe(false)
    })

    it('rejects invalid UUID for id', () => {
      expect(spaceSchema.safeParse({ ...validSpace, id: 'not-uuid' }).success).toBe(false)
    })

    it('rejects invalid owner_id', () => {
      expect(spaceSchema.safeParse({ ...validSpace, owner_id: 'bad' }).success).toBe(false)
    })
  })

  describe('fieldDefinitionSchema', () => {
    const validField = {
      id: UUID1,
      name: 'Status',
      type: 'select',
      sort_order: 0,
    }

    it('validates a valid field definition', () => {
      expect(fieldDefinitionSchema.safeParse(validField).success).toBe(true)
    })

    it('allows all field types', () => {
      const types = ['text', 'number', 'date', 'checkbox', 'select', 'multi_select', 'url']
      for (const type of types) {
        expect(fieldDefinitionSchema.safeParse({ ...validField, type }).success).toBe(true)
      }
    })

    it('rejects invalid field type', () => {
      expect(fieldDefinitionSchema.safeParse({ ...validField, type: 'invalid' }).success).toBe(false)
    })

    it('rejects empty name', () => {
      expect(fieldDefinitionSchema.safeParse({ ...validField, name: '' }).success).toBe(false)
    })

    it('allows optional fields (required, default_value, options)', () => {
      const withOptionals = {
        ...validField,
        required: true,
        default_value: 'draft',
        options: ['draft', 'published'],
      }
      expect(fieldDefinitionSchema.safeParse(withOptionals).success).toBe(true)
    })
  })

  describe('objectTypeSchema', () => {
    const validObjectType = {
      id: UUID1,
      name: 'Task',
      plural_name: 'Tasks',
      slug: 'task',
      icon: 'check-square',
      color: null,
      fields: [],
      is_built_in: false,
      owner_id: null,
      space_id: SPACE_ID,
      sort_order: 0,
      is_archived: false,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
    }

    it('validates a valid object type', () => {
      expect(objectTypeSchema.safeParse(validObjectType).success).toBe(true)
    })

    it('rejects empty name', () => {
      expect(objectTypeSchema.safeParse({ ...validObjectType, name: '' }).success).toBe(false)
    })

    it('rejects name over 100 characters', () => {
      expect(objectTypeSchema.safeParse({ ...validObjectType, name: 'a'.repeat(101) }).success).toBe(false)
    })

    it('allows fields with valid field definitions', () => {
      const withFields = {
        ...validObjectType,
        fields: [{ id: UUID2, name: 'Status', type: 'select', sort_order: 0 }],
      }
      expect(objectTypeSchema.safeParse(withFields).success).toBe(true)
    })

    it('rejects invalid fields', () => {
      const withBadField = {
        ...validObjectType,
        fields: [{ id: 'bad', name: '', type: 'invalid', sort_order: 'x' }],
      }
      expect(objectTypeSchema.safeParse(withBadField).success).toBe(false)
    })
  })

  describe('templateSchema', () => {
    const validTemplate = {
      id: UUID1,
      name: 'Meeting Template',
      type_id: UUID2,
      icon: null,
      cover_image: null,
      owner_id: null,
      space_id: SPACE_ID,
      properties: {},
      content: null,
      created_at: NOW,
      updated_at: NOW,
    }

    it('validates a valid template', () => {
      expect(templateSchema.safeParse(validTemplate).success).toBe(true)
    })

    it('rejects empty name', () => {
      expect(templateSchema.safeParse({ ...validTemplate, name: '' }).success).toBe(false)
    })

    it('rejects invalid type_id', () => {
      expect(templateSchema.safeParse({ ...validTemplate, type_id: 'bad' }).success).toBe(false)
    })
  })

  describe('objectRelationSchema', () => {
    const validRelation = {
      id: UUID1,
      source_id: UUID2,
      target_id: SPACE_ID,
      relation_type: 'mention',
      source_property: null,
      context: null,
      created_at: NOW,
    }

    it('validates a valid relation', () => {
      expect(objectRelationSchema.safeParse(validRelation).success).toBe(true)
    })

    it('rejects invalid source_id', () => {
      expect(objectRelationSchema.safeParse({ ...validRelation, source_id: 'bad' }).success).toBe(false)
    })

    it('rejects invalid target_id', () => {
      expect(objectRelationSchema.safeParse({ ...validRelation, target_id: 'bad' }).success).toBe(false)
    })
  })

  describe('tagSchema', () => {
    const validTag = {
      id: UUID1,
      space_id: SPACE_ID,
      name: 'important',
      color: '#ff0000',
      created_at: NOW,
      updated_at: NOW,
    }

    it('validates a valid tag', () => {
      expect(tagSchema.safeParse(validTag).success).toBe(true)
    })

    it('rejects empty name', () => {
      expect(tagSchema.safeParse({ ...validTag, name: '' }).success).toBe(false)
    })

    it('rejects name over 100 characters', () => {
      expect(tagSchema.safeParse({ ...validTag, name: 'a'.repeat(101) }).success).toBe(false)
    })

    it('allows null color', () => {
      expect(tagSchema.safeParse({ ...validTag, color: null }).success).toBe(true)
    })
  })

  describe('objectTagSchema', () => {
    const validObjectTag = {
      id: UUID1,
      object_id: UUID2,
      tag_id: SPACE_ID,
      created_at: NOW,
    }

    it('validates a valid object tag', () => {
      expect(objectTagSchema.safeParse(validObjectTag).success).toBe(true)
    })

    it('rejects invalid object_id', () => {
      expect(objectTagSchema.safeParse({ ...validObjectTag, object_id: 'bad' }).success).toBe(false)
    })
  })

  describe('pinSchema', () => {
    const validPin = {
      id: UUID1,
      user_id: null,
      object_id: UUID2,
      created_at: NOW,
    }

    it('validates a valid pin', () => {
      expect(pinSchema.safeParse(validPin).success).toBe(true)
    })

    it('allows null user_id', () => {
      expect(pinSchema.safeParse(validPin).success).toBe(true)
    })

    it('rejects invalid object_id', () => {
      expect(pinSchema.safeParse({ ...validPin, object_id: 'bad' }).success).toBe(false)
    })
  })

  describe('spaceShareSchema', () => {
    const validShare = {
      id: UUID1,
      space_id: SPACE_ID,
      owner_id: UUID2,
      shared_with_id: '5a89731b-f05a-4748-8f0e-4ee4dd76615b',
      shared_with_email: 'user@example.com',
      permission: 'edit',
      created_at: NOW,
      updated_at: NOW,
    }

    it('validates a valid share', () => {
      expect(spaceShareSchema.safeParse(validShare).success).toBe(true)
    })

    it('allows view permission', () => {
      expect(spaceShareSchema.safeParse({ ...validShare, permission: 'view' }).success).toBe(true)
    })

    it('rejects invalid permission', () => {
      expect(spaceShareSchema.safeParse({ ...validShare, permission: 'admin' }).success).toBe(false)
    })
  })

  describe('shareExclusionSchema', () => {
    const validExclusion = {
      id: UUID1,
      space_share_id: UUID2,
      space_id: null,
      excluded_type_id: SPACE_ID,
      excluded_object_id: null,
      excluded_field: null,
      created_at: NOW,
    }

    it('validates a valid exclusion', () => {
      expect(shareExclusionSchema.safeParse(validExclusion).success).toBe(true)
    })

    it('allows all nullable fields to be null', () => {
      const allNull = {
        ...validExclusion,
        space_share_id: null,
        space_id: null,
        excluded_type_id: null,
        excluded_object_id: null,
        excluded_field: null,
      }
      expect(shareExclusionSchema.safeParse(allNull).success).toBe(true)
    })
  })
})
