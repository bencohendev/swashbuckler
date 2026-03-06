'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth, useStorageMode } from '@/shared/lib/data'
import { createClient } from '@/shared/lib/supabase/client'
import { createSupabasePreferencesClient } from '@/shared/lib/data/preferences'

const STORAGE_KEY = 'swashbuckler:showMouseCursors'

function readFromLocalStorage(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

export function useMouseCursorPreference() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const storageMode = useStorageMode()
  const [showMouseCursors, setShowMouseCursors] = useState(readFromLocalStorage)

  const supabase = useMemo(() => createClient(), [])
  const prefsClient = useMemo(() => {
    if (!userId) return null
    return createSupabasePreferencesClient(supabase, userId)
  }, [supabase, userId])

  // Load from DB on mount for authenticated users
  useEffect(() => {
    if (storageMode !== 'supabase' || !prefsClient) return

    let cancelled = false
    prefsClient.get().then((result) => {
      if (cancelled || result.error || !result.data) return
      const value = result.data.show_mouse_cursors
      setShowMouseCursors(value)
      localStorage.setItem(STORAGE_KEY, String(value))
    })

    return () => { cancelled = true }
  }, [storageMode, prefsClient])

  const toggleMouseCursors = useCallback(() => {
    const next = !showMouseCursors
    setShowMouseCursors(next)
    localStorage.setItem(STORAGE_KEY, String(next))

    if (prefsClient) {
      prefsClient.upsert({ show_mouse_cursors: next }).catch((err: unknown) => {
        console.error('Failed to persist mouse cursor preference:', err)
      })
    }
  }, [showMouseCursors, prefsClient])

  return { showMouseCursors, toggleMouseCursors }
}
