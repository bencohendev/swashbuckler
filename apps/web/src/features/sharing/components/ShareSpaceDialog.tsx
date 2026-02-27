'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlusIcon, ShieldIcon, EyeOffIcon, ChevronDownIcon, TrashIcon, SettingsIcon } from 'lucide-react'
import type { SpaceShare, SpaceSharePermission } from '@/shared/lib/data'
import { useSpaceShares } from '../hooks/useSpaceShares'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/Dialog'
import { Input } from '@/shared/components/ui/Input'
import { Avatar, AvatarFallback } from '@/shared/components/ui/Avatar'
import { Separator } from '@/shared/components/ui/Separator'
import { toast } from '@/shared/hooks/useToast'
import { ExclusionManager } from './ExclusionManager'

interface ShareSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  spaceName: string
}

export function ShareSpaceDialog({ open, onOpenChange, spaceId, spaceName }: ShareSpaceDialogProps) {
  const { shares, isLoading, createShare, updateShare, deleteShare, loadExclusions, addExclusion, removeExclusion } = useSpaceShares(spaceId)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<SpaceSharePermission>('view')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    const result = await createShare(email.trim(), permission)

    if (result) {
      setEmail('')
      setPermission('view')
    }
    setIsSubmitting(false)
  }

  const handlePermissionChange = async (share: SpaceShare, newPermission: SpaceSharePermission) => {
    await updateShare(share.id, newPermission)
  }

  const handleRemove = async () => {
    if (!pendingRemoveId) return
    const ok = await deleteShare(pendingRemoveId)
    setPendingRemoveId(null)
    if (ok) {
      toast({ description: 'Access removed', variant: 'success' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldIcon className="size-5 text-muted-foreground" />
            Share &quot;{spaceName}&quot;
          </DialogTitle>
          <DialogDescription>
            Invite people to collaborate on this space
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Invite</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                className="flex-1"
              />
              <div className="flex gap-2">
                <select
                  value={permission}
                  onChange={e => setPermission(e.target.value as SpaceSharePermission)}
                  aria-label="Permission level"
                  className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
                <Button type="submit" size="sm" loading={isSubmitting} disabled={!email.trim()}>
                  <UserPlusIcon className="size-4" />
                  Share
                </Button>
              </div>
            </form>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {shares.length > 0 ? `People with access (${shares.length})` : 'No one else has access'}
            </h3>
            {isLoading ? (
              <div role="status" aria-busy="true" aria-label="Loading shares" className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : (
              shares.map(share => (
                <div key={share.id}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md px-3 py-2 hover:bg-muted/50">
                    <Avatar size="sm">
                      <AvatarFallback className="text-xs font-medium uppercase">
                        {share.shared_with_email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{share.shared_with_email}</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={share.permission}
                        onChange={e => handlePermissionChange(share, e.target.value as SpaceSharePermission)}
                        aria-label={`Permission for ${share.shared_with_email}`}
                        className="h-8 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setExpandedShareId(expandedShareId === share.id ? null : share.id)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center gap-1 sm:min-h-0 sm:min-w-0 h-8 rounded border px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <EyeOffIcon className="size-3.5" />
                        Exclusions
                        <ChevronDownIcon className={`size-3.5 transition-transform ${expandedShareId === share.id ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRemoveId(share.id)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center sm:min-h-0 sm:min-w-0 h-8 w-8 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove access"
                        aria-label={`Remove access for ${share.shared_with_email}`}
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                  {expandedShareId === share.id && (
                    <div className="ml-9 mt-2 mb-3">
                      <ExclusionManager
                        shareId={share.id}
                        loadExclusions={loadExclusions}
                        addExclusion={addExclusion}
                        removeExclusion={removeExclusion}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <Separator />

          <Link
            href="/settings/sharing"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <SettingsIcon className="size-4" />
            Manage sharing settings
          </Link>
        </div>
      </DialogContent>
      <ConfirmDialog
        open={!!pendingRemoveId}
        onOpenChange={(open) => { if (!open) setPendingRemoveId(null) }}
        title="Remove access"
        description="Remove this user's access to the space?"
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemove}
      />
    </Dialog>
  )
}
