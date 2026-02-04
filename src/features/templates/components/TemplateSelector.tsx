'use client'

import { type ReactNode, useState } from 'react'
import { FileIcon, FileTextIcon, CopyIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { useTemplates } from '../hooks/useTemplates'
import type { DataObject } from '@/shared/lib/data'

interface TemplateSelectorProps {
  trigger: ReactNode
  onCreateBlank: (type: 'page' | 'note') => Promise<void>
  onSelectTemplate: (template: DataObject) => Promise<void>
  align?: 'start' | 'center' | 'end'
}

export function TemplateSelector({
  trigger,
  onCreateBlank,
  onSelectTemplate,
  align = 'start',
}: TemplateSelectorProps) {
  const { templates, isLoading } = useTemplates()
  const [open, setOpen] = useState(false)

  const pageTemplates = templates.filter(t => t.type === 'page')
  const noteTemplates = templates.filter(t => t.type === 'note')
  const hasTemplates = pageTemplates.length > 0 || noteTemplates.length > 0

  const handleCreateBlank = async (type: 'page' | 'note') => {
    setOpen(false)
    await onCreateBlank(type)
  }

  const handleSelectTemplate = async (template: DataObject) => {
    setOpen(false)
    await onSelectTemplate(template)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleCreateBlank('page')}>
          <FileIcon className="size-4" />
          Blank Page
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCreateBlank('note')}>
          <FileTextIcon className="size-4" />
          Blank Note
        </DropdownMenuItem>

        {!isLoading && hasTemplates && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Templates</DropdownMenuLabel>

            {pageTemplates.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Pages
                </DropdownMenuLabel>
                {pageTemplates.map(template => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CopyIcon className="size-4" />
                    <span className="truncate">{template.title}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {noteTemplates.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Notes
                </DropdownMenuLabel>
                {noteTemplates.map(template => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CopyIcon className="size-4" />
                    <span className="truncate">{template.title}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
