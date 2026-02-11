'use client'

import { useState, useEffect } from 'react'
import { ChevronRightIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DataObject, ObjectType, Template } from '@/shared/lib/data'
import { ObjectList } from '@/features/objects/components'
import { TemplateSelector } from '@/features/templates'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { Button } from '@/shared/components/ui/Button'

interface TypeSectionProps {
  type: ObjectType
  objects: DataObject[]
  isLoading: boolean
  isDragging?: boolean
  hideCreateButton?: boolean
  onCreateBlank: (typeId: string) => Promise<void>
  onSelectTemplate: (template: Template) => Promise<void>
}

function getStorageKey(typeId: string) {
  return `sidebar-collapsed-${typeId}`
}

export function TypeSection({
  type,
  objects,
  isLoading,
  isDragging,
  hideCreateButton,
  onCreateBlank,
  onSelectTemplate,
}: TypeSectionProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(getStorageKey(type.id)) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(getStorageKey(type.id), String(collapsed))
  }, [collapsed, type.id])

  return (
    <div className={cn(isDragging && 'opacity-40')}>
      <div className="mb-1 flex items-center justify-between px-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex flex-1 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronRightIcon
            className={cn(
              'size-3 transition-transform',
              !collapsed && 'rotate-90'
            )}
          />
          <TypeIcon icon={type.icon} className="size-3.5" />
          <span>{type.plural_name}</span>
          <span className="ml-1 text-muted-foreground/60">{objects.length}</span>
        </button>
        {!hideCreateButton && (
          <TemplateSelector
            typeId={type.id}
            trigger={
              <Button
                size="icon-xs"
                variant="ghost"
                title={`Create new ${type.name}`}
              >
                <PlusIcon className="size-3" />
              </Button>
            }
            onCreateBlank={onCreateBlank}
            onSelectTemplate={onSelectTemplate}
          />
        )}
      </div>
      {!collapsed && (
        <div className="pl-8">
          <ObjectList
            objects={objects}
            objectType={type}
            isLoading={isLoading}
            emptyMessage={`No ${type.plural_name.toLowerCase()} yet`}
            compact
          />
        </div>
      )}
    </div>
  )
}
