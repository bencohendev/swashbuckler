import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataProvider, useDataClient, useStorageMode, useAuth, LOCAL_DEFAULT_SPACE_ID } from '@/shared/lib/data'
import { clearLocalData } from '@/shared/lib/data/local'

// Mock Supabase client
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
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider user={null} isAuthLoading={false} spaceId={LOCAL_DEFAULT_SPACE_ID}>{children}</DataProvider>
    </QueryClientProvider>
  )
}

describe('Data Client Integration', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  describe('useDataClient', () => {
    it('returns local client when user is not authenticated', async () => {
      const { result } = renderHook(() => useDataClient(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isLocal).toBe(true)
      })
    })

    it('can create and retrieve objects in local mode', async () => {
      const { result } = renderHook(() => useDataClient(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isLocal).toBe(true)
      })

      const createResult = await result.current.objects.create({
        title: 'Test Page',
        type_id: '00000000-0000-0000-0000-000000000101',
      })

      expect(createResult.error).toBeNull()
      expect(createResult.data).not.toBeNull()

      const getResult = await result.current.objects.get(createResult.data!.id)
      expect(getResult.data?.title).toBe('Test Page')
    })
  })

  describe('useStorageMode', () => {
    it('returns local when not authenticated', async () => {
      const { result } = renderHook(() => useStorageMode(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current).toBe('local')
      })
    })
  })

  describe('useAuth', () => {
    it('returns guest state when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isGuest).toBe(true)
    })
  })
})
