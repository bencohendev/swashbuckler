'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import type { ShareExclusion, CreateShareExclusionInput, ObjectType } from '@/shared/lib/data'
import { useObjectTypes, TypeIcon } from '@/features/object-types'
import { useObjects } from '@/features/objects'
import { cn } from '@/shared/lib/utils'

interface ExclusionManagerProps {
  shareId: string
  loadExclusions: (shareId: string) => Promise<ShareExclusion[]>
  addExclusion: (shareId: string, input: CreateShareExclusionInput) => Promise<ShareExclusion | null>
  removeExclusion: (exclusionId: string) => Promise<void>
  spaceExclusions?: ShareExclusion[]
  onExclusionsChange?: () => void
}

export function ExclusionManager({ shareId, loadExclusions, addExclusion, removeExclusion, spaceExclusions = [], onExclusionsChange }: ExclusionManagerProps) {
  const { types } = useObjectTypes()
  const { objects } = useObjects({ isDeleted: false })
  const [exclusions, setExclusions] = useState<ShareExclusion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set())

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
  const objectExclusions = exclusions.filter(e => e.excluded_object_id)
  const excludedTypeIds = useMemo(() => new Set(typeExclusions.map(e => e.excluded_type_id)), [typeExclusions])
  const excludedObjectIds = useMemo(() => new Set(objectExclusions.map(e => e.excluded_object_id)), [objectExclusions])

  // Space-wide exclusion sets (shown as disabled in per-user lists)
  const spaceTypeIds = useMemo(() => new Set(
    spaceExclusions
      .filter(e => e.excluded_type_id && !e.excluded_field && !e.excluded_object_id)
      .map(e => e.excluded_type_id)
  ), [spaceExclusions])
  const spaceObjectIds = useMemo(() => new Set(
    spaceExclusions.filter(e => e.excluded_object_id).map(e => e.excluded_object_id)
  ), [spaceExclusions])
  const spaceFieldKeys = useMemo(() => new Set(
    spaceExclusions
      .filter(e => e.excluded_type_id && e.excluded_field)
      .map(e => `${e.excluded_type_id}:${e.excluded_field}`)
  ), [spaceExclusions])

  // Combined sets (for filtering visible types / objects)
  const allExcludedTypeIds = useMemo(() => new Set([...excludedTypeIds, ...spaceTypeIds]), [excludedTypeIds, spaceTypeIds])

  const objectsByType = useMemo(() => {
    const grouped = new Map<string, typeof objects>()
    for (const obj of objects) {
      if (allExcludedTypeIds.has(obj.type_id)) continue
      const existing = grouped.get(obj.type_id) ?? []
      existing.push(obj)
      grouped.set(obj.type_id, existing)
    }
    return grouped
    // eslint-disable-next-line react-hooks/exhaustive-deps -- allExcludedTypeIds derived from exclusions + spaceExclusions
  }, [objects, exclusions, spaceExclusions])

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
    onExclusionsChange?.()
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
    onExclusionsChange?.()
  }

  const handleToggleObject = async (objectId: string) => {
    const existing = objectExclusions.find(e => e.excluded_object_id === objectId)
    if (existing) {
      await removeExclusion(existing.id)
      setExclusions(prev => prev.filter(e => e.id !== existing.id))
    } else {
      const result = await addExclusion(shareId, { excluded_object_id: objectId })
      if (result) {
        setExclusions(prev => [...prev, result])
      }
    }
    onExclusionsChange?.()
  }

  const toggleCollapsed = (typeId: string) => {
    setCollapsedTypes(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return next
    })
  }

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading exclusions...</div>
  }

  const visibleTypes = types.filter(t => !allExcludedTypeIds.has(t.id))

  return (
    <div className="space-y-4 rounded-md border p-3">
      <h4 className="text-xs font-medium uppercase text-muted-foreground">Exclusions</h4>

      {types.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Hide entire types</h5>
          <div className="space-y-1">
            {types.map(type => {
              const isSpaceWide = spaceTypeIds.has(type.id)
              return (
                <label key={type.id} className={cn('flex items-center gap-2 text-sm', isSpaceWide && 'opacity-60')}>
                  <input
                    type="checkbox"
                    checked={excludedTypeIds.has(type.id) || isSpaceWide}
                    onChange={() => handleToggleType(type)}
                    disabled={isSpaceWide}
                    className="rounded border-muted-foreground"
                  />
                  <TypeIcon icon={type.icon} className="size-4" />
                  <span>{type.plural_name}</span>
                  {isSpaceWide && <span className="text-xs text-muted-foreground">(space-wide)</span>}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Object exclusions — expandable type sections */}
      {visibleTypes.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Hide specific entries</h5>
          <div className="space-y-1">
            {visibleTypes.map(type => {
              const typeObjects = objectsByType.get(type.id) ?? []
              if (typeObjects.length === 0) return null
              const isCollapsed = collapsedTypes.has(type.id)
              return (
                <div key={type.id}>
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(type.id)}
                    className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-sm hover:bg-accent"
                  >
                    <ChevronRightIcon
                      className={cn('size-3.5 shrink-0 transition-transform', !isCollapsed && 'rotate-90')}
                    />
                    <TypeIcon icon={type.icon} className="size-4 shrink-0" />
                    <span className="font-medium">{type.plural_name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{typeObjects.length}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="ml-5 space-y-0.5 py-0.5">
                      {typeObjects.map(obj => {
                        const isSpaceWide = spaceObjectIds.has(obj.id)
                        return (
                          <label key={obj.id} className={cn('flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent', isSpaceWide && 'opacity-60')}>
                            <input
                              type="checkbox"
                              checked={excludedObjectIds.has(obj.id) || isSpaceWide}
                              onChange={() => handleToggleObject(obj.id)}
                              disabled={isSpaceWide}
                              className="rounded border-muted-foreground"
                            />
                            <span className="truncate">{obj.title || 'Untitled'}</span>
                            {isSpaceWide && <span className="shrink-0 text-xs text-muted-foreground">(space-wide)</span>}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Field exclusions — show fields for types that have fields */}
      {visibleTypes.filter(t => t.fields.length > 0).length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Hide specific fields</h5>
          {visibleTypes.filter(t => t.fields.length > 0).map(type => (
            <div key={type.id} className="space-y-1">
              <p className="flex items-center gap-1 text-xs font-medium"><TypeIcon icon={type.icon} className="size-3.5" /> {type.plural_name}</p>
              <div className="ml-4 space-y-1">
                {type.fields.map(field => {
                  const isExcluded = fieldExclusions.some(
                    e => e.excluded_type_id === type.id && e.excluded_field === field.id
                  )
                  const isSpaceWide = spaceFieldKeys.has(`${type.id}:${field.id}`)
                  return (
                    <label key={field.id} className={cn('flex items-center gap-2 text-sm', isSpaceWide && 'opacity-60')}>
                      <input
                        type="checkbox"
                        checked={isExcluded || isSpaceWide}
                        onChange={() => handleToggleField(type.id, field.id)}
                        disabled={isSpaceWide}
                        className="rounded border-muted-foreground"
                      />
                      <span>{field.name}</span>
                      {isSpaceWide && <span className="text-xs text-muted-foreground">(space-wide)</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
