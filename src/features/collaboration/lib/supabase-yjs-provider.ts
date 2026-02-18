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

export class SupabaseYjsProvider implements UnifiedProvider {
  readonly type = 'supabase-broadcast'
  readonly awareness: Awareness
  readonly document: Y.Doc

  isConnected = false
  isSynced = false

  private supabase: SupabaseClient
  private documentId: string
  // Unique per provider instance so cross-tab same-user editing works
  private instanceId = crypto.randomUUID()
  private channel: RealtimeChannel | null = null
  private updateBuffer: Uint8Array[] = []
  private updateTimer: ReturnType<typeof setTimeout> | null = null
  private awarenessTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: SupabaseYjsProviderOptions) {
    this.supabase = options.supabase
    this.documentId = options.documentId
    this.document = options.doc
    this.awareness = options.awareness
  }

  connect(): void {
    if (this.isConnected || this.channel) return

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
          this.startSync()
          this.setupDocListeners()
          this.setupAwarenessListeners()
        }
      })
  }

  disconnect(): void {
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
  }

  destroy(): void {
    this.disconnect()
  }

  // -- Sync Protocol --

  private startSync(): void {
    // Send sync-step1 (our state vector) so peers can send us what we're missing
    const stateVector = Y.encodeStateVector(this.document)
    this.broadcast('yjs-sync-step1', stateVector)

    // Also broadcast our current awareness state
    const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.document.clientID])
    this.broadcast('awareness-update', awarenessUpdate)
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
        this.isSynced = true
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

    this.channel.send({
      type: 'broadcast',
      event: 'yjs',
      payload,
    })
  }
}
