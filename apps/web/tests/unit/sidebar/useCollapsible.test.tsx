import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCollapsible } from '@/features/sidebar/hooks/useCollapsible'

describe('useCollapsible', () => {
  const storageKey = 'test-collapsible'

  beforeEach(() => {
    localStorage.removeItem(storageKey)
  })

  it('defaults to not collapsed when no localStorage value', () => {
    const { result } = renderHook(() => useCollapsible(storageKey))

    expect(result.current[0]).toBe(false)
  })

  it('reads initial collapsed state from localStorage', () => {
    localStorage.setItem(storageKey, 'true')

    const { result } = renderHook(() => useCollapsible(storageKey))

    expect(result.current[0]).toBe(true)
  })

  it('persists state changes to localStorage', () => {
    const { result } = renderHook(() => useCollapsible(storageKey))

    act(() => {
      result.current[1](true)
    })

    expect(localStorage.getItem(storageKey)).toBe('true')
  })

  it('toggles collapsed state', () => {
    const { result } = renderHook(() => useCollapsible(storageKey))

    expect(result.current[0]).toBe(false)

    act(() => {
      result.current[1](true)
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      result.current[1](false)
    })
    expect(result.current[0]).toBe(false)
  })

  describe('collapseSignal', () => {
    it('syncs to signal when key changes after mount', () => {
      // Start with no signal
      const { result, rerender } = renderHook(
        ({ signal }) => useCollapsible(storageKey, signal),
        { initialProps: { signal: undefined as { collapsed: boolean; key: number } | undefined } },
      )

      expect(result.current[0]).toBe(false)

      // Provide a signal — new key vs undefined → triggers sync
      rerender({ signal: { collapsed: true, key: 1 } })

      expect(result.current[0]).toBe(true)

      // Update signal with new key to expand
      rerender({ signal: { collapsed: false, key: 2 } })

      expect(result.current[0]).toBe(false)
    })

    it('does not sync when signal key stays the same', () => {
      const { result, rerender } = renderHook(
        ({ signal }) => useCollapsible(storageKey, signal),
        { initialProps: { signal: undefined as { collapsed: boolean; key: number } | undefined } },
      )

      // Apply signal
      rerender({ signal: { collapsed: true, key: 1 } })
      expect(result.current[0]).toBe(true)

      // Manually expand
      act(() => {
        result.current[1](false)
      })
      expect(result.current[0]).toBe(false)

      // Rerender with same signal key — should not override manual state
      rerender({ signal: { collapsed: true, key: 1 } })
      expect(result.current[0]).toBe(false)
    })

    it('newly mounted component does not sync to pre-existing signal key', () => {
      // On mount, prevSignalKey is initialized to signal.key, so they match → no sync
      localStorage.setItem(storageKey, 'false')

      const { result } = renderHook(() =>
        useCollapsible(storageKey, { collapsed: true, key: 5 }),
      )

      // Should read from localStorage (false), not the signal
      expect(result.current[0]).toBe(false)
    })
  })
})
