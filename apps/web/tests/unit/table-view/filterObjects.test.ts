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
      ...EMPTY_FILTERS,
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
      ...EMPTY_FILTERS,
      search: 'shopping',
      selectFilters: { status: new Set(['active']) },
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

describe('filterObjects — date filters', () => {
  const DUE_FIELD = 'due-date-field'
  const objA = createMockObject({ title: 'Early', properties: { [DUE_FIELD]: '2025-03-01' } })
  const objB = createMockObject({ title: 'Middle', properties: { [DUE_FIELD]: '2025-06-15' } })
  const objC = createMockObject({ title: 'Late', properties: { [DUE_FIELD]: '2025-09-30' } })
  const objEmpty = createMockObject({ title: 'No date', properties: {} })
  const dateObjects = [objA, objB, objC, objEmpty]

  it('filters by "from" date only', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      dateFilters: { [DUE_FIELD]: { from: '2025-06-01' } },
    }
    const result = filterObjects(dateObjects, filters, {})
    expect(result.map((o) => o.title).sort()).toEqual(['Late', 'Middle'])
  })

  it('filters by "to" date only', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      dateFilters: { [DUE_FIELD]: { to: '2025-06-15' } },
    }
    const result = filterObjects(dateObjects, filters, {})
    expect(result.map((o) => o.title).sort()).toEqual(['Early', 'Middle'])
  })

  it('filters by date range (from + to)', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      dateFilters: { [DUE_FIELD]: { from: '2025-04-01', to: '2025-07-01' } },
    }
    const result = filterObjects(dateObjects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Middle')
  })

  it('excludes objects with no date value', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      dateFilters: { [DUE_FIELD]: { from: '2025-01-01' } },
    }
    const result = filterObjects(dateObjects, filters, {})
    expect(result.find((o) => o.title === 'No date')).toBeUndefined()
  })
})

describe('filterObjects — number filters', () => {
  const SCORE_FIELD = 'score-field'
  const objA = createMockObject({ title: 'Low', properties: { [SCORE_FIELD]: 10 } })
  const objB = createMockObject({ title: 'Mid', properties: { [SCORE_FIELD]: 50 } })
  const objC = createMockObject({ title: 'High', properties: { [SCORE_FIELD]: 95 } })
  const objEmpty = createMockObject({ title: 'No score', properties: {} })
  const numObjects = [objA, objB, objC, objEmpty]

  it('filters by "min" only', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      numberFilters: { [SCORE_FIELD]: { min: 50 } },
    }
    const result = filterObjects(numObjects, filters, {})
    expect(result.map((o) => o.title).sort()).toEqual(['High', 'Mid'])
  })

  it('filters by "max" only', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      numberFilters: { [SCORE_FIELD]: { max: 50 } },
    }
    const result = filterObjects(numObjects, filters, {})
    expect(result.map((o) => o.title).sort()).toEqual(['Low', 'Mid'])
  })

  it('filters by number range (min + max)', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      numberFilters: { [SCORE_FIELD]: { min: 20, max: 60 } },
    }
    const result = filterObjects(numObjects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Mid')
  })

  it('excludes objects with no number value', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      numberFilters: { [SCORE_FIELD]: { min: 0 } },
    }
    const result = filterObjects(numObjects, filters, {})
    expect(result.find((o) => o.title === 'No score')).toBeUndefined()
  })
})

describe('filterObjects — text filters', () => {
  const NOTES_FIELD = 'notes-field'
  const URL_FIELD = 'url-field'
  const objA = createMockObject({ title: 'A', properties: { [NOTES_FIELD]: 'Main project for Q3', [URL_FIELD]: 'https://example.com/dash' } })
  const objB = createMockObject({ title: 'B', properties: { [NOTES_FIELD]: 'Resolved quickly', [URL_FIELD]: 'https://github.com/issues' } })
  const objEmpty = createMockObject({ title: 'C', properties: {} })
  const textObjects = [objA, objB, objEmpty]

  it('filters by text field (case-insensitive)', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      textFilters: { [NOTES_FIELD]: 'PROJECT' },
    }
    const result = filterObjects(textObjects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('A')
  })

  it('filters by URL field (case-insensitive substring)', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      textFilters: { [URL_FIELD]: 'github' },
    }
    const result = filterObjects(textObjects, filters, {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('B')
  })

  it('excludes objects with empty text value', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      textFilters: { [NOTES_FIELD]: 'anything' },
    }
    const result = filterObjects(textObjects, filters, {})
    expect(result.find((o) => o.title === 'C')).toBeUndefined()
  })
})

describe('isFiltered — new filter types', () => {
  it('returns true when dateFilters have from', () => {
    expect(
      isFiltered({ ...EMPTY_FILTERS, dateFilters: { f: { from: '2025-01-01' } } })
    ).toBe(true)
  })

  it('returns true when numberFilters have min', () => {
    expect(
      isFiltered({ ...EMPTY_FILTERS, numberFilters: { f: { min: 5 } } })
    ).toBe(true)
  })

  it('returns true when textFilters have value', () => {
    expect(
      isFiltered({ ...EMPTY_FILTERS, textFilters: { f: 'query' } })
    ).toBe(true)
  })

  it('returns false for empty new filter fields', () => {
    expect(
      isFiltered({
        ...EMPTY_FILTERS,
        dateFilters: { f: {} },
        numberFilters: { f: {} },
        textFilters: { f: '' },
      })
    ).toBe(false)
  })
})
