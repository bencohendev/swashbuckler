'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { isAuthError } from '@/shared/lib/data/errors'

/**
 * Listens for auth-related query errors across all TanStack queries.
 * On session expiry (JWT expired, invalid refresh token, etc.),
 * redirects the user to the login page with an `expired` flag.
 */
export function useSessionGuard() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    const unsubscribe = cache.subscribe((event) => {
      if (hasRedirected.current) return
      if (event.type !== 'updated' || event.action.type !== 'error') return

      const error = event.action.error
      if (error instanceof Error && isAuthError(error)) {
        hasRedirected.current = true
        router.push('/login?expired=true')
      }
    })

    return unsubscribe
  }, [queryClient, router])
}
