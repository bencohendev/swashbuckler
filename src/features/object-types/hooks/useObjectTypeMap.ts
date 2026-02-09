'use client'

import { useMemo } from 'react'
import type { ObjectType } from '@/shared/lib/data'
import { useObjectTypes } from './useObjectTypes'

export function useObjectTypeMap() {
  const { types, isLoading, error } = useObjectTypes()

  const typeMap = useMemo(() => {
    const map = new Map<string, ObjectType>()
    for (const t of types) {
      map.set(t.id, t)
    }
    return map
  }, [types])

  return { typeMap, types, isLoading, error }
}
