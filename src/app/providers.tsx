'use client'

import { type ReactNode } from 'react'
import { DataProvider } from '@/shared/lib/data'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <DataProvider>
      {children}
    </DataProvider>
  )
}
