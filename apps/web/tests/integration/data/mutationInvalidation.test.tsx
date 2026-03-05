import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useObjects } from '@/features/objects/hooks/useObjects'
import { DataProvider, LOCAL_DEFAULT_SPACE_ID } from '@/shared/lib/data'
import { clearLocalData } from '@/shared/lib/data/local'
import { setQueryClient } from '@/shared/lib/data/events'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

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
      <DataProvider user={null} isAuthLoading={false} spaceId={LOCAL_DEFAULT_SPACE_ID}>{children}</DataProvider>
    </QueryClientProvider>
  )
}

describe('mutation → emit → query invalidation', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('creating an object triggers re-render with updated list', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper: Wrapper })

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.objects).toEqual([])

    // Create an object via the hook's create function
    await act(async () => {
      await result.current.create({ title: 'New Page', type_id: PAGE_TYPE_ID })
    })

    // The mutation calls emit('objects'), which invalidates the query, triggering refetch
    await waitFor(() => {
      expect(result.current.objects.length).toBe(1)
    })

    expect(result.current.objects[0].title).toBe('New Page')
  })

  it('deleting an object triggers re-render with updated list', async () => {
    const { result } = renderHook(() => useObjects({ isDeleted: false }), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Create two objects
    await act(async () => {
      await result.current.create({ title: 'Page A', type_id: PAGE_TYPE_ID })
      await result.current.create({ title: 'Page B', type_id: PAGE_TYPE_ID })
    })

    await waitFor(() => {
      expect(result.current.objects.length).toBe(2)
    })

    // Soft-delete one
    const objectToDelete = result.current.objects[0]
    await act(async () => {
      await result.current.remove(objectToDelete.id)
    })

    await waitFor(() => {
      expect(result.current.objects.length).toBe(1)
    })
  })

  it('updating an object reflects in the list', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.create({ title: 'Original', type_id: PAGE_TYPE_ID })
    })

    await waitFor(() => {
      expect(result.current.objects.length).toBe(1)
    })

    const objectId = result.current.objects[0].id

    await act(async () => {
      await result.current.update(objectId, { title: 'Updated' })
    })

    await waitFor(() => {
      expect(result.current.objects[0].title).toBe('Updated')
    })
  })
})
