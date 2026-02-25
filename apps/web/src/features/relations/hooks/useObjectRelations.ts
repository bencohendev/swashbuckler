'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataClient } from '@/shared/lib/data'
import type { ObjectRelation, DataObject } from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

export interface EnrichedRelation extends ObjectRelation {
  linkedObject: Pick<DataObject, 'id' | 'title' | 'icon' | 'type_id'> | null
}

const EMPTY_RELATIONS: EnrichedRelation[] = []

interface UseObjectRelationsReturn {
  relations: EnrichedRelation[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createLink: (targetId: string) => Promise<ObjectRelation | null>
  removeLink: (relationId: string) => Promise<void>
}

export function useObjectRelations(objectId: string | null): UseObjectRelationsReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.relations.list(objectId!),
    queryFn: async () => {
      const result = await dataClient.relations.list({ objectId: objectId! })
      if (result.error) throw new Error(result.error.message)

      // Only include outgoing relations from this object
      const outgoing = result.data.filter(r => r.source_id === objectId)

      // Deduplicate by target_id, preferring 'link' over 'mention'
      const byTarget = new Map<string, typeof outgoing[number]>()
      for (const r of outgoing) {
        const existing = byTarget.get(r.target_id)
        if (!existing || r.relation_type === 'link') {
          byTarget.set(r.target_id, r)
        }
      }
      const deduplicated = Array.from(byTarget.values())

      // Enrich with object data — check TanStack cache first, then batch-fetch uncached
      const targetIds = deduplicated.map(r => r.target_id)
      const objectMap = new Map<string, Pick<DataObject, 'id' | 'title' | 'icon' | 'type_id'>>()
      const uncachedIds: string[] = []

      for (const tid of targetIds) {
        const cached = queryClient.getQueryData<DataObject>(queryKeys.objects.detail(tid))
        if (cached) {
          objectMap.set(tid, { id: cached.id, title: cached.title, icon: cached.icon, type_id: cached.type_id })
        } else {
          uncachedIds.push(tid)
        }
      }

      if (uncachedIds.length > 0) {
        const batchResult = await dataClient.objects.batchGetSummary(uncachedIds)
        if (!batchResult.error) {
          for (const obj of batchResult.data) {
            objectMap.set(obj.id, obj)
          }
        }
      }

      const enriched: EnrichedRelation[] = deduplicated.map(relation => ({
        ...relation,
        linkedObject: objectMap.get(relation.target_id) ?? null,
      }))

      return enriched
    },
    enabled: !!objectId,
  })

  const refetch = useCallback(async () => {
    if (objectId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.relations.list(objectId) })
    }
  }, [queryClient, objectId])

  const createLink = useCallback(async (targetId: string): Promise<ObjectRelation | null> => {
    if (!objectId) return null

    const result = await dataClient.relations.create({
      source_id: objectId,
      target_id: targetId,
      relation_type: 'link',
    })

    if (result.error) return null
    emit('objectRelations')
    return result.data
  }, [dataClient, objectId])

  const removeLink = useCallback(async (relationId: string): Promise<void> => {
    const result = await dataClient.relations.delete(relationId)
    if (result.error) return
    emit('objectRelations')
  }, [dataClient])

  return {
    relations: data ?? EMPTY_RELATIONS,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
    createLink,
    removeLink,
  }
}
