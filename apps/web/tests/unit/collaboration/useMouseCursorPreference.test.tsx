import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const STORAGE_KEY = 'swashbuckler:showMouseCursors'

// Mock dependencies before importing the hook
vi.mock('@/shared/lib/data', () => ({
  useAuth: () => ({ user: null }),
  useStorageMode: () => 'local' as const,
}))

vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
  }),
}))

// Import after mocks are set up
import { useMouseCursorPreference } from '@/features/collaboration/hooks/useMouseCursorPreference'

describe('useMouseCursorPreference', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  it('defaults to true when no localStorage value', () => {
    const { result } = renderHook(() => useMouseCursorPreference())
    expect(result.current.showMouseCursors).toBe(true)
  })

  it('reads initial state from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'false')
    const { result } = renderHook(() => useMouseCursorPreference())
    expect(result.current.showMouseCursors).toBe(false)
  })

  it('toggles state and persists to localStorage', () => {
    const { result } = renderHook(() => useMouseCursorPreference())
    expect(result.current.showMouseCursors).toBe(true)

    act(() => {
      result.current.toggleMouseCursors()
    })

    expect(result.current.showMouseCursors).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false')

    act(() => {
      result.current.toggleMouseCursors()
    })

    expect(result.current.showMouseCursors).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })
})
