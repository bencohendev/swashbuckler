'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArchiveIcon, ArrowLeftIcon, FolderIcon, Trash2Icon } from 'lucide-react'
import { useAuth, useCurrentSpace, useSpaces } from '@/shared/lib/data'
import type { Space } from '@/shared/lib/data'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { toast } from '@/shared/hooks/useToast'

export function SpacesSettings() {
  const { user, isGuest } = useAuth()
  const { space: currentSpace, spaces: allSpaces, switchSpace } = useCurrentSpace()
  const { update, remove, archiveSpace } = useSpaces()
  const router = useRouter()

  const ownedSpaces = isGuest ? allSpaces : allSpaces.filter(s => s.owner_id === user?.id)

  if (isGuest) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border p-6 text-center">
          <FolderIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Space management is not available in guest mode. Sign in to manage your spaces.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />
      <div className="space-y-1">
        {ownedSpaces.map(space => (
          <SpaceRow
            key={space.id}
            space={space}
            isCurrent={space.id === currentSpace?.id}
            canDelete={ownedSpaces.length > 1}
            canArchive={ownedSpaces.length > 1}
            onUpdate={update}
            onArchive={async (id) => {
              const wasCurrent = id === currentSpace?.id
              const result = await archiveSpace(id)
              if (result.error) {
                toast({ description: result.error, variant: 'destructive' })
                return
              }
              toast({ description: `"${space.name}" archived`, variant: 'success' })
              if (wasCurrent) router.push('/dashboard')
            }}
            onDelete={async (id) => {
              const wasCurrent = id === currentSpace?.id
              if (wasCurrent) {
                const next = ownedSpaces.find(s => s.id !== id)
                if (next) switchSpace(next.id)
              }
              const error = await remove(id)
              if (error) {
                toast({ description: `Failed to delete space: ${error}`, variant: 'destructive' })
                return
              }
              toast({ description: 'Space deleted', variant: 'success' })
              if (wasCurrent) router.push('/dashboard')
            }}
          />
        ))}
      </div>
    </div>
  )
}

function Header() {
  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Settings
      </Link>
      <h1 className="text-2xl font-semibold">Spaces</h1>
      <p className="text-muted-foreground">
        Manage your spaces.
      </p>
    </div>
  )
}

interface SpaceRowProps {
  space: Space
  isCurrent: boolean
  canDelete: boolean
  canArchive: boolean
  onUpdate: (id: string, input: { name?: string; icon?: string }) => Promise<{ data: Space | null; error?: string }>
  onArchive: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function SpaceRow({ space, isCurrent, canDelete, canArchive, onUpdate, onArchive, onDelete }: SpaceRowProps) {
  const [name, setName] = useState(space.name)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleNameChange = (newName: string) => {
    setName(newName)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const trimmed = newName.trim()
      if (trimmed && trimmed !== space.name) {
        onUpdate(space.id, { name: trimmed })
      }
    }, 500)
  }

  const handleNameBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = name.trim()
    if (!trimmed) {
      setName(space.name)
      return
    }
    if (trimmed !== space.name) {
      onUpdate(space.id, { name: trimmed })
    }
  }

  const handleIconChange = (emoji: string) => {
    onUpdate(space.id, { icon: emoji })
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
        <EmojiPicker value={space.icon ?? '📁'} onChange={handleIconChange}>
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-xl hover:bg-muted"
            aria-label={`Change icon for ${space.name}`}
          >
            {space.icon}
          </button>
        </EmojiPicker>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            onBlur={handleNameBlur}
            className="min-w-0 flex-1 rounded-md border-transparent bg-transparent px-2 py-1 text-sm outline-none hover:border-border hover:bg-muted/50 focus:border-border focus:bg-muted/50 focus:ring-1 focus:ring-ring"
            aria-label={`Space name for ${space.name}`}
          />
          {isCurrent && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Current
            </span>
          )}
        </div>

        {canArchive && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setArchiveConfirmOpen(true)}
            aria-label={`Archive ${space.name}`}
            className="shrink-0 text-muted-foreground hover:text-muted-foreground/80"
          >
            <ArchiveIcon className="size-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete ${space.name}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Archive space"
        description={`Archive "${space.name}"? It will be hidden but can be restored later.`}
        confirmLabel="Archive"
        onConfirm={() => onArchive(space.id)}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete space"
        description={`Permanently delete "${space.name}" and all its objects, types, and templates? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => onDelete(space.id)}
      />
    </>
  )
}
