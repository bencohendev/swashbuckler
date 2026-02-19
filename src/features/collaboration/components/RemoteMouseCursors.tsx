'use client'

import type { Awareness } from 'y-protocols/awareness'
import { useRemoteMouseCursors } from '../hooks/useRemoteMouseCursors'
import { MouseCursorIcon } from './MouseCursorIcon'

interface RemoteMouseCursorsProps {
  awareness: Awareness
}

export function RemoteMouseCursors({ awareness }: RemoteMouseCursorsProps) {
  const cursors = useRemoteMouseCursors(awareness)

  if (cursors.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => (
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
            className="absolute left-4 top-3 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight text-white shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  )
}
