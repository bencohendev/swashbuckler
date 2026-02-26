'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataClient, useSpaceId, type Template, type UpdateTemplateInput } from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

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
  })

  const update = useCallback(async (input: UpdateTemplateInput): Promise<Template | null> => {
    if (!id) return null
    const result = await dataClient.templates.update(id, input)
    if (result.error) return null
    // Optimistically update the detail cache
    queryClient.setQueryData(queryKeys.templates.detail(id), result.data)
    // Invalidate list queries so template name changes show up elsewhere
    queryClient.invalidateQueries({ queryKey: queryKeys.templates.all(spaceId ?? undefined) })
    emit('templates')
    return result.data
  }, [dataClient, id, queryClient, spaceId])

  return {
    template: template ?? null,
    isLoading,
    error: queryError?.message ?? null,
    update,
  }
}
