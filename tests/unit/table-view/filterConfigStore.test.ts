import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterConfigStore } from '@/features/table-view/stores/filterConfig'
import { EMPTY_FILTERS, type TypePageFilters } from '@/features/table-view/lib/filterObjects'

const STORAGE_KEY = 'swashbuckler:typeFilterConfig'

describe('useFilterConfigStore', () => {
  beforeEach(() => {
    useFilterConfigStore.setState({ configs: {} })
    localStorage.removeItem(STORAGE_KEY)
  })

  it('getFilters returns EMPTY_FILTERS for unknown slug', () => {
    const filters = useFilterConfigStore.getState().getFilters('unknown')
    expect(filters).toEqual(EMPTY_FILTERS)
  })

  it('round-trip with search filter', () => {
    const filters: TypePageFilters = { ...EMPTY_FILTERS, search: 'hello' }
    useFilterConfigStore.getState().setFilters('tasks', filters)

    const result = useFilterConfigStore.getState().getFilters('tasks')
    expect(result.search).toBe('hello')
  })

  it('serializes and deserializes Sets correctly', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      selectFilters: {
        'field-1': new Set(['A', 'B']),
        'field-2': new Set(['X']),
      },
      tagFilter: new Set(['tag-1', 'tag-2']),
    }
    useFilterConfigStore.getState().setFilters('tasks', filters)

    // Check localStorage has arrays (not Sets)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(Array.isArray(stored.tasks.selectFilters['field-1'])).toBe(true)
    expect(stored.tasks.selectFilters['field-1']).toEqual(['A', 'B'])
    expect(Array.isArray(stored.tasks.tagFilter)).toBe(true)
    expect(stored.tasks.tagFilter).toEqual(['tag-1', 'tag-2'])

    // Check deserialized state has Sets
    const result = useFilterConfigStore.getState().getFilters('tasks')
    expect(result.selectFilters['field-1']).toBeInstanceOf(Set)
    expect(result.selectFilters['field-1'].has('A')).toBe(true)
    expect(result.selectFilters['field-1'].has('B')).toBe(true)
    expect(result.tagFilter).toBeInstanceOf(Set)
    expect(result.tagFilter.has('tag-1')).toBe(true)
  })

  it('persists date filters', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      dateFilters: { 'date-field': { from: '2025-01-01', to: '2025-12-31' } },
    }
    useFilterConfigStore.getState().setFilters('tasks', filters)

    const result = useFilterConfigStore.getState().getFilters('tasks')
    expect(result.dateFilters['date-field']).toEqual({ from: '2025-01-01', to: '2025-12-31' })
  })

  it('persists number filters', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      numberFilters: { 'num-field': { min: 10, max: 100 } },
    }
    useFilterConfigStore.getState().setFilters('tasks', filters)

    const result = useFilterConfigStore.getState().getFilters('tasks')
    expect(result.numberFilters['num-field']).toEqual({ min: 10, max: 100 })
  })

  it('persists text filters', () => {
    const filters: TypePageFilters = {
      ...EMPTY_FILTERS,
      textFilters: { 'text-field': 'hello world' },
    }
    useFilterConfigStore.getState().setFilters('tasks', filters)

    const result = useFilterConfigStore.getState().getFilters('tasks')
    expect(result.textFilters['text-field']).toBe('hello world')
  })

  it('handles multiple slugs independently', () => {
    useFilterConfigStore.getState().setFilters('tasks', { ...EMPTY_FILTERS, search: 'task query' })
    useFilterConfigStore.getState().setFilters('notes', { ...EMPTY_FILTERS, search: 'note query' })

    expect(useFilterConfigStore.getState().getFilters('tasks').search).toBe('task query')
    expect(useFilterConfigStore.getState().getFilters('notes').search).toBe('note query')
    expect(useFilterConfigStore.getState().getFilters('pages')).toEqual(EMPTY_FILTERS)
  })
})
