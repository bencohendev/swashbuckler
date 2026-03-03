'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import { DataProvider, SpaceProvider, useCurrentSpace } from '@/shared/lib/data'
import { setQueryClient } from '@/shared/lib/data/events'
import { DataLayerError } from '@/shared/lib/data/errors'
import { Toaster } from '@/shared/components/ui/Toast'
import { AnalyticsBanner } from '@/shared/components/AnalyticsBanner'
import { CustomThemeApplier } from '@/features/theme-builder'
import { TutorialController } from '@/features/onboarding'
import { useSessionGuard } from '@/shared/hooks/useSessionGuard'
import { useFocusOnNavigation } from '@/shared/hooks/useFocusOnNavigation'

interface ProvidersProps {
  children: ReactNode
}

// Inner component that reads space context and passes spaceId to DataProvider
function DataProviderWithSpace({ children, user, isAuthLoading }: { children: ReactNode; user: User | null; isAuthLoading: boolean }) {
  const { space } = useCurrentSpace()
  useSessionGuard()
  useFocusOnNavigation()

  return (
    <DataProvider spaceId={space?.id} user={user} isAuthLoading={isAuthLoading}>
      {children}
    </DataProvider>
  )
}

export function Providers({ children }: ProvidersProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof DataLayerError && !error.retryable) return false
          return failureCount < 1
        },
      },
    },
  }))

  // Wire up query client to event bridge
  useEffect(() => {
    setQueryClient(queryClient)
  }, [queryClient])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SpaceProvider user={user} isAuthLoading={isAuthLoading}>
          <CustomThemeApplier />
          <DataProviderWithSpace user={user} isAuthLoading={isAuthLoading}>
            {children}
            <TutorialController />
          </DataProviderWithSpace>
        </SpaceProvider>
      </QueryClientProvider>
      <Toaster />
      <AnalyticsBanner />
    </ThemeProvider>
  )
}
