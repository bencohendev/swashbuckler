'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  useDataClient,
  type Tag,
  type CreateTagInput,
  type UpdateTagInput,
} from '@/shared/lib/data'
import { emit, subscribe } from '@/shared/lib/data/events'

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
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const hasFetched = useRef(false)

  const fetchTags = useCallback(async () => {
    if (!hasFetched.current) {
      setIsLoading(true)
    }
    setError(null)

    const result = await dataClient.tags.list()

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setTags([])
    } else {
      setTags(result.data)
    }

    hasFetched.current = true
    setIsLoading(false)
  }, [dataClient])

  useEffect(() => {
    isMounted.current = true
    hasFetched.current = false
    fetchTags()
    const unsubscribe = subscribe('tags', fetchTags)
    return () => { isMounted.current = false; unsubscribe() }
  }, [fetchTags])

  const create = useCallback(async (input: CreateTagInput): Promise<Tag | null> => {
    const result = await dataClient.tags.create(input)
    if (result.error) {
      setError(result.error.message)
      return null
    }
    emit('tags')
    return result.data
  }, [dataClient])

  const update = useCallback(async (id: string, input: UpdateTagInput): Promise<Tag | null> => {
    const result = await dataClient.tags.update(id, input)
    if (result.error) {
      setError(result.error.message)
      return null
    }
    emit('tags')
    return result.data
  }, [dataClient])

  const remove = useCallback(async (id: string): Promise<void> => {
    const result = await dataClient.tags.delete(id)
    if (result.error) {
      setError(result.error.message)
      return
    }
    emit('tags')
  }, [dataClient])

  return { tags, isLoading, error, refetch: fetchTags, create, update, remove }
}

interface UseObjectTagsReturn {
  tags: Tag[]
  isLoading: boolean
  addTag: (tagId: string) => Promise<void>
  removeTag: (tagId: string) => Promise<void>
}

export function useObjectTags(objectId: string): UseObjectTagsReturn {
  const dataClient = useDataClient()
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)
  const hasFetched = useRef(false)

  const fetchTags = useCallback(async () => {
    if (!hasFetched.current) {
      setIsLoading(true)
    }

    const result = await dataClient.tags.getObjectTags(objectId)

    if (!isMounted.current) return

    if (!result.error) {
      setTags(result.data)
    }

    hasFetched.current = true
    setIsLoading(false)
  }, [dataClient, objectId])

  useEffect(() => {
    isMounted.current = true
    hasFetched.current = false
    fetchTags()
    const unsubscribe = subscribe('tags', fetchTags)
    return () => { isMounted.current = false; unsubscribe() }
  }, [fetchTags])

  const addTag = useCallback(async (tagId: string) => {
    await dataClient.tags.addTagToObject(objectId, tagId)
    emit('tags')
  }, [dataClient, objectId])

  const removeTag = useCallback(async (tagId: string) => {
    await dataClient.tags.removeTagFromObject(objectId, tagId)
    emit('tags')
  }, [dataClient, objectId])

  return { tags, isLoading, addTag, removeTag }
}
