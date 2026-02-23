import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTags } from '@/features/tags/hooks/useTags'
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

const Wrapper = createHookWrapper()

describe('useTags', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns empty tags initially', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.tags).toEqual([])
  })

  it('creates a tag', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ name: 'Important' })
    })

    expect(created).not.toBeNull()
    expect(created!.name).toBe('Important')

    await waitFor(() => {
      expect(result.current.tags.length).toBe(1)
    })
  })

  it('updates a tag', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ name: 'Old Name' })
    })

    await act(async () => {
      await result.current.update(created!.id, { name: 'New Name' })
    })

    await waitFor(() => {
      expect(result.current.tags.some(t => t.name === 'New Name')).toBe(true)
    })
  })

  it('removes a tag', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ name: 'ToDelete' })
    })

    await waitFor(() => {
      expect(result.current.tags.length).toBe(1)
    })

    await act(async () => {
      await result.current.remove(created!.id)
    })

    await waitFor(() => {
      expect(result.current.tags.length).toBe(0)
    })
  })
})
