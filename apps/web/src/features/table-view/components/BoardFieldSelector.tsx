'use client'

import { ChevronDownIcon } from 'lucide-react'
import type { FieldDefinition } from '@/shared/lib/data'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/shared/components/ui/DropdownMenu'
import { Button } from '@/shared/components/ui/Button'

interface BoardFieldSelectorProps {
  selectFields: FieldDefinition[]
  selectedFieldId: string | null
  onSelect: (fieldId: string | null) => void
}

export function BoardFieldSelector({ selectFields, selectedFieldId, onSelect }: BoardFieldSelectorProps) {
  const selectedField = selectFields.find((f) => f.id === selectedFieldId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {selectedField ? `Group by: ${selectedField.name}` : 'Group by\u2026'}
          <ChevronDownIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Group by field</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {selectFields.map((field) => (
          <DropdownMenuCheckboxItem
            key={field.id}
            checked={field.id === selectedFieldId}
            onCheckedChange={() => onSelect(field.id === selectedFieldId ? null : field.id)}
          >
            {field.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
