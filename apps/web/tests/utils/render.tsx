import { render, type RenderOptions } from '@testing-library/react'
import { useState, type ReactElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataProvider, LOCAL_DEFAULT_SPACE_ID } from '@/shared/lib/data'
import { setQueryClient } from '@/shared/lib/data/events'

type WrapperProps = {
  children: ReactNode
}

function AllProviders({ children }: WrapperProps) {
  // Add providers here as needed (e.g., AuthProvider, ThemeProvider)
  return <>{children}</>
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export function createHookWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
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
}

export * from '@testing-library/react'
export { customRender as render }
