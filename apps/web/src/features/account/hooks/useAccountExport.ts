'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { createSupabaseDataClient } from '@/shared/lib/data'

export function useAccountExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

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

        const [objectsRaw, types, templates, relations, tags] = await Promise.all([
          supabase.from('objects').select('*').eq('space_id', space.id),
          client.objectTypes.list(),
          client.templates.list(),
          client.relations.listAll(),
          client.tags.list(),
        ])

        const spaceObjects = objectsRaw.data ?? []
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

      // Fetch global object types (not tied to any space)
      const globalTypesResult = await unscoped.globalObjectTypes.list()

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        spaces,
        objects: allObjects,
        objectTypes: allObjectTypes,
        globalObjectTypes: globalTypesResult.data ?? [],
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
      if (!isMounted.current) return
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      if (isMounted.current) {
        setIsExporting(false)
      }
    }
  }

  return { exportData, isExporting, error }
}
