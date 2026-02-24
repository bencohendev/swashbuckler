import { describe, it, expect, beforeEach } from 'vitest'
import { useSortConfigStore } from '@/features/table-view/stores/sortConfig'
import { DEFAULT_SORT } from '@/features/table-view/lib/sortObjects'

const STORAGE_KEY = 'swashbuckler:typeSortConfig'

describe('useSortConfigStore', () => {
  beforeEach(() => {
    useSortConfigStore.setState({ configs: {} })
    localStorage.removeItem(STORAGE_KEY)
  })

  it('getSort returns DEFAULT_SORT for unknown slug', () => {
    const sort = useSortConfigStore.getState().getSort('unknown')
    expect(sort).toEqual(DEFAULT_SORT)
  })

  it('setSort persists to localStorage', () => {
    useSortConfigStore.getState().setSort('tasks', { field: 'title', direction: 'asc' })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.tasks).toEqual({ field: 'title', direction: 'asc' })
  })

  it('round-trip: setSort then getSort returns set value', () => {
    useSortConfigStore.getState().setSort('notes', { field: 'title', direction: 'desc' })

    const sort = useSortConfigStore.getState().getSort('notes')
    expect(sort).toEqual({ field: 'title', direction: 'desc' })
  })

  it('handles multiple slugs independently', () => {
    useSortConfigStore.getState().setSort('tasks', { field: 'title', direction: 'asc' })
    useSortConfigStore.getState().setSort('notes', { field: 'updated_at', direction: 'asc' })

    expect(useSortConfigStore.getState().getSort('tasks')).toEqual({ field: 'title', direction: 'asc' })
    expect(useSortConfigStore.getState().getSort('notes')).toEqual({ field: 'updated_at', direction: 'asc' })
    expect(useSortConfigStore.getState().getSort('pages')).toEqual(DEFAULT_SORT)
  })

  it('overwrites previous sort for same slug', () => {
    useSortConfigStore.getState().setSort('tasks', { field: 'title', direction: 'asc' })
    useSortConfigStore.getState().setSort('tasks', { field: 'tags', direction: 'desc' })

    expect(useSortConfigStore.getState().getSort('tasks')).toEqual({ field: 'tags', direction: 'desc' })
  })
})
