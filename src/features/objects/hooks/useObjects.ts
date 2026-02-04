'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDataClient, type DataObject, type ListObjectsOptions, type CreateObjectInput, type UpdateObjectInput } from '@/shared/lib/data'

interface UseObjectsOptions extends ListObjectsOptions {
  enabled?: boolean
}

interface UseObjectsReturn {
  objects: DataObject[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (input: CreateObjectInput) => Promise<DataObject | null>
  update: (id: string, input: UpdateObjectInput) => Promise<DataObject | null>
  remove: (id: string, permanent?: boolean) => Promise<void>
  restore: (id: string) => Promise<DataObject | null>
}

export function useObjects(options: UseObjectsOptions = {}): UseObjectsReturn {
  const { enabled = true, parentId, type, isDeleted, limit, offset } = options
  const dataClient = useDataClient()
  const [objects, setObjects] = useState<DataObject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const queryOptions = useMemo<ListObjectsOptions>(() => ({
    parentId,
    type,
    isDeleted,
    limit,
    offset,
  }), [parentId, type, isDeleted, limit, offset])

  const fetchObjects = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await dataClient.objects.list(queryOptions)

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setObjects([])
    } else {
      setObjects(result.data)
    }

    setIsLoading(false)
  }, [dataClient, enabled, queryOptions])

  useEffect(() => {
    isMounted.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchObjects()
    return () => { isMounted.current = false }
  }, [fetchObjects])

  const create = useCallback(async (input: CreateObjectInput): Promise<DataObject | null> => {
    const result = await dataClient.objects.create(input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    await fetchObjects()
    return result.data
  }, [dataClient, fetchObjects])

  const update = useCallback(async (id: string, input: UpdateObjectInput): Promise<DataObject | null> => {
    const result = await dataClient.objects.update(id, input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    await fetchObjects()
    return result.data
  }, [dataClient, fetchObjects])

  const remove = useCallback(async (id: string, permanent = false): Promise<void> => {
    const result = await dataClient.objects.delete(id, permanent)

    if (result.error) {
      setError(result.error.message)
      return
    }

    await fetchObjects()
  }, [dataClient, fetchObjects])

  const restore = useCallback(async (id: string): Promise<DataObject | null> => {
    const result = await dataClient.objects.restore(id)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    await fetchObjects()
    return result.data
  }, [dataClient, fetchObjects])

  return {
    objects,
    isLoading,
    error,
    refetch: fetchObjects,
    create,
    update,
    remove,
    restore,
  }
}

export function useObject(id: string | null) {
  const dataClient = useDataClient()
  const [object, setObject] = useState<DataObject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const fetchObject = useCallback(async () => {
    if (!id) {
      setObject(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await dataClient.objects.get(id)

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setObject(null)
    } else {
      setObject(result.data)
    }

    setIsLoading(false)
  }, [dataClient, id])

  useEffect(() => {
    isMounted.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchObject()
    return () => { isMounted.current = false }
  }, [fetchObject])

  const update = useCallback(async (input: UpdateObjectInput): Promise<DataObject | null> => {
    if (!id) return null

    const result = await dataClient.objects.update(id, input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    setObject(result.data)
    return result.data
  }, [dataClient, id])

  return {
    object,
    isLoading,
    error,
    refetch: fetchObject,
    update,
  }
}
