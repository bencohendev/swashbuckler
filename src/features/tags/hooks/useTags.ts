'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
