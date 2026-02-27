'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataClient, useSpaceId, type Template, type UpdateTemplateInput } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useMutationAction } from '@/shared/hooks/useMutationAction'

interface UseTemplateReturn {
  template: Template | null
  isLoading: boolean
  error: string | null
  update: (input: UpdateTemplateInput) => Promise<Template | null>
}

export function useTemplate(id: string | null): UseTemplateReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const { data: template, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.templates.detail(id!),
    queryFn: async () => {
      const result = await dataClient.templates.get(id!)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!id,
    placeholderData: () => {
      const lists = queryClient.getQueriesData<Template[]>({
        queryKey: queryKeys.templates.all(spaceId ?? undefined),
      })
      for (const [, items] of lists) {
        const match = items?.find(t => t.id === id)
        if (match) return match
      }
      return undefined
    },
  })

  const updateFn = useCallback(
    (input: UpdateTemplateInput) => {
      if (!id) return Promise.resolve({ data: null, error: null } as { data: Template | null; error: null })
      return dataClient.templates.update(id, input)
    },
    [dataClient, id],
  )
  const updateRaw = useMutationAction(updateFn, {
    actionLabel: 'Update template',
    emitChannels: ['templates'],
  })
  const update = useCallback(async (input: UpdateTemplateInput): Promise<Template | null> => {
    const data = await updateRaw(input)
    if (data && id) {
      queryClient.setQueryData(queryKeys.templates.detail(id), data)
    }
    return data
  }, [updateRaw, id, queryClient])

  return {
    template: template ?? null,
    isLoading,
    error: queryError?.message ?? null,
    update,
  }
}
