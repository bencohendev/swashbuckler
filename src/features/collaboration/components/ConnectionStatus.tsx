'use client'

import { useState, useEffect } from 'react'
import type { UnifiedProvider } from '@udecode/plate-yjs'

interface ConnectionStatusProps {
  provider: UnifiedProvider
}

type Status = 'connected' | 'syncing' | 'offline'

export function ConnectionStatus({ provider }: ConnectionStatusProps) {
  const [status, setStatus] = useState<Status>('offline')

  useEffect(() => {
    function update() {
      if (provider.isSynced) {
        setStatus('connected')
      } else if (provider.isConnected) {
        setStatus('syncing')
      } else {
        setStatus('offline')
      }
    }

    update()
    // Poll connection state since UnifiedProvider doesn't expose events
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [provider])

  const config: Record<Status, { color: string; label: string }> = {
    connected: { color: 'bg-green-500', label: 'Synced' },
    syncing: { color: 'bg-yellow-500', label: 'Syncing...' },
    offline: { color: 'bg-gray-400', label: 'Offline' },
  }

  const { color, label } = config[status]

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className={`size-1.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  )
}
