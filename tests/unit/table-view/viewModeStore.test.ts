import { describe, it, expect, beforeEach } from 'vitest'
import { useViewModeStore } from '@/features/table-view/stores/viewMode'

const STORAGE_KEY = 'swashbuckler:typeViewMode'

describe('useViewModeStore', () => {
  beforeEach(() => {
    // Reset store state and localStorage
    useViewModeStore.setState({ modes: {} })
    localStorage.removeItem(STORAGE_KEY)
  })

  it('getMode returns "table" for unknown slug', () => {
    const mode = useViewModeStore.getState().getMode('unknown-slug')
    expect(mode).toBe('table')
  })

  it('setMode persists to localStorage', () => {
    useViewModeStore.getState().setMode('my-type', 'list')

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored['my-type']).toBe('list')
  })

  it('round-trip: setMode then getMode returns the set value', () => {
    useViewModeStore.getState().setMode('tasks', 'card')

    const mode = useViewModeStore.getState().getMode('tasks')
    expect(mode).toBe('card')
  })

  it('handles multiple slugs independently', () => {
    useViewModeStore.getState().setMode('tasks', 'card')
    useViewModeStore.getState().setMode('notes', 'list')

    expect(useViewModeStore.getState().getMode('tasks')).toBe('card')
    expect(useViewModeStore.getState().getMode('notes')).toBe('list')
    expect(useViewModeStore.getState().getMode('pages')).toBe('table')
  })

  it('overwrites previous mode for same slug', () => {
    useViewModeStore.getState().setMode('tasks', 'card')
    useViewModeStore.getState().setMode('tasks', 'table')

    expect(useViewModeStore.getState().getMode('tasks')).toBe('table')
  })
})
