'use client'

import { useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { createSupabaseDataClient } from '@/shared/lib/data'

export function useAccountExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportData() {
    setIsExporting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch all spaces
      const unscoped = createSupabaseDataClient(supabase)
      const spacesResult = await unscoped.spaces.list()
      if (spacesResult.error) {
        throw new Error(spacesResult.error.message)
      }

      const spaces = spacesResult.data
      const allObjects: unknown[] = []
      const allObjectTypes: unknown[] = []
      const allTemplates: unknown[] = []
      const allRelations: unknown[] = []
      const allTags: unknown[] = []
      const allObjectTags: unknown[] = []

      for (const space of spaces) {
        const client = createSupabaseDataClient(supabase, space.id)

        const [objects, types, templates, relations, tags] = await Promise.all([
          client.objects.list(),
          client.objectTypes.list(),
          client.templates.list(),
          client.relations.listAll(),
          client.tags.list(),
        ])

        const spaceObjects = objects.data ?? []
        allObjects.push(...spaceObjects)
        allObjectTypes.push(...(types.data ?? []))
        allTemplates.push(...(templates.data ?? []))
        allRelations.push(...(relations.data ?? []))
        allTags.push(...(tags.data ?? []))

        // Fetch object_tags for objects in this space
        const objectIds = spaceObjects.map((o: { id: string }) => o.id)
        if (objectIds.length > 0) {
          const { data: objectTags } = await supabase
            .from('object_tags')
            .select('*')
            .in('object_id', objectIds)
          allObjectTags.push(...(objectTags ?? []))
        }
      }

      // Fetch pins (user-scoped, not space-scoped)
      const pinsResult = await unscoped.pins.list()

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        spaces,
        objects: allObjects,
        objectTypes: allObjectTypes,
        templates: allTemplates,
        objectRelations: allRelations,
        tags: allTags,
        objectTags: allObjectTags,
        pins: pinsResult.data ?? [],
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `swashbuckler-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return { exportData, isExporting, error }
}
