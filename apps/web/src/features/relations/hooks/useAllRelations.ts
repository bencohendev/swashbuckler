'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDataClient, useSpaceId } from '@/shared/lib/data'
import type { ObjectRelation } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_MAP: Record<string, ObjectRelation[]> = {}

export function useAllRelations() {
  const dataClient = useDataClient()
  const spaceId = useSpaceId()

  const { data: relations, isLoading } = useQuery({
    queryKey: queryKeys.relations.all(spaceId ?? undefined),
    queryFn: async () => {
      const result = await dataClient.relations.listAll()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
  })

  const relationsByObject = useMemo(() => {
    if (!relations || relations.length === 0) return EMPTY_MAP
    const map: Record<string, ObjectRelation[]> = {}
    for (const rel of relations) {
      if (!map[rel.source_id]) map[rel.source_id] = []
      map[rel.source_id].push(rel)
      if (rel.source_id !== rel.target_id) {
        if (!map[rel.target_id]) map[rel.target_id] = []
        map[rel.target_id].push(rel)
      }
    }
    return map
  }, [relations])

  return { relationsByObject, isLoading }
}
