'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TrashIcon, MoreHorizontalIcon } from 'lucide-react'
import { useObject } from '../hooks/useObjects'
import { Button } from '@/shared/components/ui/Button'
import { useDataClient } from '@/shared/lib/data'

interface ObjectEditorProps {
  id: string
}

export function ObjectEditor({ id }: ObjectEditorProps) {
  const router = useRouter()
  const dataClient = useDataClient()
  const { object, isLoading, error, update } = useObject(id)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (object) {
      setTitle(object.title)
    }
  }, [object])

  const handleTitleChange = useCallback(async (newTitle: string) => {
    setTitle(newTitle)

    // Debounced auto-save
    setIsSaving(true)
    await update({ title: newTitle })
    setIsSaving(false)
  }, [update])

  const handleDelete = async () => {
    if (!object) return

    const confirmed = window.confirm('Move this to trash?')
    if (!confirmed) return

    await dataClient.objects.delete(object.id)
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-10 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/3 rounded bg-muted" />
      </div>
    )
  }

  if (error || !object) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error || 'Object not found'}</p>
        <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          {object.icon && <span className="text-2xl">{object.icon}</span>}
          <span className="text-sm text-muted-foreground capitalize">{object.type}</span>
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={handleDelete} title="Move to trash">
            <TrashIcon className="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" title="More options">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="mb-4 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
        />

        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground">
            Start writing here... (Editor coming soon)
          </p>
        </div>
      </main>
    </div>
  )
}
