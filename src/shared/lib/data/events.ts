type EventChannel = 'objects' | 'objectTypes' | 'templates' | 'objectRelations' | 'spaces' | 'spaceShares'
type Listener = () => void

const listeners = new Map<EventChannel, Set<Listener>>()

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
}
