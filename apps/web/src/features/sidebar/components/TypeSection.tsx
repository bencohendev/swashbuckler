'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, CopyIcon, EllipsisIcon, EyeIcon, PencilIcon, PlusIcon, SettingsIcon, TrashIcon } from 'lucide-react'
import { ContextMenu } from 'radix-ui'
import { cn } from '@/shared/lib/utils'
import type { DataObjectSummary, ObjectType, Template } from '@/shared/lib/data'
import { ObjectList } from '@/features/objects/components'
import { useTemplates } from '@/features/templates'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { useCollapsible } from '@/features/sidebar/hooks/useCollapsible'
import type { CollapseSignal } from '@/features/sidebar/types'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { toast } from '@/shared/hooks/useToast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'

interface TypeSectionProps {
  type: ObjectType
  objects: DataObjectSummary[]
  isLoading: boolean
  isDragging?: boolean
  hideCreateButton?: boolean
  hideManageActions?: boolean
  collapseSignal?: CollapseSignal
  onCreateBlank: (typeId: string) => Promise<void>
  onSelectTemplate: (template: Template) => Promise<void>
  onDelete?: (typeId: string) => Promise<unknown>
}

const SIDEBAR_TYPE_LIMIT = 10

function getStorageKey(typeId: string) {
  return `sidebar-collapsed-${typeId}`
}

const menuItemClass =
  'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'

function TemplateSubMenu({ typeId, onSelectTemplate }: { typeId: string; onSelectTemplate: (template: Template) => Promise<void> }) {
  const { templates, isLoading } = useTemplates({ typeId })

  if (isLoading) {
    return (
      <DropdownMenuItem disabled>
        <CopyIcon />
        Create from template
      </DropdownMenuItem>
    )
  }

  if (templates.length === 0) {
    return (
      <DropdownMenuItem disabled>
        <CopyIcon />
        Create from template
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <CopyIcon />
        Create from template
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {templates.map((template) => (
          <DropdownMenuItem key={template.id} onSelect={() => onSelectTemplate(template)}>
            {template.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

export function TypeSection({
  type,
  objects,
  isLoading,
  isDragging,
  hideCreateButton,
  hideManageActions,
  collapseSignal,
  onCreateBlank,
  onSelectTemplate,
  onDelete,
}: TypeSectionProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useCollapsible(getStorageKey(type.id), collapseSignal)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const visibleObjects = useMemo(() => objects.slice(0, SIDEBAR_TYPE_LIMIT), [objects])
  const hasMore = objects.length > SIDEBAR_TYPE_LIMIT

  return (
    <div className={cn(isDragging && 'opacity-40')}>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div className="mb-1 flex items-center justify-between px-2">
            <div className="flex flex-1 items-center gap-1 text-xs font-medium text-muted-foreground">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="min-h-11 min-w-11 inline-flex items-center justify-center sm:min-h-0 sm:min-w-0 hover:text-foreground"
                aria-expanded={!collapsed}
                aria-controls={`type-section-${type.id}`}
                aria-label={`Toggle ${type.plural_name}`}
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
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <TypeIcon icon={type.icon} className="size-3.5" />
                <span>{type.plural_name}</span>
                <span className="ml-1 text-muted-foreground/60">{objects.length}</span>
              </button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  title={`${type.name} options`}
                  aria-label={`${type.name} options`}
                >
                  <EllipsisIcon className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => router.push(`/types/${type.slug}`)}>
                  <EyeIcon />
                  Open
                </DropdownMenuItem>
                {!hideCreateButton && (
                  <>
                    <DropdownMenuItem onSelect={() => onCreateBlank(type.id)}>
                      <PlusIcon />
                      Create
                    </DropdownMenuItem>
                    <TemplateSubMenu typeId={type.id} onSelectTemplate={onSelectTemplate} />
                  </>
                )}
                {!hideManageActions && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push(`/settings/types?edit=${type.id}`)}>
                      <SettingsIcon />
                      Type settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/settings/templates')}>
                      <CopyIcon />
                      Manage templates
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
            {!hideManageActions && (
              <>
                <ContextMenu.Item
                  className={cn(menuItemClass, 'focus:bg-accent focus:text-accent-foreground')}
                  onSelect={() => router.push(`/settings/types?edit=${type.id}`)}
                >
                  <PencilIcon />
                  Edit type
                </ContextMenu.Item>
                <ContextMenu.Separator className="bg-border -mx-1 my-1 h-px" />
                <ContextMenu.Item
                  className={cn(menuItemClass, 'text-destructive focus:bg-destructive/10 focus:text-destructive')}
                  onSelect={() => setConfirmDeleteOpen(true)}
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
        <div id={`type-section-${type.id}`} className="pl-8">
          <ObjectList
            objects={visibleObjects}
            objectType={type}
            isLoading={isLoading}
            emptyMessage={`No ${type.plural_name.toLowerCase()} yet`}
            compact
          />
          {hasMore && (
            <Link
              href={`/types/${type.slug}`}
              className="block cursor-pointer px-2 py-1 text-xs text-muted-foreground/70 hover:text-muted-foreground"
              aria-label={`See all ${objects.length} ${type.plural_name.toLowerCase()}`}
            >
              See all {objects.length}
            </Link>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete type"
        description={`Delete "${type.name}" type? All entries and templates of this type will also be deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const error = await onDelete?.(type.id)
          if (typeof error === 'string') {
            toast({ description: `Failed to delete type: ${error}`, variant: 'destructive' })
          } else {
            toast({ description: `Type "${type.name}" deleted`, variant: 'success' })
          }
        }}
      />
    </div>
  )
}
