'use client'

import { useState } from 'react'
import { ArrowLeftIcon, ShareIcon, UsersIcon } from 'lucide-react'
import Link from 'next/link'
import { useAuth, useCurrentSpace } from '@/shared/lib/data'
import { useSpaceShares, ShareSpaceDialog } from '@/features/sharing'
import { Button } from '@/shared/components/ui/Button'

export default function SharingSettingsPage() {
  const { user, isGuest } = useAuth()
  const { spaces } = useCurrentSpace()
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)

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

  const ownedSpaces = spaces.filter(s => s.owner_id === user?.id)

  return (
    <div className="space-y-6">
      <Header />

      {ownedSpaces.length === 0 ? (
        <p className="text-muted-foreground">No spaces to share.</p>
      ) : (
        <div className="space-y-3">
          {ownedSpaces.map(space => (
            <SpaceShareRow
              key={space.id}
              spaceId={space.id}
              spaceName={space.name}
              spaceIcon={space.icon}
              onManage={() => setActiveSpaceId(space.id)}
            />
          ))}
        </div>
      )}

      {activeSpaceId && (
        <ShareSpaceDialog
          open={!!activeSpaceId}
          onOpenChange={(open) => { if (!open) setActiveSpaceId(null) }}
          spaceId={activeSpaceId}
          spaceName={ownedSpaces.find(s => s.id === activeSpaceId)?.name ?? 'Space'}
        />
      )}
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
        Manage who has access to your spaces.
      </p>
    </div>
  )
}

function SpaceShareRow({
  spaceId,
  spaceName,
  spaceIcon,
  onManage,
}: {
  spaceId: string
  spaceName: string
  spaceIcon: string
  onManage: () => void
}) {
  const { shares, isLoading } = useSpaceShares(spaceId)

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <span className="text-xl">{spaceIcon}</span>
      <div className="flex-1">
        <p className="font-medium">{spaceName}</p>
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : shares.length === 0
            ? 'Not shared'
            : `Shared with ${shares.length} ${shares.length === 1 ? 'person' : 'people'}`
          }
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onManage}>
        <ShareIcon className="size-4" />
        Manage
      </Button>
    </div>
  )
}
