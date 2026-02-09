'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  useDataClient,
  type ObjectType,
  type CreateObjectTypeInput,
  type UpdateObjectTypeInput,
} from '@/shared/lib/data'

interface UseObjectTypesReturn {
  types: ObjectType[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (input: CreateObjectTypeInput) => Promise<ObjectType | null>
  update: (id: string, input: UpdateObjectTypeInput) => Promise<ObjectType | null>
  remove: (id: string) => Promise<void>
}

export function useObjectTypes(): UseObjectTypesReturn {
  const dataClient = useDataClient()
  const [types, setTypes] = useState<ObjectType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const fetchTypes = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await dataClient.objectTypes.list()

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setTypes([])
    } else {
      setTypes(result.data)
    }

    setIsLoading(false)
  }, [dataClient])

  useEffect(() => {
    isMounted.current = true
    fetchTypes()
    return () => { isMounted.current = false }
  }, [fetchTypes])

  const create = useCallback(async (input: CreateObjectTypeInput): Promise<ObjectType | null> => {
    const result = await dataClient.objectTypes.create(input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    await fetchTypes()
    return result.data
  }, [dataClient, fetchTypes])

  const update = useCallback(async (id: string, input: UpdateObjectTypeInput): Promise<ObjectType | null> => {
    const result = await dataClient.objectTypes.update(id, input)

    if (result.error) {
      setError(result.error.message)
      return null
    }

    await fetchTypes()
    return result.data
  }, [dataClient, fetchTypes])

  const remove = useCallback(async (id: string): Promise<void> => {
    const result = await dataClient.objectTypes.delete(id)

    if (result.error) {
      setError(result.error.message)
      return
    }

    await fetchTypes()
  }, [dataClient, fetchTypes])

  return {
    types,
    isLoading,
    error,
    refetch: fetchTypes,
    create,
    update,
    remove,
  }
}

export function useObjectType(id: string | null) {
  const dataClient = useDataClient()
  const [objectType, setObjectType] = useState<ObjectType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const fetchType = useCallback(async () => {
    if (!id) {
      setObjectType(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await dataClient.objectTypes.get(id)

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setObjectType(null)
    } else {
      setObjectType(result.data)
    }

    setIsLoading(false)
  }, [dataClient, id])

  useEffect(() => {
    isMounted.current = true
    fetchType()
    return () => { isMounted.current = false }
  }, [fetchType])

  return {
    objectType,
    isLoading,
    error,
    refetch: fetchType,
  }
}
