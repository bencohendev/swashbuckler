'use client'

import { useState } from 'react'
import Link from 'next/link'
import { XIcon, UserPlusIcon, ShieldIcon, EyeOffIcon, ChevronDownIcon, TrashIcon, SettingsIcon } from 'lucide-react'
import type { SpaceShare, SpaceSharePermission } from '@/shared/lib/data'
import { useSpaceShares } from '../hooks/useSpaceShares'
import { Button } from '@/shared/components/ui/Button'
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
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setError(null)
    setIsSubmitting(true)
    const result = await createShare(email.trim(), permission)

    if (result && 'message' in result) {
      setError(result.message)
    } else {
      setEmail('')
      setPermission('view')
    }
    setIsSubmitting(false)
  }

  const handlePermissionChange = async (share: SpaceShare, newPermission: SpaceSharePermission) => {
    await updateShare(share.id, newPermission)
  }

  const handleRemove = async (shareId: string) => {
    const confirmed = window.confirm('Remove this user\'s access?')
    if (confirmed) {
      await deleteShare(shareId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg rounded-lg border bg-background shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Share &quot;{spaceName}&quot;</h2>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              <select
                value={permission}
                onChange={e => setPermission(e.target.value as SpaceSharePermission)}
                className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
              <Button type="submit" size="sm" disabled={isSubmitting || !email.trim()}>
                <UserPlusIcon className="size-4" />
                Share
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {shares.length > 0 ? `Shared with (${shares.length})` : 'Not shared with anyone'}
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : (
              shares.map(share => (
                <div key={share.id}>
                  <div className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                      {share.shared_with_email[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{share.shared_with_email}</p>
                    </div>
                    <select
                      value={share.permission}
                      onChange={e => handlePermissionChange(share, e.target.value as SpaceSharePermission)}
                      className="rounded border bg-background px-2 py-1 text-xs outline-none"
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setExpandedShareId(expandedShareId === share.id ? null : share.id)}
                      className="flex items-center gap-1 rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <EyeOffIcon className="size-3.5" />
                      Exclusions
                      <ChevronDownIcon className={`size-3.5 transition-transform ${expandedShareId === share.id ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(share.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove access"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                  {expandedShareId === share.id && (
                    <div className="ml-11 mt-2 mb-3">
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

          <div className="border-t pt-4">
            <Link
              href="/settings/sharing"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="size-4" />
              Manage sharing settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
