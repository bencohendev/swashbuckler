import { describe, it, expect } from 'vitest'
import { sortObjects, DEFAULT_SORT, type SortConfig } from '@/features/table-view/lib/sortObjects'
import { createMockObject } from '../../fixtures/objects'
import { createMockTag } from '../../fixtures/tags'
import type { FieldDefinition, Tag } from '@/shared/lib/data'

const DATE_FIELD_ID = 'a1a1a1a1-1111-4111-b111-111111111111'
const NUMBER_FIELD_ID = 'b2b2b2b2-2222-4222-b222-222222222222'
const TEXT_FIELD_ID = 'c3c3c3c3-3333-4333-b333-333333333333'
const CHECKBOX_FIELD_ID = 'd4d4d4d4-4444-4444-b444-444444444444'
const SELECT_FIELD_ID = 'e5e5e5e5-5555-4555-b555-555555555555'

const fields: FieldDefinition[] = [
  { id: DATE_FIELD_ID, name: 'Due', type: 'date', sort_order: 0 },
  { id: NUMBER_FIELD_ID, name: 'Score', type: 'number', sort_order: 1 },
  { id: TEXT_FIELD_ID, name: 'Notes', type: 'text', sort_order: 2 },
  { id: CHECKBOX_FIELD_ID, name: 'Done', type: 'checkbox', sort_order: 3 },
  { id: SELECT_FIELD_ID, name: 'Status', type: 'select', sort_order: 4, options: ['Active', 'Done'] },
]

const obj1 = createMockObject({
  title: 'Alpha',
  updated_at: '2025-01-01T00:00:00Z',
  created_at: '2024-12-01T00:00:00Z',
  properties: {
    [DATE_FIELD_ID]: '2025-06-15',
    [NUMBER_FIELD_ID]: 85,
    [TEXT_FIELD_ID]: 'First note',
    [CHECKBOX_FIELD_ID]: true,
    [SELECT_FIELD_ID]: 'Done',
  },
})

const obj2 = createMockObject({
  title: 'Charlie',
  updated_at: '2025-03-01T00:00:00Z',
  created_at: '2024-11-01T00:00:00Z',
  properties: {
    [DATE_FIELD_ID]: '2025-03-01',
    [NUMBER_FIELD_ID]: 42,
    [TEXT_FIELD_ID]: 'Second note',
    [CHECKBOX_FIELD_ID]: false,
    [SELECT_FIELD_ID]: 'Active',
  },
})

const obj3 = createMockObject({
  title: 'Bravo',
  updated_at: '2025-02-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  properties: {
    [DATE_FIELD_ID]: '2025-09-30',
    [NUMBER_FIELD_ID]: 10,
    [TEXT_FIELD_ID]: 'Third note',
    [CHECKBOX_FIELD_ID]: false,
    [SELECT_FIELD_ID]: 'Active',
  },
})

const objects = [obj1, obj2, obj3]

const tag1 = createMockTag({ name: 'Urgent' })
const tag2 = createMockTag({ name: 'Review' })
const tag3 = createMockTag({ name: 'Archive' })

const tagsByObject: Record<string, Tag[]> = {
  [obj1.id]: [tag2],
  [obj2.id]: [tag1, tag3],
  [obj3.id]: [],
}

describe('sortObjects', () => {
  it('sorts by title ascending', () => {
    const sort: SortConfig = { field: 'title', direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts by title descending', () => {
    const sort: SortConfig = { field: 'title', direction: 'desc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('sorts by updated_at descending (default)', () => {
    const result = sortObjects(objects, DEFAULT_SORT, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('sorts by updated_at ascending', () => {
    const sort: SortConfig = { field: 'updated_at', direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts by date field ascending', () => {
    const sort: SortConfig = { field: DATE_FIELD_ID, direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Charlie', 'Alpha', 'Bravo'])
  })

  it('sorts by number field ascending', () => {
    const sort: SortConfig = { field: NUMBER_FIELD_ID, direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('sorts by number field descending', () => {
    const sort: SortConfig = { field: NUMBER_FIELD_ID, direction: 'desc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Alpha', 'Charlie', 'Bravo'])
  })

  it('sorts by text field ascending', () => {
    const sort: SortConfig = { field: TEXT_FIELD_ID, direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result.map((o) => o.title)).toEqual(['Alpha', 'Charlie', 'Bravo'])
  })

  it('sorts by checkbox field ascending (unchecked first)', () => {
    const sort: SortConfig = { field: CHECKBOX_FIELD_ID, direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result[0].properties?.[CHECKBOX_FIELD_ID]).toBe(false)
    expect(result[result.length - 1].properties?.[CHECKBOX_FIELD_ID]).toBe(true)
  })

  it('sorts by select field ascending', () => {
    const sort: SortConfig = { field: SELECT_FIELD_ID, direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result[0].properties?.[SELECT_FIELD_ID]).toBe('Active')
  })

  it('sorts by tags ascending', () => {
    const sort: SortConfig = { field: 'tags', direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    // obj2: "Archive, Urgent", obj1: "Review", obj3: empty (last)
    expect(result[0].title).toBe('Charlie')
    expect(result[1].title).toBe('Alpha')
    expect(result[2].title).toBe('Bravo')
  })

  it('does not mutate the original array', () => {
    const original = [...objects]
    sortObjects(objects, { field: 'title', direction: 'asc' }, fields, tagsByObject)
    expect(objects).toEqual(original)
  })

  it('handles null/undefined field values (sorted to end)', () => {
    const objNull = createMockObject({
      title: 'Null score',
      properties: { [NUMBER_FIELD_ID]: null },
    })
    const sort: SortConfig = { field: NUMBER_FIELD_ID, direction: 'asc' }
    const result = sortObjects([...objects, objNull], sort, fields, tagsByObject)
    expect(result[result.length - 1].title).toBe('Null score')
  })

  it('handles unknown sort field gracefully', () => {
    const sort: SortConfig = { field: 'nonexistent-field', direction: 'asc' }
    const result = sortObjects(objects, sort, fields, tagsByObject)
    expect(result).toHaveLength(3)
  })
})
