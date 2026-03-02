import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSavedViews } from '@/features/table-view/hooks/useSavedViews'
import { clearLocalData } from '@/shared/lib/data/local'
import { createHookWrapper } from '../../utils/render'

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

const TYPE_ID = crypto.randomUUID()
const Wrapper = createHookWrapper()

describe('useSavedViews', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns empty views initially', async () => {
    const { result } = renderHook(() => useSavedViews(TYPE_ID), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.views).toEqual([])
    expect(result.current.defaultView).toBeNull()
  })

  it('creates a saved view', async () => {
    const { result } = renderHook(() => useSavedViews(TYPE_ID), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createView({
        type_id: TYPE_ID,
        name: 'My View',
        filters: null,
        sort: null,
        view_mode: 'table',
      })
    })

    await waitFor(() => {
      expect(result.current.views.length).toBe(1)
    })

    expect(result.current.views[0].name).toBe('My View')
    expect(result.current.views[0].view_mode).toBe('table')
  })

  it('resolves defaultView from views', async () => {
    const { result } = renderHook(() => useSavedViews(TYPE_ID), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createView({
        type_id: TYPE_ID,
        name: 'Default View',
        filters: null,
        sort: null,
        view_mode: 'table',
        is_default: true,
      })
    })

    await waitFor(() => {
      expect(result.current.views.length).toBe(1)
    })

    expect(result.current.defaultView).not.toBeNull()
    expect(result.current.defaultView!.name).toBe('Default View')
  })

  it('returns empty views when typeId is undefined', async () => {
    const { result } = renderHook(() => useSavedViews(undefined), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.views).toEqual([])
  })
})
