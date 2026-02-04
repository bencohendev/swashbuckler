'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { useObjects } from '../hooks/useObjects'

interface CreateObjectButtonProps {
  parentId?: string
  onCreated?: (id: string) => void
}

export function CreateObjectButton({ parentId, onCreated }: CreateObjectButtonProps) {
  const { create } = useObjects({ enabled: false })
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (type: 'page' | 'note') => {
    setIsCreating(true)

    const result = await create({
      title: type === 'page' ? 'Untitled Page' : 'Untitled Note',
      type,
      parent_id: parentId ?? null,
    })

    setIsCreating(false)

    if (result) {
      onCreated?.(result.id)
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleCreate('page')}
        disabled={isCreating}
      >
        <PlusIcon className="size-4" />
        Page
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleCreate('note')}
        disabled={isCreating}
      >
        <PlusIcon className="size-4" />
        Note
      </Button>
    </div>
  )
}
