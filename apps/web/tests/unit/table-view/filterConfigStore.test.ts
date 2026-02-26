import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterConfigStore } from '@/features/table-view/stores/filterConfig'
import { EMPTY_EXPRESSION, type FilterExpression } from '@/features/table-view/lib/filterTypes'

const STORAGE_KEY = 'swashbuckler:filterExpression:v2'

describe('useFilterConfigStore', () => {
  beforeEach(() => {
    useFilterConfigStore.setState({ configs: {} })
    localStorage.removeItem(STORAGE_KEY)
  })

  it('getExpression returns EMPTY_EXPRESSION for unknown slug', () => {
    const expr = useFilterConfigStore.getState().getExpression('unknown')
    expect(expr).toEqual(EMPTY_EXPRESSION)
  })

  it('round-trip with search', () => {
    const expr: FilterExpression = { ...EMPTY_EXPRESSION, search: 'hello' }
    useFilterConfigStore.getState().setExpression('tasks', expr)

    const result = useFilterConfigStore.getState().getExpression('tasks')
    expect(result.search).toBe('hello')
  })

  it('round-trip with groups and conditions', () => {
    const expr: FilterExpression = {
      search: '',
      groups: [{
        id: 'g1',
        conditions: [
          { id: 'c1', target: { kind: 'title' }, operator: 'contains', value: 'test' },
          { id: 'c2', target: { kind: 'property', fieldId: 'field-1' }, operator: 'eq', value: 42 },
        ],
      }],
    }
    useFilterConfigStore.getState().setExpression('tasks', expr)

    const result = useFilterConfigStore.getState().getExpression('tasks')
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].conditions).toHaveLength(2)
    expect(result.groups[0].conditions[0].operator).toBe('contains')
    expect(result.groups[0].conditions[1].value).toBe(42)
  })

  it('persists to localStorage as plain JSON', () => {
    const expr: FilterExpression = {
      search: 'test',
      groups: [{
        id: 'g1',
        conditions: [{ id: 'c1', target: { kind: 'tag' }, operator: 'contains', value: 'tag-1' }],
      }],
    }
    useFilterConfigStore.getState().setExpression('tasks', expr)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.tasks.search).toBe('test')
    expect(stored.tasks.groups[0].conditions[0].value).toBe('tag-1')
  })

  it('handles multiple slugs independently', () => {
    useFilterConfigStore.getState().setExpression('tasks', { ...EMPTY_EXPRESSION, search: 'task query' })
    useFilterConfigStore.getState().setExpression('notes', { ...EMPTY_EXPRESSION, search: 'note query' })

    expect(useFilterConfigStore.getState().getExpression('tasks').search).toBe('task query')
    expect(useFilterConfigStore.getState().getExpression('notes').search).toBe('note query')
    expect(useFilterConfigStore.getState().getExpression('pages')).toEqual(EMPTY_EXPRESSION)
  })

  it('clean reset with new storage key (no old data)', () => {
    // Old key should not interfere
    localStorage.setItem('swashbuckler:typeFilterConfig', JSON.stringify({ tasks: { search: 'old' } }))
    useFilterConfigStore.setState({ configs: {} })

    const result = useFilterConfigStore.getState().getExpression('tasks')
    expect(result).toEqual(EMPTY_EXPRESSION)
  })
})
