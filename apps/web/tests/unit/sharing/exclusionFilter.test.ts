import { describe, it, expect } from 'vitest'
import type { ObjectType, DataObject, FieldDefinition, ShareExclusion } from '@/shared/lib/data/types'

// Pure logic tests for the exclusion filter patterns used in useExclusionFilter.
// We test the filter logic directly rather than the hook, since the hook
// depends on 3 React contexts (DataClient, Auth, CurrentSpace).

const UUID1 = '7a9e3a69-dbcb-466d-8a5c-391ca99b9ba4'
const UUID2 = '4a89731b-f05a-4748-8f0e-4ee4dd76615b'
const UUID3 = '99b075ae-465d-4843-a324-cc3d48a80d6e'
const SPACE_ID = 'aaaa1111-2222-3333-4444-555566667777'
const NOW = '2024-01-01T00:00:00Z'

// Replicate the filter logic from useExclusionFilter
function buildExclusionSets(exclusions: ShareExclusion[]) {
  const excludedTypeIds = new Set(
    exclusions
      .filter(e => e.excluded_type_id && !e.excluded_field && !e.excluded_object_id)
      .map(e => e.excluded_type_id),
  )

  const excludedObjectIds = new Set(
    exclusions
      .filter(e => e.excluded_object_id)
      .map(e => e.excluded_object_id),
  )

  return { excludedTypeIds, excludedObjectIds }
}

function filterTypes(types: ObjectType[], excludedTypeIds: Set<string | null>): ObjectType[] {
  return types.filter(t => !excludedTypeIds.has(t.id))
}

function filterObjects(objects: DataObject[], excludedTypeIds: Set<string | null>, excludedObjectIds: Set<string | null>): DataObject[] {
  return objects.filter(o => !excludedTypeIds.has(o.type_id) && !excludedObjectIds.has(o.id))
}

function isFieldExcluded(exclusions: ShareExclusion[], typeId: string, fieldId: string): boolean {
  return exclusions.some(
    e => e.excluded_type_id === typeId && e.excluded_field === fieldId,
  )
}

function filterFields(exclusions: ShareExclusion[], typeId: string, fields: FieldDefinition[]): FieldDefinition[] {
  return fields.filter(f => !isFieldExcluded(exclusions, typeId, f.id))
}

function filterProperties(
  exclusions: ShareExclusion[],
  typeId: string,
  properties: Record<string, unknown>,
  fields: FieldDefinition[],
): Record<string, unknown> {
  const allowedFields = filterFields(exclusions, typeId, fields)
  const allowedIds = new Set(allowedFields.map(f => f.id))
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (allowedIds.has(key)) {
      filtered[key] = value
    }
  }
  return filtered
}

const makeType = (id: string, name: string): ObjectType => ({
  id,
  name,
  plural_name: `${name}s`,
  slug: name.toLowerCase(),
  icon: 'file',
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
})

const makeObject = (id: string, typeId: string, title: string): DataObject => ({
  id,
  title,
  type_id: typeId,
  owner_id: null,
  space_id: SPACE_ID,
  parent_id: null,
  icon: null,
  cover_image: null,
  properties: {},
  content: null,
  is_deleted: false,
  deleted_at: null,
  is_archived: false,
  archived_at: null,
  created_at: NOW,
  updated_at: NOW,
})

const makeExclusion = (overrides: Partial<ShareExclusion>): ShareExclusion => ({
  id: crypto.randomUUID(),
  space_share_id: UUID1,
  space_id: null,
  excluded_type_id: null,
  excluded_object_id: null,
  excluded_field: null,
  created_at: NOW,
  ...overrides,
})

describe('exclusion filter logic', () => {
  describe('with no exclusions', () => {
    it('all types pass through', () => {
      const types = [makeType(UUID1, 'Page'), makeType(UUID2, 'Note')]
      const { excludedTypeIds } = buildExclusionSets([])
      expect(filterTypes(types, excludedTypeIds)).toEqual(types)
    })

    it('all objects pass through', () => {
      const objects = [makeObject(UUID1, UUID2, 'Object 1')]
      const { excludedTypeIds, excludedObjectIds } = buildExclusionSets([])
      expect(filterObjects(objects, excludedTypeIds, excludedObjectIds)).toEqual(objects)
    })
  })

  describe('type exclusion', () => {
    it('removes excluded type', () => {
      const types = [makeType(UUID1, 'Page'), makeType(UUID2, 'Note')]
      const exclusions = [makeExclusion({ excluded_type_id: UUID1 })]
      const { excludedTypeIds } = buildExclusionSets(exclusions)

      const result = filterTypes(types, excludedTypeIds)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Note')
    })

    it('also removes objects of excluded type', () => {
      const objects = [
        makeObject('obj-1', UUID1, 'Page Object'),
        makeObject('obj-2', UUID2, 'Note Object'),
      ]
      const exclusions = [makeExclusion({ excluded_type_id: UUID1 })]
      const { excludedTypeIds, excludedObjectIds } = buildExclusionSets(exclusions)

      const result = filterObjects(objects, excludedTypeIds, excludedObjectIds)
      expect(result.length).toBe(1)
      expect(result[0].title).toBe('Note Object')
    })
  })

  describe('object exclusion', () => {
    it('removes excluded object', () => {
      const objects = [
        makeObject(UUID1, UUID3, 'Object A'),
        makeObject(UUID2, UUID3, 'Object B'),
      ]
      const exclusions = [makeExclusion({ excluded_object_id: UUID1 })]
      const { excludedTypeIds, excludedObjectIds } = buildExclusionSets(exclusions)

      const result = filterObjects(objects, excludedTypeIds, excludedObjectIds)
      expect(result.length).toBe(1)
      expect(result[0].title).toBe('Object B')
    })
  })

  describe('field exclusion', () => {
    const fields: FieldDefinition[] = [
      { id: 'field-1', name: 'Status', type: 'select', sort_order: 0 },
      { id: 'field-2', name: 'Priority', type: 'select', sort_order: 1 },
      { id: 'field-3', name: 'Notes', type: 'text', sort_order: 2 },
    ]

    it('isFieldExcluded returns true for excluded field', () => {
      const exclusions = [makeExclusion({ excluded_type_id: UUID1, excluded_field: 'field-1' })]
      expect(isFieldExcluded(exclusions, UUID1, 'field-1')).toBe(true)
    })

    it('isFieldExcluded returns false for non-excluded field', () => {
      const exclusions = [makeExclusion({ excluded_type_id: UUID1, excluded_field: 'field-1' })]
      expect(isFieldExcluded(exclusions, UUID1, 'field-2')).toBe(false)
    })

    it('filterFields removes excluded fields', () => {
      const exclusions = [makeExclusion({ excluded_type_id: UUID1, excluded_field: 'field-2' })]
      const result = filterFields(exclusions, UUID1, fields)
      expect(result.length).toBe(2)
      expect(result.map(f => f.id)).toEqual(['field-1', 'field-3'])
    })

    it('filterProperties strips properties of excluded fields', () => {
      const exclusions = [makeExclusion({ excluded_type_id: UUID1, excluded_field: 'field-2' })]
      const properties = { 'field-1': 'active', 'field-2': 'high', 'field-3': 'some notes' }
      const result = filterProperties(exclusions, UUID1, properties, fields)
      expect(result).toEqual({ 'field-1': 'active', 'field-3': 'some notes' })
    })
  })

  describe('combined exclusions', () => {
    it('type and object exclusions work together', () => {
      const objects = [
        makeObject('obj-1', UUID1, 'Page 1'),
        makeObject('obj-2', UUID1, 'Page 2'),
        makeObject('obj-3', UUID2, 'Note 1'),
        makeObject('obj-4', UUID2, 'Note 2'),
      ]
      const exclusions = [
        makeExclusion({ excluded_type_id: UUID1 }),          // exclude all Pages
        makeExclusion({ excluded_object_id: 'obj-4' }),      // exclude specific Note
      ]
      const { excludedTypeIds, excludedObjectIds } = buildExclusionSets(exclusions)

      const result = filterObjects(objects, excludedTypeIds, excludedObjectIds)
      expect(result.length).toBe(1)
      expect(result[0].title).toBe('Note 1')
    })
  })
})
