'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataClient, useSpaceId } from '@/shared/lib/data'
import type { Template, CreateTemplateInput, DataObject, CreateObjectInput } from '@/shared/lib/data'
import { emit } from '@/shared/lib/data/events'
import { queryKeys } from '@/shared/lib/data/queryKeys'

const EMPTY_TEMPLATES: Template[] = []
import {
  extractContentVariables,
  extractPropertyVariables,
  resolveContentVariables,
  resolvePropertyVariables,
  type VariableResolutionContext,
} from '../lib/variables'

interface UseTemplatesOptions {
  typeId?: string
  enabled?: boolean
}

interface TemplateVariableInfo {
  template: Template
  customVariables: string[]
  hasVariables: boolean
}

interface UseTemplatesReturn {
  templates: Template[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createFromTemplate: (templateId: string, title?: string, parentId?: string | null) => Promise<DataObject | null>
  createFromTemplateWithVariables: (
    templateId: string,
    customValues: Record<string, string>,
    context: VariableResolutionContext,
    title?: string,
    parentId?: string | null,
  ) => Promise<DataObject | null>
  getTemplateVariables: (templateId: string) => Promise<TemplateVariableInfo | null>
  saveObjectAsTemplate: (object: DataObject, name?: string) => Promise<Template | null>
  deleteTemplate: (id: string) => Promise<void>
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const { typeId, enabled = true } = options
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.templates.list(spaceId ?? undefined, typeId),
    queryFn: async () => {
      const result = await dataClient.templates.list({ typeId })
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled,
  })

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.templates.all(spaceId ?? undefined) })
  }, [queryClient, spaceId])

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
    if (result.error) return null
    emit('templates')
    return result.data
  }, [dataClient])

  const createFromTemplate = useCallback(async (
    templateId: string,
    title?: string,
    parentId?: string | null
  ): Promise<DataObject | null> => {
    const templateResult = await dataClient.templates.get(templateId)
    if (templateResult.error || !templateResult.data) return null

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
    if (result.error) return null
    emit('objects')
    return result.data
  }, [dataClient])

  const getTemplateVariables = useCallback(async (templateId: string): Promise<TemplateVariableInfo | null> => {
    const templateResult = await dataClient.templates.get(templateId)
    if (templateResult.error || !templateResult.data) return null

    const template = templateResult.data
    const contentVars = template.content ? extractContentVariables(template.content) : { builtIn: [], custom: [] }
    const propVars = template.properties ? extractPropertyVariables(template.properties) : { builtIn: [], custom: [] }

    const customSet = new Set([...contentVars.custom, ...propVars.custom])
    const hasBuiltIn = contentVars.builtIn.length > 0 || propVars.builtIn.length > 0
    const customVariables = [...customSet]

    return {
      template,
      customVariables,
      hasVariables: hasBuiltIn || customVariables.length > 0,
    }
  }, [dataClient])

  const createFromTemplateWithVariables = useCallback(async (
    templateId: string,
    customValues: Record<string, string>,
    context: VariableResolutionContext,
    title?: string,
    parentId?: string | null
  ): Promise<DataObject | null> => {
    const templateResult = await dataClient.templates.get(templateId)
    if (templateResult.error || !templateResult.data) return null

    const template = templateResult.data

    const resolvedContent = template.content
      ? resolveContentVariables(template.content, context, customValues)
      : null

    const resolvedProperties = template.properties
      ? resolvePropertyVariables(template.properties, context, customValues)
      : {}

    const input: CreateObjectInput = {
      title: title || `Copy of ${template.name}`,
      type_id: template.type_id,
      parent_id: parentId ?? null,
      icon: template.icon,
      cover_image: template.cover_image,
      properties: resolvedProperties,
      content: resolvedContent,
    }

    const result = await dataClient.objects.create(input)
    if (result.error) return null
    emit('objects')
    return result.data
  }, [dataClient])

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    const result = await dataClient.templates.delete(id)
    if (result.error) return
    emit('templates')
  }, [dataClient])

  return {
    templates: data ?? EMPTY_TEMPLATES,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
    createFromTemplate,
    createFromTemplateWithVariables,
    getTemplateVariables,
    saveObjectAsTemplate,
    deleteTemplate,
  }
}
