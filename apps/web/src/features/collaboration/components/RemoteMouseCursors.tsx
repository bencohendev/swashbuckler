'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import { useRemoteMouseCursors } from '../hooks/useRemoteMouseCursors'
import { MouseCursorIcon } from './MouseCursorIcon'

const LABEL_FADE_MS = 3000

interface RemoteMouseCursorsProps {
  awareness: Awareness
}

export function RemoteMouseCursors({ awareness }: RemoteMouseCursorsProps) {
  const cursors = useRemoteMouseCursors(awareness)
  const prevPositions = useRef(new Map<number, string>())
  const [brokenAvatars, setBrokenAvatars] = useState<Set<number>>(new Set())

  const handleAvatarError = useCallback((clientId: number) => {
    setBrokenAvatars(prev => {
      const next = new Set(prev)
      next.add(clientId)
      return next
    })
  }, [])
  const [activityMap, setActivityMap] = useState<Map<number, number>>(new Map())
  const [now, setNow] = useState(() => Date.now())

  // Track position changes and clean up departed cursors
  useEffect(() => {
    const currentTime = Date.now()
    const activeIds = new Set(cursors.map(c => c.clientId))

    setActivityMap(prev => {
      const next = new Map(prev)
      for (const cursor of cursors) {
        const key = `${cursor.x},${cursor.y}`
        if (prevPositions.current.get(cursor.clientId) !== key) {
          prevPositions.current.set(cursor.clientId, key)
          next.set(cursor.clientId, currentTime)
        }
      }
      for (const id of prev.keys()) {
        if (!activeIds.has(id)) {
          prevPositions.current.delete(id)
          next.delete(id)
        }
      }
      return next
    })
  }, [cursors])

  // Periodic re-render to trigger fade transitions
  const hasCursors = cursors.length > 0
  useEffect(() => {
    if (!hasCursors) return
    const interval = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(interval)
  }, [hasCursors])

  if (!hasCursors) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => {
        const lastMoved = activityMap.get(cursor.clientId) ?? now
        const isActive = now - lastMoved < LABEL_FADE_MS

        return (
          <div
            key={cursor.clientId}
            className="absolute will-change-transform"
            style={{
              left: `${cursor.x}%`,
              top: cursor.y,
              transition: 'left 80ms linear, top 80ms linear',
            }}
          >
            <MouseCursorIcon color={cursor.color} />
            <div
              className="absolute left-4 top-3"
              style={{
                opacity: isActive ? 1 : 0,
                transition: isActive ? 'opacity 0.15s ease' : 'opacity 1s ease',
              }}
            >
              {cursor.avatarUrl && !brokenAvatars.has(cursor.clientId) ? (
                <div
                  className="size-6 overflow-hidden rounded-full p-[1.5px] shadow-sm"
                  style={{ backgroundColor: cursor.color }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external avatar URL from auth provider */}
                  <img
                    src={cursor.avatarUrl}
                    alt={cursor.name}
                    className="block h-full w-full rounded-full object-cover"
                    onError={() => handleAvatarError(cursor.clientId)}
                  />
                </div>
              ) : (
                <div
                  className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight text-white shadow-sm"
                  style={{ backgroundColor: cursor.color }}
                >
                  {cursor.name}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
