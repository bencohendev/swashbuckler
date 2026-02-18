import type { QueryClient } from '@tanstack/react-query'

export type EventChannel = 'objects' | 'objectTypes' | 'templates' | 'objectRelations' | 'spaces' | 'spaceShares' | 'tags' | 'pins'
type Listener = () => void

const listeners = new Map<EventChannel, Set<Listener>>()

let queryClientRef: QueryClient | null = null

export function setQueryClient(client: QueryClient): void {
  queryClientRef = client
}

const channelToQueryPrefix: Record<EventChannel, string[]> = {
  objects: ['objects'],
  objectTypes: ['objectTypes'],
  templates: ['templates'],
  objectRelations: ['relations'],
  spaces: ['spaces'],
  spaceShares: ['spaceShares'],
  tags: ['tags'],
  pins: ['pins'],
}

// BroadcastChannel for cross-tab sync
const bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('swashbuckler-events')
  : null

bc?.addEventListener('message', (event) => {
  const channel = event.data as EventChannel
  invalidateChannel(channel)
})

export function subscribe(channel: EventChannel, listener: Listener): () => void {
  if (!listeners.has(channel)) {
    listeners.set(channel, new Set())
  }
  listeners.get(channel)!.add(listener)
  return () => {
    listeners.get(channel)?.delete(listener)
  }
}

function invalidateChannel(channel: EventChannel): void {
  listeners.get(channel)?.forEach((listener) => listener())

  if (queryClientRef) {
    const prefixes = channelToQueryPrefix[channel]
    for (const prefix of prefixes) {
      queryClientRef.invalidateQueries({ queryKey: [prefix] })
    }
  }
}

export function emit(channel: EventChannel): void {
  invalidateChannel(channel)

  // Broadcast to other tabs
  bc?.postMessage(channel)
}
