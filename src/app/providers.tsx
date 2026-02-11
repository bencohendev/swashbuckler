'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import { DataProvider, SpaceProvider, useCurrentSpace } from '@/shared/lib/data'

interface ProvidersProps {
  children: ReactNode
}

// Inner component that reads space context and passes spaceId to DataProvider
function DataProviderWithSpace({ children }: { children: ReactNode }) {
  const { space, isLoading: spaceLoading } = useCurrentSpace()

  if (spaceLoading) {
    return null
  }

  return (
    <DataProvider spaceId={space?.id}>
      {children}
    </DataProvider>
  )
}

export function Providers({ children }: ProvidersProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SpaceProvider user={user} isAuthLoading={isAuthLoading}>
        <DataProviderWithSpace>
          {children}
        </DataProviderWithSpace>
      </SpaceProvider>
    </ThemeProvider>
  )
}
