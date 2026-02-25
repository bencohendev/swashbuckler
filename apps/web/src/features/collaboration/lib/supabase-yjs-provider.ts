import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { UnifiedProvider } from '@udecode/plate-yjs'
import * as Y from 'yjs'
import { type Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'
import { toBase64, fromBase64 } from './yjs-utils'

type MessageType = 'yjs-sync-step1' | 'yjs-sync-step2' | 'yjs-update' | 'awareness-update'

interface BroadcastPayload {
  type: MessageType
  data: string // base64-encoded Uint8Array
  sender: string
}

interface SupabaseYjsProviderOptions {
  supabase: SupabaseClient
  documentId: string
  doc: Y.Doc
  awareness: Awareness
}

const UPDATE_DEBOUNCE_MS = 50
/** If no peer responds with sync-step2 within this time, assume we're the sole editor */
const SYNC_TIMEOUT_MS = 1500
/** Base delay for reconnection attempts */
const RECONNECT_BASE_MS = 1000
/** Maximum reconnection delay */
const RECONNECT_MAX_MS = 30000
/** Periodic re-sync interval to recover from missed broadcasts */
const RESYNC_INTERVAL_MS = 30000

export class SupabaseYjsProvider implements UnifiedProvider {
  readonly type = 'supabase-broadcast'
  readonly awareness: Awareness
  readonly document: Y.Doc

  isConnected = false
  isSynced = false
  isReconnecting = false

  private supabase: SupabaseClient
  private documentId: string
  // Unique per provider instance so cross-tab same-user editing works
  private instanceId = crypto.randomUUID()
  private channel: RealtimeChannel | null = null
  private updateBuffer: Uint8Array[] = []
  private updateTimer: ReturnType<typeof setTimeout> | null = null
  private awarenessTimer: ReturnType<typeof setTimeout> | null = null
  private syncTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private resyncTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private destroyed = false
  private syncCallbacks: (() => void)[] = []

  constructor(options: SupabaseYjsProviderOptions) {
    this.supabase = options.supabase
    this.documentId = options.documentId
    this.document = options.doc
    this.awareness = options.awareness
  }

  connect(): void {
    if (this.destroyed || this.isConnected || this.channel) return

    const channelName = `collab:${this.documentId}`
    this.channel = this.supabase.channel(channelName)

    this.channel
      .on('broadcast', { event: 'yjs' }, ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.sender === this.instanceId) return
        this.handleMessage(payload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
          this.isReconnecting = false
          this.reconnectAttempts = 0
          this.startSync()
          this.setupDocListeners()
          this.setupAwarenessListeners()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.handleConnectionLost()
        }
      })
  }

  disconnect(): void {
    this.clearSyncTimer()
    this.clearReconnectTimer()
    this.clearResyncInterval()
    this.flushUpdates()
    this.teardownListeners()

    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }

    if (this.isConnected) {
      // Remove our awareness state so other clients know we left
      removeAwarenessStates(this.awareness, [this.document.clientID], this)
    }

    this.isConnected = false
    this.isSynced = false
    this.isReconnecting = false
  }

  destroy(): void {
    this.destroyed = true
    this.disconnect()
  }

  /**
   * Register a callback that fires once the provider has completed initial sync.
   * If already synced, the callback fires immediately.
   */
  onSync(callback: () => void): void {
    if (this.isSynced) {
      callback()
    } else {
      this.syncCallbacks.push(callback)
    }
  }

  /** Remove a previously registered sync callback. */
  offSync(callback: () => void): void {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback)
  }

  private fireSyncCallbacks(): void {
    const cbs = this.syncCallbacks
    this.syncCallbacks = []
    for (const cb of cbs) {
      cb()
    }
  }

  // -- Sync Protocol --

  private startSync(): void {
    // Send sync-step1 (our state vector) so peers can send us what we're missing
    const stateVector = Y.encodeStateVector(this.document)
    this.broadcast('yjs-sync-step1', stateVector)

    // Also broadcast our current awareness state
    const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.document.clientID])
    this.broadcast('awareness-update', awarenessUpdate)

    // If no peer responds with sync-step2, assume we're the sole editor
    this.clearSyncTimer()
    this.syncTimer = setTimeout(() => {
      if (this.isConnected && !this.isSynced) {
        this.isSynced = true
        this.fireSyncCallbacks()
      }
      this.startResyncInterval()
    }, SYNC_TIMEOUT_MS)
  }

  /**
   * Periodically re-exchange state vectors to recover from missed broadcasts.
   * Supabase Broadcast is fire-and-forget with no delivery guarantee, so
   * individual yjs-update messages can be silently dropped. This ensures
   * all peers converge even when messages are lost.
   */
  private startResyncInterval(): void {
    this.clearResyncInterval()
    this.resyncTimer = setInterval(() => {
      if (this.isConnected) {
        const stateVector = Y.encodeStateVector(this.document)
        this.broadcast('yjs-sync-step1', stateVector)
      }
    }, RESYNC_INTERVAL_MS)
  }

  private clearResyncInterval(): void {
    if (this.resyncTimer) {
      clearInterval(this.resyncTimer)
      this.resyncTimer = null
    }
  }

  private handleConnectionLost(): void {
    // Clean up current connection state
    this.teardownListeners()
    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.isConnected = false
    this.isSynced = false
    this.clearSyncTimer()
    this.clearResyncInterval()

    // Schedule reconnection with exponential backoff
    if (!this.destroyed) {
      this.isReconnecting = true
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
        RECONNECT_MAX_MS
      )
      this.reconnectAttempts++
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, delay)
    }
  }

  private clearSyncTimer(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer)
      this.syncTimer = null
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private handleMessage(payload: BroadcastPayload): void {
    const data = fromBase64(payload.data)

    switch (payload.type) {
      case 'yjs-sync-step1': {
        // Peer sent their state vector — reply with the diff they need
        const stateVector = data
        const diff = Y.encodeStateAsUpdate(this.document, stateVector)
        this.broadcast('yjs-sync-step2', diff)
        break
      }

      case 'yjs-sync-step2': {
        // Peer sent us an update diff — apply it
        Y.applyUpdate(this.document, data, this)
        if (!this.isSynced) {
          this.clearSyncTimer()
          this.isSynced = true
          this.startResyncInterval()
          this.fireSyncCallbacks()
        }
        break
      }

      case 'yjs-update': {
        // Incremental update from peer
        Y.applyUpdate(this.document, data, this)
        break
      }

      case 'awareness-update': {
        applyAwarenessUpdate(this.awareness, data, this)
        break
      }
    }
  }

  // -- Listeners --

  private docUpdateHandler = (update: Uint8Array, origin: unknown) => {
    // Don't re-broadcast updates that came from remote peers
    if (origin === this) return

    this.updateBuffer.push(update)
    if (!this.updateTimer) {
      this.updateTimer = setTimeout(() => this.flushUpdates(), UPDATE_DEBOUNCE_MS)
    }
  }

  private awarenessChangeHandler = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return

    const changedClients = [...added, ...updated, ...removed]
    const update = encodeAwarenessUpdate(this.awareness, changedClients)
    this.broadcast('awareness-update', update)
  }

  private setupDocListeners(): void {
    this.document.on('update', this.docUpdateHandler)
  }

  private setupAwarenessListeners(): void {
    this.awareness.on('update', this.awarenessChangeHandler)
  }

  private teardownListeners(): void {
    this.document.off('update', this.docUpdateHandler)
    this.awareness.off('update', this.awarenessChangeHandler)

    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
    }
    if (this.awarenessTimer) {
      clearTimeout(this.awarenessTimer)
      this.awarenessTimer = null
    }
  }

  // -- Broadcast Helpers --

  private flushUpdates(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
    }

    if (this.updateBuffer.length === 0) return

    // Merge all pending updates into one
    const merged = Y.mergeUpdates(this.updateBuffer)
    this.updateBuffer = []
    this.broadcast('yjs-update', merged)
  }

  private broadcast(type: MessageType, data: Uint8Array): void {
    if (!this.channel || !this.isConnected) return

    const payload: BroadcastPayload = {
      type,
      data: toBase64(data),
      sender: this.instanceId,
    }

    const result = this.channel.send({
      type: 'broadcast',
      event: 'yjs',
      payload,
    })

    // channel.send() may return a Promise (with ack) or a string status
    if (result && typeof (result as Promise<string>).then === 'function') {
      ;(result as Promise<string>).then((status) => {
        if (status !== 'ok') {
          console.warn('[collab] broadcast failed:', status)
        }
      }).catch(() => {
        // Channel may have been removed — trigger reconnection
        if (!this.destroyed && this.isConnected) {
          this.handleConnectionLost()
        }
      })
    }
  }
}
