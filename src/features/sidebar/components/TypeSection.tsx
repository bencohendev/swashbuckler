'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, EyeIcon, PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { ContextMenu } from 'radix-ui'
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
  onDelete?: (typeId: string) => Promise<void>
}

function getStorageKey(typeId: string) {
  return `sidebar-collapsed-${typeId}`
}

const menuItemClass =
  'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

export function TypeSection({
  type,
  objects,
  isLoading,
  isDragging,
  hideCreateButton,
  onCreateBlank,
  onSelectTemplate,
  onDelete,
}: TypeSectionProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(getStorageKey(type.id)) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(getStorageKey(type.id), String(collapsed))
  }, [collapsed, type.id])

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${type.name}" type? Objects of this type will not be deleted, but they will lose their type association.`
    )
    if (confirmed) {
      onDelete?.(type.id)
    }
  }

  return (
    <div className={cn(isDragging && 'opacity-40')}>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div className="mb-1 flex items-center justify-between px-2">
            <div className="flex flex-1 items-center gap-1 text-xs font-medium text-muted-foreground">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hover:text-foreground"
              >
                <ChevronRightIcon
                  className={cn(
                    'size-3 transition-transform',
                    !collapsed && 'rotate-90'
                  )}
                />
              </button>
              <button
                onClick={() => router.push(`/types/${type.slug}`)}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <TypeIcon icon={type.icon} className="size-3.5" />
                <span>{type.plural_name}</span>
                <span className="ml-1 text-muted-foreground/60">{objects.length}</span>
              </button>
            </div>
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
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className="bg-popover text-popover-foreground z-50 min-w-[160px] overflow-hidden rounded-md border p-1 shadow-md animate-in fade-in-0 zoom-in-95">
            <ContextMenu.Item
              className={cn(menuItemClass, 'focus:bg-accent focus:text-accent-foreground')}
              onSelect={() => router.push(`/types/${type.slug}`)}
            >
              <EyeIcon />
              View all {type.plural_name.toLowerCase()}
            </ContextMenu.Item>
            {!type.is_built_in && (
              <>
                <ContextMenu.Item
                  className={cn(menuItemClass, 'focus:bg-accent focus:text-accent-foreground')}
                  onSelect={() => router.push('/settings/types')}
                >
                  <PencilIcon />
                  Edit type
                </ContextMenu.Item>
                <ContextMenu.Separator className="bg-border -mx-1 my-1 h-px" />
                <ContextMenu.Item
                  className={cn(menuItemClass, 'text-destructive focus:bg-destructive/10 focus:text-destructive')}
                  onSelect={handleDelete}
                >
                  <TrashIcon />
                  Delete type
                </ContextMenu.Item>
              </>
            )}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
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
