# Realtime Synchronization

**Status:** Done

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

### Supabase Realtime subscription — `src/shared/lib/data/realtime.ts`

- `subscribeToRealtimeChanges(supabase)` — creates a single Realtime channel (`db-changes`)
- Subscribes to `postgres_changes` on 9 tables: `objects`, `object_types`, `templates`, `object_relations`, `spaces`, `space_shares`, `tags`, `object_tags`, `pins`
- Debounces events within 100ms window, then calls `emit()` for each affected channel
- Returns cleanup function that clears timer and removes the Realtime channel

### BroadcastChannel cross-tab sync — `src/shared/lib/data/events.ts`

- `BroadcastChannel('swashbuckler-events')` created at module level (with SSR guard)
- `emit()` calls `invalidateChannel()` locally then broadcasts to other tabs via `bc.postMessage()`
- Incoming messages from other tabs call `invalidateChannel()` (listeners + TanStack Query invalidation)
- `EventChannel` type is now exported for use by `realtime.ts`

### Integration — `src/shared/lib/data/DataProvider.tsx`

- `useEffect` subscribes to realtime when `user` is present, returns cleanup

### Supabase migration — `supabase/migrations/018_realtime.sql`

- `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for all 9 data tables

## Key design notes
- RLS applies to realtime — users only get events for data they can see
- Single channel with multiple table subscriptions is more efficient than one per table
- BroadcastChannel gives cross-tab sync for free in local/guest mode too

## Verification

- [x] Open two browser tabs logged in — changes in Tab A appear in Tab B within ~1 second
- [x] Cross-tab works for objects, types, tags, relations
- [ ] Local/guest mode: two tabs stay in sync via BroadcastChannel
- [ ] Bulk operations (e.g. empty trash) don't cause excessive refetches
- [ ] `npm run build` passes
