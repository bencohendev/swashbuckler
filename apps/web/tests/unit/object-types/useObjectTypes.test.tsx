import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useObjectTypes, useObjectType } from '@/features/object-types/hooks/useObjectTypes'
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

describe('useObjectTypes', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns seeded Page type', async () => {
    const { result } = renderHook(() => useObjectTypes(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.types.length).toBeGreaterThanOrEqual(1)
    expect(result.current.types.some(t => t.slug === 'page')).toBe(true)
  })

  it('creates a new type', async () => {
    const { result } = renderHook(() => useObjectTypes(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let created: Awaited<ReturnType<typeof result.current.create>> | null = null
    await act(async () => {
      created = await result.current.create({
        name: 'Task',
        plural_name: 'Tasks',
        slug: 'task',
        icon: 'check-square',
      })
    })

    expect(created).not.toBeNull()
    expect(created!.name).toBe('Task')

    await waitFor(() => {
      expect(result.current.types.some(t => t.slug === 'task')).toBe(true)
    })
  })

  it('updates a type', async () => {
    const { result } = renderHook(() => useObjectTypes(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let created: Awaited<ReturnType<typeof result.current.create>> | null = null
    await act(async () => {
      created = await result.current.create({
        name: 'Original',
        plural_name: 'Originals',
        slug: 'original',
        icon: 'edit',
      })
    })

    await act(async () => {
      await result.current.update(created!.id, { name: 'Renamed' })
    })

    await waitFor(() => {
      expect(result.current.types.some(t => t.name === 'Renamed')).toBe(true)
    })
  })

  it('removes a type', async () => {
    const { result } = renderHook(() => useObjectTypes(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let created: Awaited<ReturnType<typeof result.current.create>> | null = null
    await act(async () => {
      created = await result.current.create({
        name: 'ToRemove',
        plural_name: 'ToRemoves',
        slug: 'to-remove',
        icon: 'trash',
      })
    })

    // Wait for the create to be reflected in the list
    await waitFor(() => {
      expect(result.current.types.some(t => t.slug === 'to-remove')).toBe(true)
    })

    await act(async () => {
      await result.current.remove(created!.id)
    })

    await waitFor(() => {
      expect(result.current.types.some(t => t.slug === 'to-remove')).toBe(false)
    })
  })
})

describe('useObjectType', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns a type by id', async () => {
    // First create a type to get its ID
    const { result: listResult } = renderHook(() => useObjectTypes(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(listResult.current.isLoading).toBe(false)
    })

    let created: Awaited<ReturnType<typeof listResult.current.create>> | null = null
    await act(async () => {
      created = await listResult.current.create({
        name: 'Findable',
        plural_name: 'Findables',
        slug: 'findable',
        icon: 'search',
      })
    })

    const { result } = renderHook(() => useObjectType(created!.id), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.objectType).not.toBeNull()
    expect(result.current.objectType!.name).toBe('Findable')
  })

  it('returns null when id is null', async () => {
    const { result } = renderHook(() => useObjectType(null), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.objectType).toBeNull()
  })
})
