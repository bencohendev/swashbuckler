import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { subscribeToRealtimeChanges } from '@/shared/lib/data/realtime'
import { subscribe, type EventChannel } from '@/shared/lib/data/events'

function createMockSupabase() {
  const handlers: Record<string, () => void> = {}
  const channel = {
    on: vi.fn((_event: string, _opts: unknown, callback: () => void) => {
      const table = (_opts as { table: string }).table
      handlers[table] = callback
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }

  return {
    client: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
    channel,
    handlers,
  }
}

describe('subscribeToRealtimeChanges', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('subscribes to the db-changes channel', () => {
    const { client } = createMockSupabase()
    subscribeToRealtimeChanges(client as never)
    expect(client.channel).toHaveBeenCalledWith('db-changes')
  })

  it('returns an unsubscribe function that cleans up', () => {
    const { client, channel } = createMockSupabase()
    const unsubscribe = subscribeToRealtimeChanges(client as never)

    unsubscribe()
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
  })

  it('emits events for table changes after debounce', () => {
    const { client, handlers } = createMockSupabase()
    const emitted: EventChannel[] = []
    subscribe('objects', () => emitted.push('objects'))

    subscribeToRealtimeChanges(client as never)

    // Simulate a change on the objects table
    handlers.objects()
    expect(emitted).toHaveLength(0) // debounced

    vi.advanceTimersByTime(100)
    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toBe('objects')
  })

  it('deduplicates multiple changes within debounce window', () => {
    const { client, handlers } = createMockSupabase()
    const emitted: EventChannel[] = []
    subscribe('objects', () => emitted.push('objects'))

    subscribeToRealtimeChanges(client as never)

    handlers.objects()
    handlers.objects()
    handlers.objects()

    vi.advanceTimersByTime(100)
    // Should only emit once despite 3 changes
    expect(emitted).toHaveLength(1)
  })

  it('maps different tables to correct event channels', () => {
    const { client, handlers } = createMockSupabase()
    const emitted: EventChannel[] = []
    subscribe('tags', () => emitted.push('tags'))

    subscribeToRealtimeChanges(client as never)

    // object_tags maps to 'tags' channel
    handlers.object_tags()
    vi.advanceTimersByTime(100)

    expect(emitted).toHaveLength(1)
  })

  it('batches changes from multiple tables', () => {
    const { client, handlers } = createMockSupabase()
    const objectEmits: string[] = []
    const tagEmits: string[] = []
    subscribe('objects', () => objectEmits.push('objects'))
    subscribe('tags', () => tagEmits.push('tags'))

    subscribeToRealtimeChanges(client as never)

    handlers.objects()
    handlers.tags()

    vi.advanceTimersByTime(100)

    expect(objectEmits).toHaveLength(1)
    expect(tagEmits).toHaveLength(1)
  })

  it('clears pending timer on unsubscribe', () => {
    const { client, handlers } = createMockSupabase()
    const emitted: string[] = []
    subscribe('objects', () => emitted.push('objects'))

    const unsubscribe = subscribeToRealtimeChanges(client as never)

    handlers.objects()
    unsubscribe() // Should clear the timer

    vi.advanceTimersByTime(100)
    expect(emitted).toHaveLength(0)
  })

  it('registers handlers for all expected tables', () => {
    const { client, channel } = createMockSupabase()
    subscribeToRealtimeChanges(client as never)

    const tables = channel.on.mock.calls.map(
      (call: unknown[]) => (call[1] as { table: string }).table,
    )
    expect(tables).toContain('objects')
    expect(tables).toContain('object_types')
    expect(tables).toContain('templates')
    expect(tables).toContain('object_relations')
    expect(tables).toContain('spaces')
    expect(tables).toContain('space_shares')
    expect(tables).toContain('tags')
    expect(tables).toContain('object_tags')
    expect(tables).toContain('pins')
    expect(tables).toContain('saved_views')
  })
})
