'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDataClient } from '@/shared/lib/data'
import type { ObjectRelation, DataObject } from '@/shared/lib/data'
import { emit, subscribe } from '@/shared/lib/data/events'

export interface EnrichedRelation extends ObjectRelation {
  linkedObject: Pick<DataObject, 'id' | 'title' | 'icon' | 'type_id'> | null
}

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
  const [relations, setRelations] = useState<EnrichedRelation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const hasFetched = useRef(false)

  const fetchRelations = useCallback(async () => {
    if (!objectId) {
      setRelations([])
      setIsLoading(false)
      return
    }

    if (!hasFetched.current) {
      setIsLoading(true)
    }
    setError(null)

    // Fetch all outgoing relations (links and mentions)
    const result = await dataClient.relations.list({
      objectId,
    })

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setRelations([])
      setIsLoading(false)
      return
    }

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

    // Enrich with object data
    const enriched: EnrichedRelation[] = await Promise.all(
      deduplicated.map(async (relation) => {
        const targetResult = await dataClient.objects.get(relation.target_id)
        return {
          ...relation,
          linkedObject: targetResult.data
            ? {
                id: targetResult.data.id,
                title: targetResult.data.title,
                icon: targetResult.data.icon,
                type_id: targetResult.data.type_id,
              }
            : null,
        }
      })
    )

    if (!isMounted.current) return

    setRelations(enriched)
    hasFetched.current = true
    setIsLoading(false)
  }, [dataClient, objectId])

  useEffect(() => {
    isMounted.current = true
    hasFetched.current = false
    fetchRelations()
    const unsubscribe = subscribe('objectRelations', fetchRelations)
    return () => { isMounted.current = false; unsubscribe() }
  }, [fetchRelations])

  const createLink = useCallback(async (targetId: string): Promise<ObjectRelation | null> => {
    if (!objectId) return null

    const result = await dataClient.relations.create({
      source_id: objectId,
      target_id: targetId,
      relation_type: 'link',
    })

    if (result.error) {
      setError(result.error.message)
      return null
    }

    emit('objectRelations')
    return result.data
  }, [dataClient, objectId])

  const removeLink = useCallback(async (relationId: string): Promise<void> => {
    const result = await dataClient.relations.delete(relationId)

    if (result.error) {
      setError(result.error.message)
      return
    }

    emit('objectRelations')
  }, [dataClient])

  return {
    relations,
    isLoading,
    error,
    refetch: fetchRelations,
    createLink,
    removeLink,
  }
}
