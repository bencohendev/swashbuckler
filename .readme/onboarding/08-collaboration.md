# 08 -- Realtime Collaboration

This is the most technically complex feature in Swashbuckler. It enables multiple users to edit the same document simultaneously with live cursor and selection presence, mouse cursor overlays, and conflict-free merging of edits. The system is built on Yjs (a CRDT library) synced over Supabase Broadcast channels -- not a traditional WebSocket server.

---

## Overview

The collaboration system has four layers:

1. **Yjs CRDT** -- the shared document model that merges concurrent edits without conflicts
2. **Supabase Broadcast** -- the transport layer that relays Yjs updates between peers
3. **Plate/Slate integration** -- binds the Yjs document to the rich-text editor
4. **Presence** -- text cursor positions (via Yjs awareness) and mouse cursors (via awareness fields)

All collaboration code lives under `apps/web/src/features/collaboration/`.

---

## What is Yjs?

If you have not worked with CRDTs before, here is a brief primer.

**CRDT** stands for Conflict-free Replicated Data Type. It is a data structure that can be independently modified by multiple peers and merged without conflicts. There is no central authority or locking -- every peer's edits are valid and will converge to the same state.

**Yjs** is a JavaScript CRDT library specifically designed for shared editing. The key concepts:

- **`Y.Doc`** -- the root shared document. Each peer has their own `Y.Doc` instance. When updates are exchanged, the documents converge.
- **`Y.XmlText`** -- the shared type used to represent rich text. Slate/Plate documents are mapped to a `Y.XmlText` tree stored under the key `'content'` in the `Y.Doc`.
- **`Awareness`** -- a lightweight presence protocol layered on top of Yjs. It stores ephemeral per-user state (cursor position, user name, color) that is broadcast to all peers but not persisted in the document.
- **Updates** -- changes to a `Y.Doc` are encoded as compact binary updates (`Uint8Array`). These updates are the unit of sync between peers.
- **State vector** -- a compact representation of what a `Y.Doc` already knows. When two peers want to sync, one sends its state vector, and the other computes a diff (the updates the first peer is missing).

---

## Architecture

```
User A                           Supabase Broadcast                    User B
+--------------+                                                  +--------------+
| Plate Editor |                                                  | Plate Editor |
|      |       |                                                  |      |       |
|  YjsPlugin   |                                                  |  YjsPlugin   |
|      |       |                                                  |      |       |
|   Y.Doc      | ---- yjs-sync-step1/step2, yjs-update ------->  |   Y.Doc      |
|   Awareness  | ---- awareness-update ------------------------>  |   Awareness  |
|      |       |                                                  |      |       |
| SupabaseYjs  | <---- Broadcast Channel: collab:{spaceId}:{id} - | SupabaseYjs  |
|  Provider    |                                                  |  Provider    |
+--------------+                                                  +--------------+
```

There is no central server holding document state. Each peer holds the full `Y.Doc` in memory. The Supabase Broadcast channel is a fire-and-forget relay -- it does not persist messages. This means:

- If a peer joins after others have been editing, it must sync by requesting missing updates from an existing peer (the sync protocol handles this).
- If all peers disconnect, unsaved changes are lost from Yjs. Persistence comes from the auto-save system writing the Slate content to the database.

---

## SupabaseYjsProvider -- The Custom Provider

**File:** `apps/web/src/features/collaboration/lib/supabase-yjs-provider.ts`

This class implements the `UnifiedProvider` interface from `@udecode/plate-yjs` and handles all communication with Supabase Broadcast. It is the bridge between the local `Y.Doc` and remote peers.

### Channel Naming

```typescript
const channelName = `collab:${this.spaceId}:${this.documentId}`
```

Each document gets its own Broadcast channel scoped to the space. Two users editing different documents will be on different channels.

### Sender Filtering

```typescript
private instanceId = crypto.randomUUID()
```

Each provider instance gets a unique random UUID -- **not** the user's ID. This is intentional: it allows the same user to have the document open in multiple browser tabs and have those tabs collaborate with each other. If the sender filter used `userId`, cross-tab editing for the same user would silently drop all messages.

When a broadcast message arrives, the provider checks `payload.sender === this.instanceId` and ignores its own messages.

### Message Types

The provider uses four message types, all sent as `broadcast` events on the channel with event name `'yjs'`:

| Type | Direction | Purpose |
|------|-----------|---------|
| `yjs-sync-step1` | Outbound on connect | Sends state vector so peers can compute what we are missing |
| `yjs-sync-step2` | Response to step1 | Sends the diff (missing updates) to the requesting peer |
| `yjs-update` | Real-time | Incremental document changes during editing |
| `awareness-update` | Real-time | Cursor position, user info, mouse position |

All payloads are base64-encoded binary (`Uint8Array` -> base64 string) because Supabase Broadcast transmits JSON.

### Sync Protocol

The sync protocol runs every time a peer connects:

1. **Connect**: The provider subscribes to the Broadcast channel. On `SUBSCRIBED` status, it calls `startSync()`.

2. **sync-step1**: The provider encodes its state vector (`Y.encodeStateVector(doc)`) and broadcasts it. This tells peers: "here is what I already have."

3. **sync-step2**: When a peer receives a `sync-step1`, it computes the diff (`Y.encodeStateAsUpdate(doc, stateVector)`) -- the updates the requesting peer is missing -- and sends it back as `sync-step2`.

4. **Apply**: When the original peer receives `sync-step2`, it applies the update (`Y.applyUpdate(doc, data, this)`) and marks itself as synced.

5. **Timeout**: If no peer responds with `sync-step2` within 500ms (`SYNC_TIMEOUT_MS`), the provider assumes it is the only editor and marks itself as synced. This timeout prevents the UI from hanging indefinitely when you are the first editor.

6. **Ongoing**: After initial sync, local document changes trigger `yjs-update` messages that are broadcast to all peers in real time.

### Update Debouncing

Local document updates are batched using a 50ms debounce (`UPDATE_DEBOUNCE_MS`). Multiple rapid edits within 50ms are merged into a single `Y.mergeUpdates()` call before broadcasting. This reduces channel traffic during fast typing.

```typescript
private docUpdateHandler = (update: Uint8Array, origin: unknown) => {
  if (origin === this) return  // Don't re-broadcast remote updates
  this.updateBuffer.push(update)
  if (!this.updateTimer) {
    this.updateTimer = setTimeout(() => this.flushUpdates(), UPDATE_DEBOUNCE_MS)
  }
}
```

### Periodic Re-sync

Supabase Broadcast is fire-and-forget with no delivery guarantee. Individual `yjs-update` messages can be silently dropped. To recover from this, the provider runs a periodic re-sync every 30 seconds (`RESYNC_INTERVAL_MS`), sending a fresh `yjs-sync-step1` to trigger a full state exchange with any active peers.

### Reconnection with Exponential Backoff

If the channel errors or times out, the provider enters a reconnection loop:

```
1s -> 2s -> 4s -> 8s -> 16s -> 30s (capped)
```

Base delay is 1 second (`RECONNECT_BASE_MS`), doubling each attempt up to 30 seconds (`RECONNECT_MAX_MS`). On successful reconnection, the attempt counter resets.

### Payload Size Warning

Supabase Broadcast has an approximate 1MB message limit. The provider warns in the console if a broadcast payload exceeds 900KB:

```typescript
private static readonly PAYLOAD_WARN_BYTES = 900_000
```

### Awareness

On connect, the provider broadcasts its awareness state (user name, color, avatar) and sets up a listener for local awareness changes. When the user moves their cursor, the awareness change is encoded and broadcast to all peers.

On disconnect, the provider removes its awareness state so other clients see the user leave.

---

## Activation Conditions

Collaboration does not activate for every editor instance. It requires all three of these conditions to be true:

```typescript
// apps/web/src/features/objects/components/ObjectEditor.tsx
const isSharedSpace = isOwner ? shares.length > 0 : sharedPermission !== null
const isCollaborative = storageMode === 'supabase' && canEdit && isSharedSpace
```

1. **`storageMode === 'supabase'`** -- the user is logged in (not guest/local mode)
2. **`canEdit`** -- the user has edit or owner permission on the space
3. **`isSharedSpace`** -- the space is actually shared with other users:
   - For owners: `shares.length > 0` (they have created at least one share)
   - For recipients: `sharedPermission !== null` (they have a share giving them access)

Note: `sharedPermission` from `SpaceProvider` is always `null` for the space owner. Do not use it to determine if the space is shared -- use `useSpaceShares` instead.

When `isCollaborative` is `false`, the editor renders as a `SoloEditor` with the standard auto-save behavior. When `true`, it renders as a `CollaborativeEditor` with Yjs sync.

---

## useCollaboration Hook

**File:** `apps/web/src/features/collaboration/hooks/useCollaboration.ts`

This hook creates and manages the Yjs infrastructure for a single document.

```typescript
export function useCollaboration({
  spaceId, documentId, supabase, userId, userName, avatarUrl, enabled,
}: UseCollaborationOptions): CollaborationOptions | undefined
```

### What It Does

1. **Creates the Yjs objects** (memoized on `spaceId`, `documentId`, `userId`, `enabled`):
   - `new Y.Doc()` -- the shared document
   - `new Awareness(doc)` -- presence state
   - Sets initial awareness with user info and a deterministic color from `getUserColor(userId)`

2. **Creates the provider**:
   - `new SupabaseYjsProvider({ supabase, spaceId, documentId, doc, awareness })`

3. **Returns `CollaborationOptions`**:
   ```typescript
   { provider, doc, awareness, cursorData: { name, color, avatarUrl } }
   ```
   This is passed directly to the `CollaborativeEditor` component.

4. **Lifecycle**: The `useEffect` calls `provider.connect()` on mount and `provider.disconnect()` + `doc.destroy()` on cleanup.

When `enabled` is `false`, the hook returns `undefined` and no Yjs objects are created.

---

## The Collaborative Editor

**File:** `apps/web/src/features/editor/components/Editor.tsx` (the `CollaborativeEditor` function)

This is where Yjs meets Plate. Key aspects:

### Plugin Configuration

```typescript
const plugins = useMemo(() => [
  ...editorPlugins,
  YjsPlugin.configure({
    options: {
      ydoc: doc,
      awareness,
      providers: [provider],
      cursors: { data: cursorData, autoSend: true },
    },
  }),
], [provider])
```

The `ydoc` and `awareness` options are passed explicitly. Without these, YjsPlugin creates its own internal `Y.Doc`, which causes the Slate tree and Y.Doc tree to diverge.

### Editor Creation -- No `value`

```typescript
const editor = usePlateEditor({
  plugins,
  // Do NOT pass value here
  override: { components: COMPONENT_OVERRIDES },
})
```

In collaborative mode, the Y.Doc is the source of truth. Passing `value` to `usePlateEditor` would create a mismatch between the Slate tree and the Y.Doc tree.

### Y.Doc Seeding

When the editor mounts, it must seed the Y.Doc with the initial document content (loaded from the database). The seeding uses a fixed `clientID` of 0:

```typescript
const sharedType = doc.get('content', Y.XmlText)
if (sharedType.length === 0) {
  const content = sanitizeContent(initialContent) || initialEditorValue
  const realClientID = doc.clientID
  doc.clientID = 0
  doc.transact(() => {
    sharedType.applyDelta(slateNodesToInsertDelta(content))
  })
  doc.clientID = realClientID
}
```

Why `clientID = 0`? Yjs identifies each piece of content by `(clientID, clock)` pairs. If two peers independently seed the same content with different clientIDs, Yjs treats them as different operations and duplicates the content. By forcing `clientID = 0` during seeding, every peer produces identical Yjs structs for the initial content. When a second peer's seed arrives, Yjs sees the same `(client, clock)` pairs and skips them.

If the `sharedType` already has content (a peer synced before this editor mounted), seeding is skipped entirely.

### Editor Binding

After seeding, the editor is connected to the Y.Doc:

```typescript
const yjsEd = toYjsEditor(editor)
if (!YjsEditor.connected(yjsEd)) {
  YjsEditor.connect(yjsEd)
}
```

This is a manual call to `YjsEditor.connect()` from `@slate-yjs/core`. We do NOT use `editor.api.yjs.init()` because it is async, uses `slateToDeterministicYjsState`, and has a stale-closure bug where `autoConnect` reads an empty `_providers` map.

### Cursor Position Broadcast

The `handleChange` callback manually sends the cursor position via awareness on every editor change:

```typescript
const sharedRoot = doc.get('content', Y.XmlText)
if (editor.selection) {
  const relRange = slateRangeToRelativeRange(sharedRoot, editor, editor.selection)
  awareness.setLocalStateField('selection', relRange)
}
```

This is done manually rather than relying on `withCursors`' `autoSend` because the CJS/ESM dual-package hazard with `@slate-yjs/core` can cause the wrapped `onChange` to not fire reliably.

---

## Leader Election for Auto-Save

**File:** `apps/web/src/features/editor/components/Editor.tsx` (inside `CollaborativeEditor`)

### The Problem

When multiple peers are editing the same document, all of them detect changes to the Y.Doc. Without coordination, every peer would attempt to save simultaneously, causing redundant writes and potential conflicts.

### The Solution

The collaborative auto-save uses a simple leader election scheme based on Yjs client IDs:

```typescript
const doSave = useCallback(async () => {
  if (!onSaveRef.current || readOnly) return
  if (!isBoundRef.current) return
  hasPendingRef.current = false

  // Leader election: only the peer with lowest clientID saves
  const aw = awarenessRef.current
  const states = aw.getStates()
  let lowestClient = aw.clientID
  states.forEach((_state, clientId) => {
    if (clientId < lowestClient) lowestClient = clientId
  })
  if (lowestClient !== aw.clientID) return

  // ... perform save
}, [readOnly])
```

Each Y.Doc gets a random `clientID` on creation. The awareness protocol tracks which clients are currently connected. Before saving, each peer checks: "Am I the peer with the lowest clientID among all connected peers?" Only the leader saves.

### Timing

- Saves are triggered by Y.Doc `update` events (both local and remote changes)
- 3-second debounce after the last update
- On unmount, the component force-saves regardless of leader status (the departing peer saves what it has)

### Important: This is NOT `useAutoSave`

The solo editor uses `useAutoSave` from `apps/web/src/features/editor/hooks/useAutoSave.ts`. The collaborative editor has its own save logic inline in `CollaborativeEditor` that includes the leader election check. They are separate code paths.

---

## Mouse Presence

Mouse cursor presence is separate from text cursor presence. Text cursors go through Yjs awareness `selection` field. Mouse cursors go through the `mouse` field on the same awareness object.

### Sending: useMousePresence

**File:** `apps/web/src/features/collaboration/hooks/useMousePresence.ts`

This hook tracks the local user's mouse position within the editor container and broadcasts it:

```typescript
awareness.setLocalStateField('mouse', { x, y })
```

Key details:
- **Throttled at 50ms** (`THROTTLE_MS`) using `performance.now()` timestamps
- **Uses `requestAnimationFrame`** to batch position calculations with the browser paint cycle
- **Coordinates**: `x` is a percentage of container width (0-100, one decimal place), `y` is absolute pixels from container top plus scroll offset
- **Cleanup**: sets `mouse` to `null` on mouse leave, visibility change (tab hidden), and unmount
- **Deduplication**: skips broadcast if position has not changed

### Receiving: useRemoteMouseCursors

**File:** `apps/web/src/features/collaboration/hooks/useRemoteMouseCursors.ts`

This hook reads awareness states and extracts remote mouse positions:

```typescript
states.forEach((state, clientId) => {
  if (clientId === awareness.clientID) return  // skip self
  if (!state.user || !state.mouse) return      // skip peers without mouse data

  remoteCursors.push({
    clientId,
    name: state.user.name,
    color: state.user.color,
    avatarUrl: state.data?.avatarUrl ?? state.user.avatarUrl,
    x: state.mouse.x,
    y: state.mouse.y,
  })
})
```

It uses a module-level `const EMPTY: RemoteMouseCursor[] = []` for the empty fallback -- this prevents infinite re-render loops when the array is consumed by `useEffect` dependencies (a pattern used throughout the codebase; see `CLAUDE.md`).

### Rendering: RemoteMouseCursors

**File:** `apps/web/src/features/collaboration/components/RemoteMouseCursors.tsx`

Renders each remote cursor as a pointer-events-none overlay with:
- An SVG cursor icon (`MouseCursorIcon`) in the user's color
- A label (user name or avatar) that fades out after 3 seconds of inactivity (`LABEL_FADE_MS`)
- Smooth 80ms CSS transitions on position changes

---

## Text Cursor Overlay

**File:** `apps/web/src/features/collaboration/components/RemoteCursorOverlay.tsx`

This component renders remote users' text cursors and selections inside the editor. It is the most technically involved UI component in the collaboration system.

### How It Works

1. Reads awareness states to find remote peers with a `selection` field
2. Reconstructs Yjs `RelativePosition` objects from the JSON in awareness
3. Converts relative positions to Slate ranges using `relativeRangeToSlateRange` from `@slate-yjs/core`
4. Maps Slate ranges to DOM ranges using `DOMEditor.toDOMRange` from `slate-dom`
5. Measures DOM range rects to position the caret and selection highlights

### The slate-dom Dual Copy Problem

This component contains a critical workaround. There are two copies of `slate-dom` in the dependency tree:

- `slate-dom@0.123.0` -- top-level, used by `slate-react` and `PlateContent`
- `slate-dom@0.114.0` -- nested under `@udecode/slate`

The WeakMaps that map Slate nodes to DOM elements are populated by `slate-react` using the 0.123.0 copy. If you use `editor.api.toDOMNode` or `editor.api.toDOMRange`, those calls go through `@udecode/slate`, which resolves to the 0.114.0 copy -- a different module instance with empty WeakMaps. Every lookup fails silently.

The fix: import `DOMEditor` directly from `slate-dom` (which resolves to the top-level 0.123.0 copy):

```typescript
// CORRECT -- resolves to top-level slate-dom (same WeakMaps as slate-react)
import { DOMEditor } from 'slate-dom'

// WRONG -- goes through @udecode/slate -> nested slate-dom (empty WeakMaps)
// editor.api.toDOMNode(...)
```

### Rendering

For each remote cursor, the component renders:
- **Selection highlight**: semi-transparent colored rectangles over the selected text (opacity 20%)
- **Caret**: a 2px-wide vertical bar in the user's color at the cursor position
- **Label**: user name or avatar above the caret, fading out after 3 seconds of inactivity

The component re-renders on awareness changes (via `requestAnimationFrame`) and on a 500ms interval to handle fade transitions.

---

## User Colors

**File:** `apps/web/src/features/collaboration/lib/user-colors.ts`

Colors are assigned deterministically from a 12-color palette using a hash of the user's ID:

```typescript
export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}
```

The same user always gets the same color, regardless of which document they are in or which peer computes it. The palette is chosen for contrast on both light and dark backgrounds.

---

## CollaboratorAvatars

**File:** `apps/web/src/features/collaboration/components/CollaboratorAvatars.tsx`

Shows active collaborators in the document header. Reads awareness states and renders up to 5 avatars (with an overflow `+N` indicator). Each avatar is either a profile image or a colored circle with the user's initial.

Listens for awareness `update` events and re-renders when users join or leave.

---

## ConnectionStatus

**File:** `apps/web/src/features/collaboration/components/ConnectionStatus.tsx`

Shows the current sync state as a small colored dot with a label:

| Status | Color | Label | Condition |
|--------|-------|-------|-----------|
| `connected` | Green | Synced | `provider.isSynced` |
| `syncing` | Yellow | Syncing... | `provider.isConnected && !isSynced` |
| `reconnecting` | Yellow | Reconnecting... | `provider.isReconnecting` |
| `offline` | Gray | Offline | None of the above |

Since `UnifiedProvider` does not expose events, the component polls the provider state every 1 second.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/features/collaboration/lib/supabase-yjs-provider.ts` | Custom Yjs provider over Supabase Broadcast |
| `src/features/collaboration/hooks/useCollaboration.ts` | Creates Y.Doc, Awareness, and provider for a document |
| `src/features/collaboration/hooks/useMousePresence.ts` | Tracks and broadcasts local mouse position |
| `src/features/collaboration/hooks/useRemoteMouseCursors.ts` | Reads remote mouse positions from awareness |
| `src/features/collaboration/lib/yjs-utils.ts` | Base64 encoding/decoding, Y.Doc seeding utility |
| `src/features/collaboration/lib/user-colors.ts` | Deterministic user color assignment |
| `src/features/collaboration/components/CollaboratorAvatars.tsx` | Active user avatars in document header |
| `src/features/collaboration/components/ConnectionStatus.tsx` | Sync state indicator |
| `src/features/collaboration/components/RemoteCursorOverlay.tsx` | Remote text cursor and selection rendering |
| `src/features/collaboration/components/RemoteMouseCursors.tsx` | Remote mouse cursor rendering |
| `src/features/collaboration/components/MouseCursorIcon.tsx` | SVG cursor pointer icon |
| `src/features/editor/components/Editor.tsx` | `CollaborativeEditor` with Yjs plugin setup and leader-elected auto-save |
| `src/features/objects/components/ObjectEditor.tsx` | Activation conditions for collaborative mode |

All paths above are relative to `apps/web/`.

---

## Gotchas Summary

1. **YjsPlugin needs `ydoc` + `awareness` in options.** Without these, it creates its own Y.Doc, causing "Path doesn't match yText" errors from a Slate/Y.Doc tree mismatch.

2. **Never use `editor.api.yjs.init()`.** It is async (uses `slateToDeterministicYjsState`) and has a stale-closure bug where `autoConnect` reads an empty `_providers` map. Use manual seeding + `YjsEditor.connect()` instead.

3. **Do not pass `value` to `usePlateEditor` in collaborative mode.** The Y.Doc is the source of truth. Passing `value` conflicts with Yjs state.

4. **Provider `disconnect()` must always clean up the channel.** No `if (!isConnected) return` guard -- React strict mode can call disconnect before the async channel subscribe completes. The channel must be cleaned up regardless.

5. **Sender filter uses instance UUID, not userId.** This enables same-user cross-tab editing. If it used `userId`, a user with two tabs would drop all sync messages.

6. **Two copies of `slate-dom` cause WeakMap lookup failures.** Import `DOMEditor` directly from `slate-dom` (top-level 0.123.0 copy), not through `editor.api.*` which resolves to the nested 0.114.0 copy.

7. **Leader election uses Yjs clientID comparison.** The peer with the lowest `clientID` among all aware peers performs saves. No custom election protocol -- just a min-comparison on each save attempt.

8. **Sync timeout is 500ms.** If no peer responds to sync-step1 within 500ms, the provider assumes sole-editor status. This may need tuning for high-latency networks.

9. **Reconnect backoff caps at 30 seconds.** Delays double from 1s up to 30s max.

10. **Periodic re-sync runs every 30 seconds.** Recovers from dropped Broadcast messages since Supabase Broadcast has no delivery guarantee.

11. **Y.Doc seeding uses fixed `clientID = 0`.** This ensures all peers produce identical Yjs structs for initial content, preventing content duplication when multiple peers seed independently.

---

## Exercises

1. Read `supabase-yjs-provider.ts` end to end and trace the sync protocol: what happens when `connect()` is called, how `sync-step1` triggers `sync-step2`, and how incremental `yjs-update` messages flow during editing.

2. In `Editor.tsx`, find the leader election code inside the `doSave` callback of `CollaborativeEditor`. Understand how it reads awareness states, compares clientIDs, and decides whether to save. Then find the force-save on unmount that skips leader election.

3. In `ObjectEditor.tsx`, identify the three conditions that gate `isCollaborative`. Trace where `storageMode`, `canEdit`, and `isSharedSpace` each come from. Pay attention to the difference between owner and recipient logic for `isSharedSpace`.

4. Trace the full lifecycle of mouse presence: how `useMousePresence` attaches to a container element, throttles and broadcasts position, how `useRemoteMouseCursors` reads those positions from awareness, and how `RemoteMouseCursors` renders the overlay with fade-out labels.

5. Understand why `crypto.randomUUID()` is used for the sender filter instead of `userId`. Open the same document in two browser tabs logged in as the same user, and observe that both tabs collaborate with each other -- this would fail if `userId` were used as the sender ID.
