import { describe, it, expect } from 'vitest'
import {
  filterObjects,
  hasActiveFilters,
  hasContentFilter,
  EMPTY_EXPRESSION,
  type FilterExpression,
  type FilterContext,
} from '@/features/table-view/lib/filterObjects'
import { createMockObject } from '../../fixtures/objects'
import { createMockTag } from '../../fixtures/tags'

function expr(overrides: Partial<FilterExpression> = {}): FilterExpression {
  return { ...EMPTY_EXPRESSION, ...overrides }
}

function withCondition(
  target: import('@/features/table-view/lib/filterTypes').FilterFieldTarget,
  operator: string,
  value: unknown = '',
  value2?: unknown,
): FilterExpression {
  return {
    search: '',
    groups: [{
      id: 'g1',
      conditions: [{
        id: 'c1',
        target,
        operator,
        value,
        value2,
      }],
    }],
  }
}

const EMPTY_CTX: FilterContext = {
  tagsByObject: {},
  relationsByObject: {},
  objectTypeByObjectId: {},
  contentTextByObject: {},
}

describe('hasActiveFilters', () => {
  it('returns false for EMPTY_EXPRESSION', () => {
    expect(hasActiveFilters(EMPTY_EXPRESSION)).toBe(false)
  })

  it('returns true when search is set', () => {
    expect(hasActiveFilters(expr({ search: 'hello' }))).toBe(true)
  })

  it('returns false for whitespace-only search', () => {
    expect(hasActiveFilters(expr({ search: '   ' }))).toBe(false)
  })

  it('returns true when groups have conditions', () => {
    expect(hasActiveFilters(withCondition({ kind: 'title' }, 'contains', 'x'))).toBe(true)
  })

  it('returns false for empty groups', () => {
    expect(hasActiveFilters({ search: '', groups: [{ id: 'g1', conditions: [] }] })).toBe(false)
  })
})

describe('filterObjects — search', () => {
  const obj1 = createMockObject({ title: 'Meeting Notes' })
  const obj2 = createMockObject({ title: 'Shopping List' })
  const obj3 = createMockObject({ title: 'Project Plan' })
  const objects = [obj1, obj2, obj3]

  it('returns all objects when no filters active', () => {
    const result = filterObjects(objects, EMPTY_EXPRESSION, EMPTY_CTX)
    expect(result).toBe(objects)
  })

  it('filters by title search (case-insensitive)', () => {
    const result = filterObjects(objects, expr({ search: 'meeting' }), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('search matches partial titles', () => {
    const result = filterObjects(objects, expr({ search: 'plan' }), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Project Plan')
  })
})

describe('filterObjects — text operators', () => {
  const NOTES_FIELD = crypto.randomUUID()
  const objA = createMockObject({ title: 'A', properties: { [NOTES_FIELD]: 'Main project for Q3' } })
  const objB = createMockObject({ title: 'B', properties: { [NOTES_FIELD]: 'Resolved quickly' } })
  const objEmpty = createMockObject({ title: 'C', properties: {} })
  const objects = [objA, objB, objEmpty]

  it('contains (case-insensitive)', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'contains', 'PROJECT'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('A')
  })

  it('does_not_contain', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'does_not_contain', 'project'), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['B', 'C'])
  })

  it('equals', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'equals', 'Resolved quickly'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('B')
  })

  it('not_equals', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'not_equals', 'Resolved quickly'), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['A', 'C'])
  })

  it('starts_with', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'starts_with', 'main'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('A')
  })

  it('ends_with', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'ends_with', 'Q3'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('A')
  })

  it('is_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('C')
  })

  it('is_not_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: NOTES_FIELD }, 'is_not_empty'), EMPTY_CTX)
    expect(result).toHaveLength(2)
  })
})

describe('filterObjects — title as filterable field', () => {
  const obj1 = createMockObject({ title: 'Apple Pie Recipe' })
  const obj2 = createMockObject({ title: 'Banana Bread' })
  const objects = [obj1, obj2]

  it('title contains', () => {
    const result = filterObjects(objects, withCondition({ kind: 'title' }, 'contains', 'apple'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Apple Pie Recipe')
  })

  it('title starts_with', () => {
    const result = filterObjects(objects, withCondition({ kind: 'title' }, 'starts_with', 'banana'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Banana Bread')
  })

  it('title is_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'title' }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(0)
  })
})

describe('filterObjects — number operators', () => {
  const SCORE = crypto.randomUUID()
  const objA = createMockObject({ title: 'Low', properties: { [SCORE]: 10 } })
  const objB = createMockObject({ title: 'Mid', properties: { [SCORE]: 50 } })
  const objC = createMockObject({ title: 'High', properties: { [SCORE]: 95 } })
  const objEmpty = createMockObject({ title: 'None', properties: {} })
  const objects = [objA, objB, objC, objEmpty]

  it('eq', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'eq', 50), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Mid')
  })

  it('neq', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'neq', 50), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['High', 'Low'])
  })

  it('gt', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'gt', 50), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('High')
  })

  it('lt', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'lt', 50), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Low')
  })

  it('gte', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'gte', 50), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['High', 'Mid'])
  })

  it('lte', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'lte', 50), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['Low', 'Mid'])
  })

  it('is_empty excludes missing values', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('None')
  })

  it('is_not_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: SCORE }, 'is_not_empty'), EMPTY_CTX)
    expect(result).toHaveLength(3)
  })
})

describe('filterObjects — date operators', () => {
  const DUE = crypto.randomUUID()
  const objA = createMockObject({ title: 'Early', properties: { [DUE]: '2025-03-01' } })
  const objB = createMockObject({ title: 'Middle', properties: { [DUE]: '2025-06-15' } })
  const objC = createMockObject({ title: 'Late', properties: { [DUE]: '2025-09-30' } })
  const objEmpty = createMockObject({ title: 'No date', properties: {} })
  const objects = [objA, objB, objC, objEmpty]

  it('is', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is', '2025-06-15'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Middle')
  })

  it('is_before', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is_before', '2025-06-15'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Early')
  })

  it('is_after', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is_after', '2025-06-15'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Late')
  })

  it('is_on_or_before', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is_on_or_before', '2025-06-15'), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['Early', 'Middle'])
  })

  it('is_on_or_after', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is_on_or_after', '2025-06-15'), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['Late', 'Middle'])
  })

  it('is_between', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is_between', '2025-04-01', '2025-07-01'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Middle')
  })

  it('is_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('No date')
  })

  it('is_not_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DUE }, 'is_not_empty'), EMPTY_CTX)
    expect(result).toHaveLength(3)
  })
})

describe('filterObjects — system date fields', () => {
  const objOld = createMockObject({ title: 'Old', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' })
  const objNew = createMockObject({ title: 'New', created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-15T00:00:00Z' })
  const objects = [objOld, objNew]

  it('created_at is_after', () => {
    const result = filterObjects(objects, withCondition({ kind: 'system', field: 'created_at' }, 'is_after', '2025-01-01'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('New')
  })

  it('updated_at is_before', () => {
    const result = filterObjects(objects, withCondition({ kind: 'system', field: 'updated_at' }, 'is_before', '2025-01-01'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Old')
  })

  it('created_at is_between', () => {
    const result = filterObjects(objects, withCondition({ kind: 'system', field: 'created_at' }, 'is_between', '2024-01-01', '2024-12-31'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Old')
  })
})

describe('filterObjects — select operators', () => {
  const STATUS = crypto.randomUUID()
  const objA = createMockObject({ title: 'Active', properties: { [STATUS]: 'active' } })
  const objB = createMockObject({ title: 'Draft', properties: { [STATUS]: 'draft' } })
  const objC = createMockObject({ title: 'Empty', properties: {} })
  const objects = [objA, objB, objC]

  it('is', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: STATUS }, 'is', 'active'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Active')
  })

  it('is_not', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: STATUS }, 'is_not', 'active'), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['Draft', 'Empty'])
  })

  it('is_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: STATUS }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Empty')
  })

  it('is_not_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: STATUS }, 'is_not_empty'), EMPTY_CTX)
    expect(result).toHaveLength(2)
  })
})

describe('filterObjects — multi_select operators', () => {
  const CAT = crypto.randomUUID()
  const objA = createMockObject({ title: 'Both', properties: { [CAT]: ['work', 'urgent'] } })
  const objB = createMockObject({ title: 'Personal', properties: { [CAT]: ['personal'] } })
  const objC = createMockObject({ title: 'None', properties: { [CAT]: [] } })
  const objects = [objA, objB, objC]

  it('contains', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: CAT }, 'contains', 'urgent'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Both')
  })

  it('does_not_contain', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: CAT }, 'does_not_contain', 'urgent'), EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['None', 'Personal'])
  })

  it('is_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: CAT }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('None')
  })

  it('is_not_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: CAT }, 'is_not_empty'), EMPTY_CTX)
    expect(result).toHaveLength(2)
  })
})

describe('filterObjects — checkbox operators', () => {
  const DONE = crypto.randomUUID()
  const objA = createMockObject({ title: 'Checked', properties: { [DONE]: true } })
  const objB = createMockObject({ title: 'Unchecked', properties: { [DONE]: false } })
  const objects = [objA, objB]

  it('is_checked', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DONE }, 'is_checked'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Checked')
  })

  it('is_not_checked', () => {
    const result = filterObjects(objects, withCondition({ kind: 'property', fieldId: DONE }, 'is_not_checked'), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Unchecked')
  })
})

describe('filterObjects — tag operators', () => {
  const obj1 = createMockObject({ title: 'Tagged' })
  const obj2 = createMockObject({ title: 'Other Tag' })
  const obj3 = createMockObject({ title: 'No Tags' })
  const objects = [obj1, obj2, obj3]

  const tag1 = createMockTag({ name: 'important' })
  const tag2 = createMockTag({ name: 'review' })

  const ctx: FilterContext = {
    tagsByObject: {
      [obj1.id]: [tag1, tag2],
      [obj2.id]: [tag2],
      [obj3.id]: [],
    },
    relationsByObject: {},
    objectTypeByObjectId: {},
    contentTextByObject: {},
  }

  it('contains', () => {
    const result = filterObjects(objects, withCondition({ kind: 'tag' }, 'contains', tag1.id), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Tagged')
  })

  it('does_not_contain', () => {
    const result = filterObjects(objects, withCondition({ kind: 'tag' }, 'does_not_contain', tag1.id), ctx)
    expect(result.map((o) => o.title).sort()).toEqual(['No Tags', 'Other Tag'])
  })

  it('is_empty (has no tags)', () => {
    const result = filterObjects(objects, withCondition({ kind: 'tag' }, 'is_empty'), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('No Tags')
  })

  it('is_not_empty (has tags)', () => {
    const result = filterObjects(objects, withCondition({ kind: 'tag' }, 'is_not_empty'), ctx)
    expect(result).toHaveLength(2)
  })
})

describe('filterObjects — relation operators', () => {
  const TYPE_A = crypto.randomUUID()
  const TYPE_B = crypto.randomUUID()
  const obj1 = createMockObject({ title: 'Has Links', type_id: TYPE_A })
  const obj2 = createMockObject({ title: 'Target', type_id: TYPE_B })
  const obj3 = createMockObject({ title: 'No Links', type_id: TYPE_A })
  const objects = [obj1, obj2, obj3]

  const relation = {
    id: crypto.randomUUID(),
    source_id: obj1.id,
    target_id: obj2.id,
    relation_type: 'link',
    source_property: null,
    context: null,
    created_at: new Date().toISOString(),
  }

  const ctx: FilterContext = {
    tagsByObject: {},
    relationsByObject: {
      [obj1.id]: [relation],
      [obj2.id]: [relation],
    },
    objectTypeByObjectId: {
      [obj1.id]: TYPE_A,
      [obj2.id]: TYPE_B,
      [obj3.id]: TYPE_A,
    },
    contentTextByObject: {},
  }

  it('has_links', () => {
    const result = filterObjects(objects, withCondition({ kind: 'relation' }, 'has_links'), ctx)
    expect(result.map((o) => o.title).sort()).toEqual(['Has Links', 'Target'])
  })

  it('has_no_links', () => {
    const result = filterObjects(objects, withCondition({ kind: 'relation' }, 'has_no_links'), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('No Links')
  })

  it('links_to specific object', () => {
    const result = filterObjects(objects, withCondition({ kind: 'relation' }, 'links_to', obj2.id), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Has Links')
  })

  it('links_to_type', () => {
    const result = filterObjects(objects, withCondition({ kind: 'relation' }, 'links_to_type', TYPE_B), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Has Links')
  })
})

describe('filterObjects — AND within groups', () => {
  const STATUS = crypto.randomUUID()
  const DONE = crypto.randomUUID()
  const obj1 = createMockObject({ title: 'Active Done', properties: { [STATUS]: 'active', [DONE]: true } })
  const obj2 = createMockObject({ title: 'Active Undone', properties: { [STATUS]: 'active', [DONE]: false } })
  const obj3 = createMockObject({ title: 'Draft Done', properties: { [STATUS]: 'draft', [DONE]: true } })
  const objects = [obj1, obj2, obj3]

  it('both conditions must match within a group', () => {
    const expression: FilterExpression = {
      search: '',
      groups: [{
        id: 'g1',
        conditions: [
          { id: 'c1', target: { kind: 'property', fieldId: STATUS }, operator: 'is', value: 'active' },
          { id: 'c2', target: { kind: 'property', fieldId: DONE }, operator: 'is_checked', value: '' },
        ],
      }],
    }
    const result = filterObjects(objects, expression, EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Active Done')
  })
})

describe('filterObjects — OR between groups', () => {
  const STATUS = crypto.randomUUID()
  const obj1 = createMockObject({ title: 'Active', properties: { [STATUS]: 'active' } })
  const obj2 = createMockObject({ title: 'Draft', properties: { [STATUS]: 'draft' } })
  const obj3 = createMockObject({ title: 'Archived', properties: { [STATUS]: 'archived' } })
  const objects = [obj1, obj2, obj3]

  it('matches if any group matches', () => {
    const expression: FilterExpression = {
      search: '',
      groups: [
        {
          id: 'g1',
          conditions: [{ id: 'c1', target: { kind: 'property', fieldId: STATUS }, operator: 'is', value: 'active' }],
        },
        {
          id: 'g2',
          conditions: [{ id: 'c2', target: { kind: 'property', fieldId: STATUS }, operator: 'is', value: 'draft' }],
        },
      ],
    }
    const result = filterObjects(objects, expression, EMPTY_CTX)
    expect(result.map((o) => o.title).sort()).toEqual(['Active', 'Draft'])
  })
})

describe('filterObjects — search + expression combination', () => {
  const obj1 = createMockObject({ title: 'Meeting Notes', properties: { done: true } })
  const obj2 = createMockObject({ title: 'Meeting Plan', properties: { done: false } })
  const obj3 = createMockObject({ title: 'Shopping List', properties: { done: true } })
  const objects = [obj1, obj2, obj3]

  it('search AND groups are combined', () => {
    const expression: FilterExpression = {
      search: 'meeting',
      groups: [{
        id: 'g1',
        conditions: [{ id: 'c1', target: { kind: 'property', fieldId: 'done' }, operator: 'is_checked', value: '' }],
      }],
    }
    const result = filterObjects(objects, expression, EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })
})

describe('filterObjects — empty/null handling', () => {
  it('handles objects with missing properties gracefully', () => {
    const obj = createMockObject({ title: 'Bare', properties: {} })
    const result = filterObjects([obj], withCondition({ kind: 'property', fieldId: 'nonexistent' }, 'contains', 'x'), EMPTY_CTX)
    expect(result).toHaveLength(0)
  })

  it('handles objects with null property values', () => {
    const obj = createMockObject({ title: 'Null', properties: { field: null } })
    const result = filterObjects([obj], withCondition({ kind: 'property', fieldId: 'field' }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
  })

  it('empty string is considered empty', () => {
    const obj = createMockObject({ title: 'Empty', properties: { field: '' } })
    const result = filterObjects([obj], withCondition({ kind: 'property', fieldId: 'field' }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
  })

  it('empty array is considered empty', () => {
    const obj = createMockObject({ title: 'EmptyArr', properties: { field: [] } })
    const result = filterObjects([obj], withCondition({ kind: 'property', fieldId: 'field' }, 'is_empty'), EMPTY_CTX)
    expect(result).toHaveLength(1)
  })
})

describe('filterObjects — content operators', () => {
  const obj1 = createMockObject({ title: 'Alpha' })
  const obj2 = createMockObject({ title: 'Beta' })
  const obj3 = createMockObject({ title: 'Gamma' })
  const objects = [obj1, obj2, obj3]

  const ctx: FilterContext = {
    tagsByObject: {},
    relationsByObject: {},
    objectTypeByObjectId: {},
    contentTextByObject: {
      [obj1.id]: 'The quick brown fox jumped over the lazy dog',
      [obj2.id]: 'Hello world this is a test document',
      [obj3.id]: '',
    },
  }

  it('contains', () => {
    const result = filterObjects(objects, withCondition({ kind: 'content' }, 'contains', 'quick brown'), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Alpha')
  })

  it('contains is case-insensitive', () => {
    const result = filterObjects(objects, withCondition({ kind: 'content' }, 'contains', 'HELLO WORLD'), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Beta')
  })

  it('does_not_contain', () => {
    const result = filterObjects(objects, withCondition({ kind: 'content' }, 'does_not_contain', 'fox'), ctx)
    expect(result.map((o) => o.title).sort()).toEqual(['Beta', 'Gamma'])
  })

  it('is_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'content' }, 'is_empty'), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Gamma')
  })

  it('is_not_empty', () => {
    const result = filterObjects(objects, withCondition({ kind: 'content' }, 'is_not_empty'), ctx)
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.title).sort()).toEqual(['Alpha', 'Beta'])
  })

  it('gracefully handles missing contentTextByObject entries', () => {
    const result = filterObjects(objects, withCondition({ kind: 'content' }, 'contains', 'fox'), EMPTY_CTX)
    expect(result).toHaveLength(0)
  })
})

describe('filterObjects — search bar matches content', () => {
  const obj1 = createMockObject({ title: 'Meeting Notes' })
  const obj2 = createMockObject({ title: 'Shopping List' })
  const objects = [obj1, obj2]

  it('search matches content when title does not match', () => {
    const ctx: FilterContext = {
      tagsByObject: {},
      relationsByObject: {},
      objectTypeByObjectId: {},
      contentTextByObject: {
        [obj1.id]: 'discuss quarterly budget review',
        [obj2.id]: 'milk eggs bread',
      },
    }
    const result = filterObjects(objects, expr({ search: 'budget' }), ctx)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('search matches title even without content data', () => {
    const result = filterObjects(objects, expr({ search: 'meeting' }), EMPTY_CTX)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meeting Notes')
  })

  it('search matches either title or content (OR)', () => {
    const ctx: FilterContext = {
      tagsByObject: {},
      relationsByObject: {},
      objectTypeByObjectId: {},
      contentTextByObject: {
        [obj1.id]: 'some random text',
        [obj2.id]: 'meeting agenda items',
      },
    }
    // "meeting" matches obj1 by title and obj2 by content
    const result = filterObjects(objects, expr({ search: 'meeting' }), ctx)
    expect(result).toHaveLength(2)
  })
})

describe('hasContentFilter', () => {
  it('returns false for empty expression', () => {
    expect(hasContentFilter(EMPTY_EXPRESSION)).toBe(false)
  })

  it('returns false for non-content filters', () => {
    expect(hasContentFilter(withCondition({ kind: 'title' }, 'contains', 'x'))).toBe(false)
  })

  it('returns true when a content condition exists', () => {
    expect(hasContentFilter(withCondition({ kind: 'content' }, 'contains', 'test'))).toBe(true)
  })
})
