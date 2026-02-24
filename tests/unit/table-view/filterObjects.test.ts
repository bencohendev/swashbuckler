import { describe, it, expect } from 'vitest'
import {
  filterObjects,
  isFiltered,
  EMPTY_FILTERS,
  type TypePageFilters,
} from '@/features/table-view/lib/filterObjects'
import { createMockObject } from '../../fixtures/objects'
import { createMockTag } from '../../fixtures/tags'

describe('isFiltered', () => {
  it('returns false for EMPTY_FILTERS', () => {
    expect(isFiltered(EMPTY_FILTERS)).toBe(false)
  })

  it('returns true when search is set', () => {
    expect(isFiltered({ ...EMPTY_FILTERS, search: 'hello' })).toBe(true)
  })

  it('returns false for whitespace-only search', () => {
    expect(isFiltered({ ...EMPTY_FILTERS, search: '   ' })).toBe(false)
  })

  it('returns true when a select filter is set', () => {
    expect(
      isFiltered({
        ...EMPTY_FILTERS,
        selectFilters: { status: new Set(['active']) },
      })
    ).toBe(true)
  })

  it('returns false for empty select filter sets', () => {
    expect(
      isFiltered({
        ...EMPTY_FILTERS,
        selectFilters: { status: new Set() },
      })
    ).toBe(false)
  })

  it('returns true when a checkbox filter is set', () => {
    expect(
      isFiltered({
        ...EMPTY_FILTERS,
        checkboxFilters: { done: true },
      })
    ).toBe(true)
  })

  it('returns false when checkbox filter is undefined', () => {
    expect(
      isFiltered({
        ...EMPTY_FILTERS,
        checkboxFilters: { done: undefined },
      })
    ).toBe(false)
  })

  it('returns true when tag filter is set', () => {
    expect(
      isFiltered({
        ...EMPTY_FILTERS,
        tagFilter: new Set(['tag-1']),
      })
    ).toBe(true)
  })
})

describe('filterObjects', () => {
  const obj1 = createMockObject({ title: 'Meeting Notes', properties: { status: 'active', priority: 'high', done: true, category: ['work', 'urgent'] } })
  const obj2 = createMockObject({ title: 'Shopping List', properties: { status: 'draft', priority: 'low', done: false, category: ['personal'] } })
  const obj3 = createMockObject({ title: 'Project Plan', properties: { status: 'active', priority: 'medium', done: false, category: ['work'] } })
  const objects = [obj1, obj2, obj3]

  const tag1 = createMockTag({ name: 'important' })
  const tag2 = createMockTag({ name: 'review' })

  const tagsByObject: Record<string, typeof tag1[]> = {
    [obj1.id]: [tag1, tag2],
    [obj2.id]: [tag2],
    [obj3.id]: [],
  }

  it('returns all objects when no filters are active', () => {
    const result = filterObjects(objects, EMPTY_FILTERS, {})
    expect(result).toBe(objects) // same reference
  })

  it('filters by title search (case-insensitive)', () => {
    const filters: TypePageFilters = { ...EMPTY_FILTERS, search: 'meeting' }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('search is case-insensitive', () => {
    const filters: TypePageFilters = { ...EMPTY_FILTERS, search: 'SHOPPING' }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Shopping List')
  })

  it('search matches partial titles', () => {
    const filters: TypePageFilters = { ...EMPTY_FILTERS, search: 'plan' }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Project Plan')
  })

  it('filters by select field', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: { status: new Set(['active']) },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.title).sort()).toEqual(['Meeting Notes', 'Project Plan'])
  })

  it('filters by select field with multiple allowed values', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: { priority: new Set(['high', 'low']) },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.title).sort()).toEqual(['Meeting Notes', 'Shopping List'])
  })

  it('filters by multi_select field (at least one match)', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: { category: new Set(['urgent']) },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('multi_select matches any value in the array', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: { category: new Set(['personal']) },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Shopping List')
  })

  it('filters by checkbox true', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      checkboxFilters: { done: true },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('filters by checkbox false', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      checkboxFilters: { done: false },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.title).sort()).toEqual(['Project Plan', 'Shopping List'])
  })

  it('checkbox undefined means any value', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      checkboxFilters: { done: undefined },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toBe(objects) // no filter active
  })

  it('filters by tags', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      tagFilter: new Set([tag1.id]),
    }
    const result = filterObjects(objects, filters, tagsByObject)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('tag filter matches if any tag matches', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      tagFilter: new Set([tag2.id]),
    }
    const result = filterObjects(objects, filters, tagsByObject)
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.title).sort()).toEqual(['Meeting Notes', 'Shopping List'])
  })

  it('excludes objects with no tags when tag filter is set', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      tagFilter: new Set([tag1.id]),
    }
    const result = filterObjects(objects, filters, tagsByObject)
    expect(result.find((o) => o.id === obj3.id)).toBeUndefined()
  })

  it('combines filters with AND logic', () => {
    const filters: TypePageFilters = {
      search: 'meeting',
      selectFilters: { status: new Set(['active']) },
      checkboxFilters: { done: true },
      tagFilter: new Set([tag1.id]),
    }
    const result = filterObjects(objects, filters, tagsByObject)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('AND logic excludes when any filter fails', () => {
    const filters: TypePageFilters = {
      search: 'shopping',
      selectFilters: { status: new Set(['active']) },
      checkboxFilters: {},
      tagFilter: new Set(),
    }
    // Shopping List has status 'draft', not 'active'
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(0)
  })

  it('handles objects with missing properties', () => {
    const objNoProps = createMockObject({ title: 'Bare Object', properties: {} })
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: { status: new Set(['active']) },
    }
    const result = filterObjects([objNoProps], filters, {})
    expect(result).toHaveLength(0)
  })

  it('handles objects with null properties', () => {
    const objNullProps = createMockObject({ title: 'Null Props', properties: { status: null } })
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: { status: new Set(['active']) },
    }
    const result = filterObjects([objNullProps], filters, {})
    expect(result).toHaveLength(0)
  })

  it('handles empty select filter options (ignored)', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: { status: new Set() },
    }
    const result = filterObjects(objects, filters, {})
    expect(result).toBe(objects) // no filter active
  })

  it('handles objects missing from tagsByObject', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      tagFilter: new Set([tag1.id]),
    }
    // empty tagsByObject — no object has tags
    const result = filterObjects(objects, filters, {})
    expect(result).toHaveLength(0)
  })
})
