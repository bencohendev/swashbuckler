'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { useObjects } from '../hooks/useObjects'
import { useNextTitle } from '../hooks/useNextTitle'
import { useObjectTypes } from '@/features/object-types'

interface CreateObjectButtonProps {
  parentId?: string
  onCreated?: (id: string) => void
}

export function CreateObjectButton({ parentId, onCreated }: CreateObjectButtonProps) {
  const { create } = useObjects({ enabled: false })
  const { types } = useObjectTypes()
  const getNextTitle = useNextTitle()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (typeId: string, typeName: string) => {
    setIsCreating(true)

    const result = await create({
      title: getNextTitle(typeId, typeName),
      type_id: typeId,
      parent_id: parentId ?? null,
    })

    setIsCreating(false)

    if (result) {
      onCreated?.(result.id)
    }
  }

  return (
    <div className="flex gap-1">
      {types.map(type => (
        <Button
          key={type.id}
          size="sm"
          variant="ghost"
          onClick={() => handleCreate(type.id, type.name)}
          disabled={isCreating}
        >
          <PlusIcon className="size-4" />
          {type.name}
        </Button>
      ))}
    </div>
  )
}
