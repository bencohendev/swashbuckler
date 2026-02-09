'use client'

import { type ReactNode, useState } from 'react'
import { FileIcon, CopyIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { useTemplates } from '../hooks/useTemplates'
import { useObjectTypes } from '@/features/object-types'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import type { DataObject } from '@/shared/lib/data'

interface TemplateSelectorProps {
  trigger: ReactNode
  typeId?: string
  onCreateBlank: (typeId: string) => Promise<void>
  onSelectTemplate: (template: DataObject) => Promise<void>
  align?: 'start' | 'center' | 'end'
}

export function TemplateSelector({
  trigger,
  typeId,
  onCreateBlank,
  onSelectTemplate,
  align = 'start',
}: TemplateSelectorProps) {
  const { templates, isLoading: templatesLoading } = useTemplates()
  const { types } = useObjectTypes()
  const [open, setOpen] = useState(false)

  const handleCreateBlank = async (id: string) => {
    setOpen(false)
    await onCreateBlank(id)
  }

  const handleSelectTemplate = async (template: DataObject) => {
    setOpen(false)
    await onSelectTemplate(template)
  }

  // If typeId is provided, only show that type's blank option and templates
  const filteredTypes = typeId ? types.filter(t => t.id === typeId) : types
  const filteredTemplates = typeId
    ? templates.filter(t => t.type_id === typeId)
    : templates

  // Group templates by type
  const templatesByType = new Map<string, DataObject[]>()
  for (const template of filteredTemplates) {
    const existing = templatesByType.get(template.type_id) ?? []
    existing.push(template)
    templatesByType.set(template.type_id, existing)
  }

  const hasTemplates = filteredTemplates.length > 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        {filteredTypes.map(type => (
          <DropdownMenuItem key={type.id} onClick={() => handleCreateBlank(type.id)}>
            <TypeIcon icon={type.icon} className="size-4" />
            Blank {type.name}
          </DropdownMenuItem>
        ))}

        {!templatesLoading && hasTemplates && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Templates</DropdownMenuLabel>

            {types.map(type => {
              const typeTemplates = templatesByType.get(type.id)
              if (!typeTemplates || typeTemplates.length === 0) return null

              return (
                <div key={type.id}>
                  {!typeId && (
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {type.name}
                    </DropdownMenuLabel>
                  )}
                  {typeTemplates.map(template => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CopyIcon className="size-4" />
                      <span className="truncate">{template.title}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
