'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDataClient, type DataObject } from '@/shared/lib/data'

interface UseGlobalSearchReturn {
  query: string
  setQuery: (query: string) => void
  typeIds: string[]
  setTypeIds: (typeIds: string[]) => void
  results: DataObject[]
  isLoading: boolean
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const dataClient = useDataClient()
  const [query, setQuery] = useState('')
  const [typeIds, setTypeIds] = useState<string[]>([])
  const [results, setResults] = useState<DataObject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const performSearch = useCallback(async (q: string, tIds: string[]) => {
    if (!q.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const options = tIds.length > 0 ? { typeIds: tIds } : undefined
    const result = await dataClient.objects.search(q.trim(), options)

    if (!isMounted.current) return

    setResults(result.data)
    setIsLoading(false)
  }, [dataClient])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(() => {
      performSearch(query, typeIds)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, typeIds, performSearch])

  return { query, setQuery, typeIds, setTypeIds, results, isLoading }
}
