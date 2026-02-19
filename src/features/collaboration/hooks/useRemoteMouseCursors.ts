'use client'

import { useState, useEffect } from 'react'
import type { Awareness } from 'y-protocols/awareness'

export interface RemoteMouseCursor {
  clientId: number
  name: string
  color: string
  x: number
  y: number
}

const EMPTY: RemoteMouseCursor[] = []

export function useRemoteMouseCursors(awareness: Awareness | null): RemoteMouseCursor[] {
  const [cursors, setCursors] = useState<RemoteMouseCursor[]>(EMPTY)

  useEffect(() => {
    if (!awareness) return

    function update() {
      const states = awareness!.getStates()
      const remoteCursors: RemoteMouseCursor[] = []

      states.forEach((state, clientId) => {
        if (clientId === awareness!.clientID) return
        if (!state.user || !state.mouse) return

        remoteCursors.push({
          clientId,
          name: state.user.name,
          color: state.user.color,
          x: state.mouse.x,
          y: state.mouse.y,
        })
      })

      setCursors(remoteCursors.length === 0 ? EMPTY : remoteCursors)
    }

    update()
    awareness.on('update', update)
    return () => {
      awareness.off('update', update)
      setCursors(EMPTY)
    }
  }, [awareness])

  return cursors
}
