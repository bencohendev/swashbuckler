import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGlobalSearch } from '@/features/search/hooks/useGlobalSearch'
import { DataProvider } from '@/shared/lib/data'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
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
      <DataProvider user={null} isAuthLoading={false}>{children}</DataProvider>
    </QueryClientProvider>
  )
}

describe('useGlobalSearch', () => {
  beforeEach(async () => {
    await clearLocalData()

    // Seed objects for search
    const client = createLocalDataClient()
    await client.objects.create({ title: 'Meeting Notes', type_id: PAGE_TYPE_ID })
    await client.objects.create({ title: 'Project Plan', type_id: PAGE_TYPE_ID })
    await client.objects.create({ title: 'Daily Notes', type_id: PAGE_TYPE_ID })
  })

  it('starts with empty results', async () => {
    const { result } = renderHook(() => useGlobalSearch(), { wrapper: Wrapper })

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('empty/whitespace query clears results immediately', async () => {
    const { result } = renderHook(() => useGlobalSearch(), { wrapper: Wrapper })

    act(() => {
      result.current.setQuery('   ')
    })

    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('setting query triggers search after debounce', async () => {
    const { result } = renderHook(() => useGlobalSearch(), { wrapper: Wrapper })

    act(() => {
      result.current.setQuery('notes')
    })

    // Should eventually return results (after 300ms debounce + search)
    await waitFor(() => {
      expect(result.current.results.length).toBe(2)
    }, { timeout: 3000 })

    expect(result.current.isLoading).toBe(false)
  })

  it('tagResults filters client-side from available tags (synchronous)', async () => {
    // Create tags
    const client = createLocalDataClient()
    await client.tags.create({ name: 'important' })
    await client.tags.create({ name: 'todo' })

    const { result } = renderHook(() => useGlobalSearch(), { wrapper: Wrapper })

    act(() => {
      result.current.setQuery('imp')
    })

    // tagResults should populate (computed synchronously from useTags data)
    await waitFor(() => {
      expect(result.current.tagResults.length).toBe(1)
      expect(result.current.tagResults[0].name).toBe('important')
    }, { timeout: 3000 })
  })
})
