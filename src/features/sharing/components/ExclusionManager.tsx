'use client'

import { useState, useEffect } from 'react'
import type { ShareExclusion, CreateShareExclusionInput, ObjectType } from '@/shared/lib/data'
import { useObjectTypes } from '@/features/object-types'

interface ExclusionManagerProps {
  shareId: string
  loadExclusions: (shareId: string) => Promise<ShareExclusion[]>
  addExclusion: (shareId: string, input: CreateShareExclusionInput) => Promise<ShareExclusion | null>
  removeExclusion: (exclusionId: string) => Promise<void>
}

export function ExclusionManager({ shareId, loadExclusions, addExclusion, removeExclusion }: ExclusionManagerProps) {
  const { types } = useObjectTypes()
  const [exclusions, setExclusions] = useState<ShareExclusion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const data = await loadExclusions(shareId)
      setExclusions(data)
      setIsLoading(false)
    }
    load()
  }, [shareId, loadExclusions])

  const typeExclusions = exclusions.filter(e => e.excluded_type_id && !e.excluded_field && !e.excluded_object_id)
  const fieldExclusions = exclusions.filter(e => e.excluded_type_id && e.excluded_field)
  const excludedTypeIds = new Set(typeExclusions.map(e => e.excluded_type_id))

  // Only show non-built-in types for exclusion
  const customTypes = types.filter(t => !t.is_built_in)

  const handleToggleType = async (type: ObjectType) => {
    const existing = typeExclusions.find(e => e.excluded_type_id === type.id)
    if (existing) {
      await removeExclusion(existing.id)
      setExclusions(prev => prev.filter(e => e.id !== existing.id))
    } else {
      const result = await addExclusion(shareId, { excluded_type_id: type.id })
      if (result) {
        setExclusions(prev => [...prev, result])
      }
    }
  }

  const handleToggleField = async (typeId: string, fieldId: string) => {
    const existing = fieldExclusions.find(e => e.excluded_type_id === typeId && e.excluded_field === fieldId)
    if (existing) {
      await removeExclusion(existing.id)
      setExclusions(prev => prev.filter(e => e.id !== existing.id))
    } else {
      const result = await addExclusion(shareId, { excluded_type_id: typeId, excluded_field: fieldId })
      if (result) {
        setExclusions(prev => [...prev, result])
      }
    }
  }

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading exclusions...</div>
  }

  return (
    <div className="space-y-4 rounded-md border p-3">
      <h4 className="text-xs font-medium uppercase text-muted-foreground">Exclusions</h4>

      {customTypes.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Hide entire types</h5>
          <div className="space-y-1">
            {customTypes.map(type => (
              <label key={type.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={excludedTypeIds.has(type.id)}
                  onChange={() => handleToggleType(type)}
                  className="rounded border-muted-foreground"
                />
                <span>{type.icon}</span>
                <span>{type.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Field exclusions — show fields for types that have fields */}
      {types.filter(t => t.fields.length > 0 && !excludedTypeIds.has(t.id)).length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Hide specific fields</h5>
          {types.filter(t => t.fields.length > 0 && !excludedTypeIds.has(t.id)).map(type => (
            <div key={type.id} className="space-y-1">
              <p className="text-xs font-medium">{type.icon} {type.name}</p>
              <div className="ml-4 space-y-1">
                {type.fields.map(field => {
                  const isExcluded = fieldExclusions.some(
                    e => e.excluded_type_id === type.id && e.excluded_field === field.id
                  )
                  return (
                    <label key={field.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        onChange={() => handleToggleField(type.id, field.id)}
                        className="rounded border-muted-foreground"
                      />
                      <span>{field.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {customTypes.length === 0 && types.every(t => t.fields.length === 0) && (
        <p className="text-xs text-muted-foreground">No custom types or fields to exclude.</p>
      )}
    </div>
  )
}
