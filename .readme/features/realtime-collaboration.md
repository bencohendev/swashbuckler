# Realtime Collaboration

**Status:** Done

## Overview

Google Docs-style collaborative editing for shared spaces. Multiple users can edit the same entry simultaneously with CRDT-based conflict resolution, remote cursors, and presence indicators.

## Architecture

| Component | Technology |
|-----------|-----------|
| CRDT | Yjs (`yjs` + `@udecode/plate-yjs@48`) |
| Transport | Custom Supabase Broadcast provider (`SupabaseYjsProvider`) |
| Presence | Yjs Awareness protocol over Supabase Broadcast |
| Cursors | `@slate-yjs/core` CursorEditor + custom overlay |

## Activation Criteria

Collaborative mode activates when ALL conditions are met:
- `storageMode === 'supabase'` (authenticated user)
- `canEdit === true` (has edit permission)
- Space is shared: either the owner has created shares (`useSpaceShares` returns non-empty), or the user is a recipient (`sharedPermission !== null`)

All other cases fall back to solo mode (existing behavior unchanged).

## File Structure

```
src/features/collaboration/
  lib/
    supabase-yjs-provider.ts   # UnifiedProvider for Supabase Broadcast
    yjs-utils.ts                # Base64 encoding utilities for Broadcast transport
    user-colors.ts              # Deterministic 12-color palette from user ID
  hooks/
    useCollaboration.ts         # Creates Y.Doc, Awareness, Provider for a document
    useMousePresence.ts         # Broadcasts local mouse position via Awareness
    useMouseCursorPreference.ts # Toggle for showing/hiding remote mouse cursors
  components/
    RemoteCursorOverlay.tsx     # Renders colored cursors + selection highlights
    RemoteMouseCursors.tsx      # Renders remote users' mouse pointers
    CollaboratorAvatars.tsx     # Avatar stack in document header
    ConnectionStatus.tsx        # Sync status indicator (Synced/Syncing/Offline)
  index.ts                      # Public exports
```

## Modified Files

| File | Change |
|------|--------|
| `package.json` | Added `@udecode/plate-yjs`, `yjs` |
| `src/features/editor/components/Editor.tsx` | Split into SoloEditor + CollaborativeEditor; manual Y.Doc seeding via `slateNodesToInsertDelta` + `YjsEditor.connect/disconnect` (bypasses buggy `editor.api.yjs.init`) |
| `src/features/editor/store.ts` | Added `isCollaborative` flag, `setCollaborative()` action |
| `src/features/editor/index.ts` | Exports `CollaborationOptions` type |
| `src/features/objects/components/ObjectEditor.tsx` | Detects collab mode, creates provider via `useCollaboration`, shows avatars + connection status |

## Sync Protocol

Standard Yjs sync over Supabase Broadcast channel `collab:{documentId}`:

1. On connect: send `yjs-sync-step1` (state vector)
2. On receiving `sync-step1`: reply with `yjs-sync-step2` (state diff)
3. On receiving `sync-step2`: apply update, mark synced
4. On local change: debounced (50ms) `yjs-update` broadcast
5. Awareness changes broadcast as `awareness-update`

All binary data is base64-encoded for JSON transport.

## Auto-Save (Collaborative Mode)

- Debounced at 3 seconds (vs 1s in solo mode — peers keep state in memory)
- Leader election: lowest Yjs `clientID` persists to DB
- Reads content from `editor.children` (current Slate state)
- Force-saves on unmount if changes pending

## Mouse Cursor Preference

Remote mouse cursors (not text selection cursors) can be toggled on/off via a persistent user preference (`show_mouse_cursors`, default `true`).

**Toggle locations:**
- **Editor header** — MousePointer icon button next to CollaboratorAvatars (only visible during collaborative sessions)
- **Account settings** — "Show collaborator mouse cursors" On/Off toggle in PreferencesSection

**Storage:** `show_mouse_cursors` boolean column on `user_preferences` table (migration `034`). Also cached in localStorage (`swashbuckler:showMouseCursors`) for instant reads. In guest/local mode, defaults to `true` (localStorage only).

**Behavior:** When disabled, `useMousePresence` stops broadcasting the local mouse position and `RemoteMouseCursors` is not rendered. Text selection cursors (`RemoteCursorOverlay`) remain always visible.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Solo editing (no peers) | Solo mode, identical to before |
| Last user leaves | Force-save on disconnect/destroy |
| New user joins mid-edit | sync-step1/step2 exchange syncs state |
| Guest/local mode | `collaborative=false`, no Yjs |
| View-only permission | `collaborative=false`, editor read-only |
| Cross-tab (same user) | Each tab is a separate Yjs peer — merges correctly |

## Dependencies

- `yjs@^13.6.0`
- `@udecode/plate-yjs@^48.0.0` (brings `@slate-yjs/core` transitively)
- `y-protocols` (transitive from yjs)
