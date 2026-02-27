'use client'

import { useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useDataClient, useSpaceId, type ListObjectsOptions } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { extractTextFromContent } from '@/features/search/lib/extractText'

const EMPTY_CONTENT: Record<string, string> = {}

export function useObjectContents(
  options: ListObjectsOptions,
  enabled: boolean,
): Record<string, string> {
  const dataClient = useDataClient()
  const spaceId = useSpaceId()

  const queryOptions = useMemo<ListObjectsOptions>(() => ({
    parentId: options.parentId,
    typeId: options.typeId,
    isDeleted: options.isDeleted,
    isArchived: options.isArchived,
  }), [options.parentId, options.typeId, options.isDeleted, options.isArchived])

  const { data } = useQuery({
    queryKey: queryKeys.objects.content(spaceId ?? undefined, queryOptions),
    queryFn: async () => {
      const result = await dataClient.objects.listContent(queryOptions)
      if (result.error) throw new Error(result.error.message)
      const map: Record<string, string> = {}
      for (const item of result.data) {
        map[item.id] = extractTextFromContent(item.content)
      }
      return map
    },
    enabled,
    placeholderData: keepPreviousData,
  })

  return data ?? EMPTY_CONTENT
}
