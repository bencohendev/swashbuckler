import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useObjects, useObject } from '@/features/objects/hooks/useObjects'
import { DataProvider } from '@/shared/lib/data'
import { clearLocalData } from '@/shared/lib/data/local'
import { setQueryClient } from '@/shared/lib/data/events'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'
const NOTE_TYPE_ID = '00000000-0000-0000-0000-000000000002'

// Mock Supabase client to return no user (guest mode)
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

function Wrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    setQueryClient(client)
    return client
  })
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider user={null} isAuthLoading={false}>{children}</DataProvider>
    </QueryClientProvider>
  )
}

describe('useObjects', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns empty array initially', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.objects).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('creates and lists objects', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Create an object
    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ title: 'Test Page', type_id: PAGE_TYPE_ID })
    })

    expect(created).not.toBeNull()
    expect(created!.title).toBe('Test Page')

    // Verify it appears in the list
    await waitFor(() => {
      expect(result.current.objects.length).toBe(1)
    })
  })

  it('updates objects', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Create then update
    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ title: 'Original', type_id: PAGE_TYPE_ID })
    })

    await act(async () => {
      await result.current.update(created!.id, { title: 'Updated' })
    })

    await waitFor(() => {
      expect(result.current.objects[0].title).toBe('Updated')
    })
  })

  it('deletes objects (soft delete)', async () => {
    const { result } = renderHook(() => useObjects({ isDeleted: false }), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ title: 'To Delete', type_id: PAGE_TYPE_ID })
    })

    await waitFor(() => {
      expect(result.current.objects.length).toBe(1)
    })

    await act(async () => {
      await result.current.remove(created!.id)
    })

    await waitFor(() => {
      expect(result.current.objects.length).toBe(0)
    })
  })

  it('restores deleted objects', async () => {
    const { result } = renderHook(() => useObjects({ isDeleted: false }), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ title: 'Restore Me', type_id: PAGE_TYPE_ID })
      await result.current.remove(created!.id)
    })

    await waitFor(() => {
      expect(result.current.objects.length).toBe(0)
    })

    await act(async () => {
      await result.current.restore(created!.id)
    })

    await waitFor(() => {
      expect(result.current.objects.length).toBe(1)
    })
  })

  it('filters by typeId', async () => {
    // First create some objects
    const { result: createHook } = renderHook(() => useObjects(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(createHook.current.isLoading).toBe(false)
    })

    await act(async () => {
      await createHook.current.create({ title: 'Page 1', type_id: PAGE_TYPE_ID })
      await createHook.current.create({ title: 'Note 1', type_id: NOTE_TYPE_ID })
    })

    // Then test filtering with separate hooks
    const { result: pagesResult } = renderHook(() => useObjects({ typeId: PAGE_TYPE_ID }), { wrapper: Wrapper })
    const { result: notesResult } = renderHook(() => useObjects({ typeId: NOTE_TYPE_ID }), { wrapper: Wrapper })

    await waitFor(() => {
      expect(pagesResult.current.isLoading).toBe(false)
      expect(notesResult.current.isLoading).toBe(false)
    })

    expect(pagesResult.current.objects.length).toBe(1)
    expect(pagesResult.current.objects[0].title).toBe('Page 1')
    expect(notesResult.current.objects.length).toBe(1)
    expect(notesResult.current.objects[0].title).toBe('Note 1')
  })
})

describe('useObject', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns null for non-existent id', async () => {
    const { result } = renderHook(() => useObject('non-existent'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.object).toBeNull()
    expect(result.current.error).not.toBeNull()
  })

  it('returns null when id is null', async () => {
    const { result } = renderHook(() => useObject(null), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.object).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
