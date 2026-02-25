import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePins } from '@/features/pins/hooks/usePins'
import { useObjects } from '@/features/objects/hooks/useObjects'
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

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'
const Wrapper = createHookWrapper()

describe('usePins', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns empty pinnedIds initially', async () => {
    const { result } = renderHook(() => usePins(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pinnedIds.size).toBe(0)
  })

  it('pins an object', async () => {
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let objId: string = ''
    await act(async () => {
      const obj = await objResult.current.create({ title: 'Pin Me', type_id: PAGE_TYPE_ID })
      objId = obj!.id
    })

    const { result } = renderHook(() => usePins(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.pin(objId)
    })

    await waitFor(() => {
      expect(result.current.pinnedIds.has(objId)).toBe(true)
    })
  })

  it('unpins an object', async () => {
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let objId: string = ''
    await act(async () => {
      const obj = await objResult.current.create({ title: 'Unpin Me', type_id: PAGE_TYPE_ID })
      objId = obj!.id
    })

    const { result } = renderHook(() => usePins(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.pin(objId)
    })

    await waitFor(() => {
      expect(result.current.pinnedIds.has(objId)).toBe(true)
    })

    await act(async () => {
      await result.current.unpin(objId)
    })

    await waitFor(() => {
      expect(result.current.pinnedIds.has(objId)).toBe(false)
    })
  })

  it('toggles pin state', async () => {
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let objId: string = ''
    await act(async () => {
      const obj = await objResult.current.create({ title: 'Toggle', type_id: PAGE_TYPE_ID })
      objId = obj!.id
    })

    const { result } = renderHook(() => usePins(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Toggle on
    await act(async () => {
      await result.current.toggle(objId)
    })

    await waitFor(() => {
      expect(result.current.pinnedIds.has(objId)).toBe(true)
    })

    // Toggle off
    await act(async () => {
      await result.current.toggle(objId)
    })

    await waitFor(() => {
      expect(result.current.pinnedIds.has(objId)).toBe(false)
    })
  })
})
