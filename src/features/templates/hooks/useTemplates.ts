'use client'

import { useCallback } from 'react'
import { useDataClient, type DataObject, type CreateObjectInput } from '@/shared/lib/data'
import { useObjects } from '@/features/objects/hooks/useObjects'

interface UseTemplatesOptions {
  type?: 'page' | 'note'
  enabled?: boolean
}

interface UseTemplatesReturn {
  templates: DataObject[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createFromTemplate: (templateId: string, title?: string, parentId?: string | null) => Promise<DataObject | null>
  markAsTemplate: (objectId: string) => Promise<DataObject | null>
  unmarkAsTemplate: (objectId: string) => Promise<DataObject | null>
  deleteTemplate: (id: string, permanent?: boolean) => Promise<void>
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const { type, enabled = true } = options
  const dataClient = useDataClient()

  const {
    objects: templates,
    isLoading,
    error,
    refetch,
    update,
    remove,
  } = useObjects({
    isTemplate: true,
    isDeleted: false,
    type,
    enabled,
  })

  const createFromTemplate = useCallback(async (
    templateId: string,
    title?: string,
    parentId?: string | null
  ): Promise<DataObject | null> => {
    // Fetch the template
    const templateResult = await dataClient.objects.get(templateId)
    if (templateResult.error || !templateResult.data) {
      return null
    }

    const template = templateResult.data

    // Create a new object based on the template
    const input: CreateObjectInput = {
      title: title || `Copy of ${template.title}`,
      type: template.type,
      parent_id: parentId ?? null,
      icon: template.icon,
      cover_image: template.cover_image,
      properties: { ...template.properties },
      content: template.content ? JSON.parse(JSON.stringify(template.content)) : null,
      is_template: false,
    }

    const result = await dataClient.objects.create(input)
    if (result.error) {
      return null
    }

    return result.data
  }, [dataClient])

  const markAsTemplate = useCallback(async (objectId: string): Promise<DataObject | null> => {
    const result = await update(objectId, { is_template: true })
    return result
  }, [update])

  const unmarkAsTemplate = useCallback(async (objectId: string): Promise<DataObject | null> => {
    const result = await update(objectId, { is_template: false })
    return result
  }, [update])

  const deleteTemplate = useCallback(async (id: string, permanent = false): Promise<void> => {
    await remove(id, permanent)
  }, [remove])

  return {
    templates,
    isLoading,
    error,
    refetch,
    createFromTemplate,
    markAsTemplate,
    unmarkAsTemplate,
    deleteTemplate,
  }
}
