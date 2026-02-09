'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDataClient } from '@/shared/lib/data'
import type { Template, CreateTemplateInput, DataObject, CreateObjectInput } from '@/shared/lib/data'

interface UseTemplatesOptions {
  typeId?: string
  enabled?: boolean
}

interface UseTemplatesReturn {
  templates: Template[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createFromTemplate: (templateId: string, title?: string, parentId?: string | null) => Promise<DataObject | null>
  saveObjectAsTemplate: (object: DataObject, name?: string) => Promise<Template | null>
  deleteTemplate: (id: string) => Promise<void>
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const { typeId, enabled = true } = options
  const dataClient = useDataClient()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const fetchTemplates = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await dataClient.templates.list({ typeId })

    if (!isMounted.current) return

    if (result.error) {
      setError(result.error.message)
      setTemplates([])
    } else {
      setTemplates(result.data)
    }

    setIsLoading(false)
  }, [dataClient, enabled, typeId])

  useEffect(() => {
    isMounted.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchTemplates()
    return () => { isMounted.current = false }
  }, [fetchTemplates])

  const saveObjectAsTemplate = useCallback(async (
    object: DataObject,
    name?: string
  ): Promise<Template | null> => {
    const input: CreateTemplateInput = {
      name: name || `${object.title} (Template)`,
      type_id: object.type_id,
      icon: object.icon,
      cover_image: object.cover_image,
      properties: { ...object.properties },
      content: object.content ? JSON.parse(JSON.stringify(object.content)) : null,
    }

    const result = await dataClient.templates.create(input)
    if (result.error) {
      setError(result.error.message)
      return null
    }

    await fetchTemplates()
    return result.data
  }, [dataClient, fetchTemplates])

  const createFromTemplate = useCallback(async (
    templateId: string,
    title?: string,
    parentId?: string | null
  ): Promise<DataObject | null> => {
    const templateResult = await dataClient.templates.get(templateId)
    if (templateResult.error || !templateResult.data) {
      return null
    }

    const template = templateResult.data

    const input: CreateObjectInput = {
      title: title || `Copy of ${template.name}`,
      type_id: template.type_id,
      parent_id: parentId ?? null,
      icon: template.icon,
      cover_image: template.cover_image,
      properties: { ...template.properties },
      content: template.content ? JSON.parse(JSON.stringify(template.content)) : null,
    }

    const result = await dataClient.objects.create(input)
    if (result.error) {
      return null
    }

    return result.data
  }, [dataClient])

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    const result = await dataClient.templates.delete(id)
    if (result.error) {
      setError(result.error.message)
      return
    }
    await fetchTemplates()
  }, [dataClient, fetchTemplates])

  return {
    templates,
    isLoading,
    error,
    refetch: fetchTemplates,
    createFromTemplate,
    saveObjectAsTemplate,
    deleteTemplate,
  }
}
