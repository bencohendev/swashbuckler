'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDataClient, type DataObject, type ListObjectsOptions, type CreateObjectInput, type UpdateObjectInput } from '@/shared/lib/data'
import { emit, subscribe } from '@/shared/lib/data/events'

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
  const { enabled = true, parentId, typeId, isDeleted, limit, offset } = options
  const dataClient = useDataClient()
  const [objects, setObjects] = useState<DataObject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const queryOptions = useMemo<ListObjectsOptions>(() => ({
    parentId,
    typeId,
    isDeleted,
    limit,
    offset,
  }), [parentId, typeId, isDeleted, limit, offset])

  const hasFetched = useRef(false)

  const fetchObjects = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    if (!hasFetched.current) {
      setIsLoading(true)
    }
    setError(null)

    const result = await dataClient.objects.list(queryOptions)

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setObjects([])
    } else {
      setObjects(result.data)
    }

    hasFetched.current = true
    setIsLoading(false)
  }, [dataClient, enabled, queryOptions])

  useEffect(() => {
    isMounted.current = true
    hasFetched.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchObjects()
    const unsubscribe = subscribe('objects', fetchObjects)
    return () => { isMounted.current = false; unsubscribe() }
  }, [fetchObjects])

  const create = useCallback(async (input: CreateObjectInput): Promise<DataObject | null> => {
    const result = await dataClient.objects.create(input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    emit('objects')
    return result.data
  }, [dataClient])

  const update = useCallback(async (id: string, input: UpdateObjectInput): Promise<DataObject | null> => {
    const result = await dataClient.objects.update(id, input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    emit('objects')
    return result.data
  }, [dataClient])

  const remove = useCallback(async (id: string, permanent = false): Promise<void> => {
    const result = await dataClient.objects.delete(id, permanent)

    if (result.error) {
      setError(result.error.message)
      return
    }

    emit('objects')
  }, [dataClient])

  const restore = useCallback(async (id: string): Promise<DataObject | null> => {
    const result = await dataClient.objects.restore(id)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    emit('objects')
    return result.data
  }, [dataClient])

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

  const hasFetched = useRef(false)

  const fetchObject = useCallback(async () => {
    if (!id) {
      setObject(null)
      setIsLoading(false)
      return
    }

    if (!hasFetched.current) {
      setIsLoading(true)
    }
    setError(null)

    const result = await dataClient.objects.get(id)

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setObject(null)
    } else {
      setObject(result.data)
    }

    hasFetched.current = true
    setIsLoading(false)
  }, [dataClient, id])

  useEffect(() => {
    isMounted.current = true
    hasFetched.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchObject()
    const unsubscribe = subscribe('objects', fetchObject)
    return () => { isMounted.current = false; unsubscribe() }
  }, [fetchObject])

  const update = useCallback(async (input: UpdateObjectInput): Promise<DataObject | null> => {
    if (!id) return null

    const result = await dataClient.objects.update(id, input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    setObject(result.data)
    emit('objects')
    return result.data
  }, [dataClient, id])

  const remove = useCallback(async (permanent = false): Promise<void> => {
    if (!id) return

    const result = await dataClient.objects.delete(id, permanent)

    if (result.error) {
      setError(result.error.message)
      return
    }

    emit('objects')
  }, [dataClient, id])

  return {
    object,
    isLoading,
    error,
    refetch: fetchObject,
    update,
    remove,
  }
}
