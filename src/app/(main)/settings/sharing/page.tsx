'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeftIcon, UserPlusIcon, EyeOffIcon, ChevronDownIcon, TrashIcon, UsersIcon } from 'lucide-react'
import Link from 'next/link'
import type { SpaceShare, SpaceSharePermission, ShareExclusion } from '@/shared/lib/data'
import { useAuth, useCurrentSpace } from '@/shared/lib/data'
import { useSpaceShares, ExclusionManager } from '@/features/sharing'
import { Button } from '@/shared/components/ui/Button'

export default function SharingSettingsPage() {
  const { user, isGuest } = useAuth()
  const { space } = useCurrentSpace()

  if (isGuest) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border p-6 text-center">
          <UsersIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Sharing is not available in guest mode. Sign in to share your spaces with others.
          </p>
        </div>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="space-y-6">
        <Header />
        <p className="text-muted-foreground">No space selected.</p>
      </div>
    )
  }

  if (space.owner_id !== user?.id) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border p-6 text-center">
          <UsersIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            You can only manage sharing for spaces you own.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />
      <div className="rounded-lg border p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">{space.icon}</span>
          <h2 className="text-lg font-semibold">{space.name}</h2>
        </div>
        <SharingControls spaceId={space.id} />
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
      <h1 className="text-2xl font-semibold">Sharing</h1>
      <p className="text-muted-foreground">
        Manage who has access to your space.
      </p>
    </div>
  )
}

function SharingControls({ spaceId }: { spaceId: string }) {
  const { shares, isLoading, createShare, updateShare, deleteShare, loadExclusions, addExclusion, removeExclusion, loadSpaceExclusions, addSpaceExclusion } = useSpaceShares(spaceId)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<SpaceSharePermission>('view')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null)
  const [spaceExclusionsOpen, setSpaceExclusionsOpen] = useState(false)
  const [cachedSpaceExclusions, setCachedSpaceExclusions] = useState<ShareExclusion[]>([])

  const refreshSpaceExclusions = useCallback(async () => {
    const data = await loadSpaceExclusions(spaceId)
    setCachedSpaceExclusions(data)
  }, [loadSpaceExclusions, spaceId])

  useEffect(() => {
    refreshSpaceExclusions()
  }, [refreshSpaceExclusions])

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
    <div className="space-y-6">
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

      {shares.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setSpaceExclusionsOpen(!spaceExclusionsOpen)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted/50"
          >
            <EyeOffIcon className="size-4 text-muted-foreground" />
            <span className="font-medium">Space-wide exclusions</span>
            <span className="ml-auto text-xs text-muted-foreground">Hidden from all shared users</span>
            <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${spaceExclusionsOpen ? 'rotate-180' : ''}`} />
          </button>
          {spaceExclusionsOpen && (
            <div className="mt-2 ml-3">
              <ExclusionManager
                shareId={spaceId}
                loadExclusions={loadSpaceExclusions}
                addExclusion={addSpaceExclusion}
                removeExclusion={removeExclusion}
                onExclusionsChange={refreshSpaceExclusions}
              />
            </div>
          )}
        </div>
      )}

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
                    spaceExclusions={cachedSpaceExclusions}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
