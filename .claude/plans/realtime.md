# Realtime Synchronization

**Status: Not started**

## Overview

Connect Supabase Realtime `postgres_changes` to the existing in-memory event system (`emit`/`subscribe`) so all data hooks auto-refresh when other tabs or users make changes. Add `BroadcastChannel` for cross-tab sync in both storage modes.

## Decisions

| Area | Decision |
|------|----------|
| Approach | Feed Supabase Realtime into existing event system |
| Conflict resolution | None needed — hooks refetch full data, last-write-wins |
| Cross-tab (local mode) | `BroadcastChannel` API |
| Debounce | 100ms batching to avoid flood from bulk operations |
| Dependencies | None — `@supabase/supabase-js` v2.94.1 already includes realtime |

## Implementation

### Supabase Realtime subscription — `src/shared/lib/data/realtime.ts` (new)

```ts
export function subscribeToRealtimeChanges(
  supabase: SupabaseClient,
  spaceId?: string
): () => void   // returns cleanup function
```

- Creates a single Supabase Realtime channel (`supabase.channel('db-changes')`)
- Subscribes to `postgres_changes` on all data tables:
  - `objects` -> emit `'objects'`
  - `object_types` -> emit `'objectTypes'`
  - `templates` -> emit `'templates'`
  - `object_relations` -> emit `'objectRelations'`
  - `spaces` -> emit `'spaces'`
  - `space_shares` -> emit `'spaceShares'`
  - `tags` -> emit `'tags'`
  - `object_tags` -> emit `'tags'`
- Each: `.on('postgres_changes', { event: '*', schema: 'public', table: 'xxx' }, () => emit('channel'))`
- Debounces rapid-fire events within a 100ms window
- Returns cleanup function that calls `supabase.removeChannel(channel)`

### BroadcastChannel cross-tab sync — update `src/shared/lib/data/events.ts`

```ts
const bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('swashbuckler-events')
  : null

export function emit(channel: EventChannel): void {
  listeners.get(channel)?.forEach((listener) => listener())
  bc?.postMessage(channel)
}

bc?.addEventListener('message', (event) => {
  const channel = event.data as EventChannel
  listeners.get(channel)?.forEach((listener) => listener())
})
```

### Integration — `src/shared/lib/data/DataProvider.tsx`

```ts
useEffect(() => {
  if (!user) return
  const cleanup = subscribeToRealtimeChanges(supabase, spaceId ?? undefined)
  return cleanup
}, [user, supabase, spaceId])
```

### Supabase migration — `supabase/migrations/013_realtime.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE objects;
ALTER PUBLICATION supabase_realtime ADD TABLE object_types;
ALTER PUBLICATION supabase_realtime ADD TABLE templates;
ALTER PUBLICATION supabase_realtime ADD TABLE object_relations;
ALTER PUBLICATION supabase_realtime ADD TABLE spaces;
ALTER PUBLICATION supabase_realtime ADD TABLE space_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE object_tags;
```

## Key design notes
- RLS applies to realtime — users only get events for data they can see
- Single channel with multiple table subscriptions is more efficient than one per table
- BroadcastChannel gives cross-tab sync for free in local/guest mode too

## Verification

- [ ] Open two browser tabs logged in — changes in Tab A appear in Tab B within ~1 second
- [ ] Cross-tab works for objects, types, tags, relations
- [ ] Local/guest mode: two tabs stay in sync via BroadcastChannel
- [ ] Bulk operations (e.g. empty trash) don't cause excessive refetches
- [ ] `npm run build` passes
