'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  useDataClient,
  useSpaceId,
  type Tag,
  type CreateTagInput,
  type UpdateTagInput,
} from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_TAGS: Tag[] = []
const EMPTY_BATCH: Record<string, Tag[]> = {}

interface UseTagsReturn {
  tags: Tag[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (input: CreateTagInput) => Promise<Tag | null>
  update: (id: string, input: UpdateTagInput) => Promise<Tag | null>
  remove: (id: string) => Promise<void>
}

export function useTags(): UseTagsReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.tags.list(spaceId ?? undefined),
    queryFn: async () => {
      const result = await dataClient.tags.list()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    placeholderData: keepPreviousData,
  })

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all(spaceId ?? undefined) })
  }, [queryClient, spaceId])

  const create = useCallback(async (input: CreateTagInput): Promise<Tag | null> => {
    const result = await dataClient.tags.create(input)
    if (result.error) return null
    emit('tags')
    return result.data
  }, [dataClient])

  const update = useCallback(async (id: string, input: UpdateTagInput): Promise<Tag | null> => {
    const result = await dataClient.tags.update(id, input)
    if (result.error) return null
    emit('tags')
    return result.data
  }, [dataClient])

  const remove = useCallback(async (id: string): Promise<void> => {
    const result = await dataClient.tags.delete(id)
    if (result.error) return
    emit('tags')
  }, [dataClient])

  return {
    tags: data ?? EMPTY_TAGS,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
    create,
    update,
    remove,
  }
}

interface UseObjectTagsReturn {
  tags: Tag[]
  isLoading: boolean
  addTag: (tagId: string) => Promise<void>
  removeTag: (tagId: string) => Promise<void>
}

export function useObjectTags(objectId: string): UseObjectTagsReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tags.objectTags(objectId),
    queryFn: async () => {
      const result = await dataClient.tags.getObjectTags(objectId)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
  })

  const addTag = useCallback(async (tagId: string) => {
    await dataClient.tags.addTagToObject(objectId, tagId)
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.objectTags(objectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all(spaceId ?? undefined) })
    emit('tags')
  }, [dataClient, objectId, queryClient, spaceId])

  const removeTag = useCallback(async (tagId: string) => {
    await dataClient.tags.removeTagFromObject(objectId, tagId)
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.objectTags(objectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all(spaceId ?? undefined) })
    emit('tags')
  }, [dataClient, objectId, queryClient, spaceId])

  return { tags: data ?? EMPTY_TAGS, isLoading, addTag, removeTag }
}

export function useObjectTagsBatch(objectIds: string[]): { tagsByObject: Record<string, Tag[]>; isLoading: boolean } {
  const dataClient = useDataClient()

  const sortedIds = useMemo(
    () => [...objectIds].sort(),
    [objectIds]
  )

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tags.objectTagsBatch(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return EMPTY_BATCH
      const result = await dataClient.tags.getObjectTagsBatch(sortedIds)
      if (result.error) throw new Error(result.error.message)
      const map: Record<string, Tag[]> = {}
      for (const entry of result.data) {
        map[entry.object_id] = entry.tags
      }
      return map
    },
    enabled: sortedIds.length > 0,
  })

  return { tagsByObject: data ?? EMPTY_BATCH, isLoading }
}

const EMPTY_COUNTS: Map<string, number> = new Map()

export function useTagCounts(tags: Tag[]): Map<string, number> {
  const dataClient = useDataClient()

  // N1 fix: Batch all tag counts into a single query instead of N individual queries
  const sortedTagIds = useMemo(
    () => tags.map(t => t.id).sort(),
    [tags]
  )

  const { data } = useQuery({
    queryKey: queryKeys.tags.countsByTags(sortedTagIds),
    queryFn: async () => {
      if (sortedTagIds.length === 0) return EMPTY_COUNTS
      const result = await dataClient.tags.countObjectsByTags(sortedTagIds)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? EMPTY_COUNTS
    },
    enabled: sortedTagIds.length > 0,
  })

  return data ?? EMPTY_COUNTS
}
