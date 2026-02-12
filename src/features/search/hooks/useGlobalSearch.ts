'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useDataClient, type DataObject, type Tag } from '@/shared/lib/data'
import { useTags } from '@/features/tags'

interface UseGlobalSearchReturn {
  query: string
  setQuery: (query: string) => void
  typeIds: string[]
  setTypeIds: (typeIds: string[]) => void
  results: DataObject[]
  tagResults: Tag[]
  isLoading: boolean
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const dataClient = useDataClient()
  const { tags } = useTags()
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

  // Client-side tag filtering — instant, no debounce needed
  const tagResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return tags.filter(t => t.name.toLowerCase().includes(q))
  }, [query, tags])

  return { query, setQuery, typeIds, setTypeIds, results, tagResults, isLoading }
}
