import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TrashList } from '@/features/objects/components/TrashList'
import { PAGE_TYPE_ID } from '../../fixtures/objects'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataProvider } from '@/shared/lib/data'
import { clearLocalData, createLocalDataClient } from '@/shared/lib/data/local'
import { setQueryClient } from '@/shared/lib/data/events'

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

// Mock toast to capture calls
const mockToast = vi.fn()
vi.mock('@/shared/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
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

describe('TrashList', () => {
  beforeEach(async () => {
    await clearLocalData()
    mockToast.mockClear()
  })

  it('shows empty state when no deleted objects', async () => {
    render(<TrashList />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Trash is empty')).toBeInTheDocument()
    })
  })

  it('shows loading skeleton initially', () => {
    render(<TrashList />, { wrapper: Wrapper })

    // Should show skeleton divs (animate-pulse)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('lists deleted objects', async () => {
    // Create and delete objects
    const client = createLocalDataClient()
    const obj1 = await client.objects.create({ title: 'Deleted Page', type_id: PAGE_TYPE_ID })
    await client.objects.delete(obj1.data!.id)
    const obj2 = await client.objects.create({ title: 'Another Deleted', type_id: PAGE_TYPE_ID })
    await client.objects.delete(obj2.data!.id)

    render(<TrashList />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Deleted Page')).toBeInTheDocument()
      expect(screen.getByText('Another Deleted')).toBeInTheDocument()
    })
  })

  it('has restore buttons with accessible labels', async () => {
    const client = createLocalDataClient()
    const obj = await client.objects.create({ title: 'My Document', type_id: PAGE_TYPE_ID })
    await client.objects.delete(obj.data!.id)

    render(<TrashList />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText('Restore "My Document"')).toBeInTheDocument()
    })
  })

  it('has permanent delete buttons with accessible labels', async () => {
    const client = createLocalDataClient()
    const obj = await client.objects.create({ title: 'My Document', type_id: PAGE_TYPE_ID })
    await client.objects.delete(obj.data!.id)

    render(<TrashList />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText('Permanently delete "My Document"')).toBeInTheDocument()
    })
  })
})
