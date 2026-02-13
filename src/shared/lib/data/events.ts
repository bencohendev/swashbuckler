import type { QueryClient } from '@tanstack/react-query'

type EventChannel = 'objects' | 'objectTypes' | 'templates' | 'objectRelations' | 'spaces' | 'spaceShares' | 'tags' | 'pins'
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

export function subscribe(channel: EventChannel, listener: Listener): () => void {
  if (!listeners.has(channel)) {
    listeners.set(channel, new Set())
  }
  listeners.get(channel)!.add(listener)
  return () => {
    listeners.get(channel)?.delete(listener)
  }
}

export function emit(channel: EventChannel): void {
  listeners.get(channel)?.forEach((listener) => listener())

  // Also invalidate TanStack Query cache
  if (queryClientRef) {
    const prefixes = channelToQueryPrefix[channel]
    for (const prefix of prefixes) {
      queryClientRef.invalidateQueries({ queryKey: [prefix] })
    }
  }
}
