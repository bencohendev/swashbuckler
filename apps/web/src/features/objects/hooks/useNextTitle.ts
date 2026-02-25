'use client'

import { useCallback } from 'react'
import { useObjects } from './useObjects'
import { getNextDefaultName } from '@/shared/lib/naming'

/**
 * Returns a function that generates the next unique "New {typeName}"
 * title for a given object type, based on existing non-deleted objects.
 */
export function useNextTitle() {
  const { objects } = useObjects({ isDeleted: false })

  return useCallback(
    (typeId: string, typeName: string): string => {
      const titles = objects
        .filter(obj => obj.type_id === typeId)
        .map(obj => obj.title)
      return getNextDefaultName(typeName, titles)
    },
    [objects]
  )
}
