'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/shared/stores/navigation'

export function useNavigate() {
  const router = useRouter()
  const setNavigating = useNavigation((s) => s.setNavigating)

  const push = useCallback(
    (href: string) => {
      setNavigating(true)
      router.push(href)
    },
    [router, setNavigating],
  )

  return { push, router }
}
