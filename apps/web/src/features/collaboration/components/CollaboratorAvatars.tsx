'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Awareness } from 'y-protocols/awareness'

interface AwarenessUser {
  name: string
  color: string
  avatarUrl?: string
}

interface CollaboratorAvatarsProps {
  awareness: Awareness
}

const MAX_VISIBLE = 5

export function CollaboratorAvatars({ awareness }: CollaboratorAvatarsProps) {
  const [users, setUsers] = useState<{ clientId: number; user: AwarenessUser }[]>([])
  const [brokenAvatars, setBrokenAvatars] = useState<Set<number>>(new Set())

  const handleAvatarError = useCallback((clientId: number) => {
    setBrokenAvatars(prev => {
      const next = new Set(prev)
      next.add(clientId)
      return next
    })
  }, [])

  useEffect(() => {
    function update() {
      const states = awareness.getStates()
      const remoteUsers: { clientId: number; user: AwarenessUser }[] = []

      states.forEach((state, clientId) => {
        // Skip our own cursor
        if (clientId === awareness.clientID) return
        if (state.user) {
          remoteUsers.push({ clientId, user: state.user })
        }
      })

      setUsers(remoteUsers)
    }

    update()
    awareness.on('update', update)
    return () => {
      awareness.off('update', update)
    }
  }, [awareness])

  if (users.length === 0) return null

  const visible = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map(({ clientId, user }) => (
        user.avatarUrl && !brokenAvatars.has(clientId) ? (
          <div
            key={clientId}
            className="relative size-6 overflow-hidden rounded-full border-2 border-background"
            title={user.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- external avatar URL from auth provider */}
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-full w-full object-cover"
              onError={() => handleAvatarError(clientId)}
            />
          </div>
        ) : (
          <div
            key={clientId}
            className="relative flex size-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-medium text-white"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )
      ))}
      {overflow > 0 && (
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}
