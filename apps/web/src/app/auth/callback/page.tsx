'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Signing in…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const rawNext = searchParams.get('next') ?? '/dashboard'
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

    let redirected = false
    const redirect = () => {
      if (redirected) return
      redirected = true
      router.replace(next)
    }

    // The browser Supabase client (detectSessionInUrl: true) automatically
    // detects ?code= and exchanges it via PKCE. We just listen for the result.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password')
        redirected = true
        return
      }
      if (event === 'SIGNED_IN') {
        redirect()
      }
    })

    // Fallback: the exchange may have completed during client init, before
    // this listener was registered. Check current session as well.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirect()
      }
    })

    const timeout = setTimeout(() => {
      if (!redirected) {
        setError('Authentication timed out. Please try signing in again.')
      }
    }, 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <a href="/login" className="text-sm underline">
          Back to login
        </a>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing in…</p>
    </div>
  )
}
