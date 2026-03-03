'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { isAuthError } from '@/shared/lib/data/errors'

/**
 * Listens for auth-related errors across all TanStack queries and mutations.
 * On session expiry (JWT expired, invalid refresh token, etc.),
 * redirects the user to the login page with an `expired` flag.
 */
export function useSessionGuard() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    const queryCache = queryClient.getQueryCache()
    const mutationCache = queryClient.getMutationCache()

    function handleError(error: unknown) {
      if (hasRedirected.current) return
      if (error instanceof Error && isAuthError(error)) {
        hasRedirected.current = true
        router.push('/login?expired=true')
      }
    }

    const unsubQuery = queryCache.subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      handleError(event.action.error)
    })

    const unsubMutation = mutationCache.subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      handleError(event.action.error)
    })

    return () => {
      unsubQuery()
      unsubMutation()
    }
  }, [queryClient, router])
}
