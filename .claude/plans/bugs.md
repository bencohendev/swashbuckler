# Known Bugs

## Collaborative cursor presence not visible

**Status**: Open
**Feature**: Realtime Collaboration
**Severity**: Medium — collaboration content sync works, but users cannot see each other's text cursor/selection

### Description

When two users are collaboratively editing a shared document, remote cursor positions (caret line + colored selection highlight + user name label) do not appear. The Figma-style mouse cursor presence works, but the text editor cursor overlay does not.

### Architecture

- **Sending**: On editor change, the local user's Slate selection is converted to a Yjs `RelativeRange` via `slateRangeToRelativeRange()` and written to Yjs awareness state under the `'selection'` field.
- **Broadcasting**: `SupabaseYjsProvider` listens to awareness updates and broadcasts them over Supabase Realtime Broadcast channels.
- **Receiving**: `RemoteCursorOverlay` reads awareness states directly, converts remote `RelativeRange` back to Slate ranges via `relativeRangeToSlateRange()`, maps to DOM rects, and renders an absolute-positioned overlay.

### What's been investigated

1. **Missing RelativeRange → SlateRange conversion** (fixed) — Original `RemoteCursorOverlay` passed Yjs RelativeRange directly to `editor.api.toDOMRange()` which expects a Slate Range. Added `relativeRangeToSlateRange()` conversion.

2. **Dual-package hazard with `@slate-yjs/core`** (fixed) — `@slate-yjs/core` has separate CJS (`dist/index.cjs`) and ESM (`dist/index.js`) entry points. `@udecode/plate-yjs` may load the CJS version while our code imports the ESM version, creating separate module-level `WeakMap`/`WeakSet` instances (`CONNECTED`, `CURSOR_CHANGE_EVENT_LISTENERS`). Rewrote `RemoteCursorOverlay` to bypass all `CursorEditor`/`YjsEditor` static APIs and read awareness state directly.

3. **withCursors autoSend may not fire** (fixed) — `withCursors` wraps `editor.onChange` inside `connect()`, but the `YjsEditor.connected()` guard may fail due to the dual-package `CONNECTED` WeakSet being separate. Added manual cursor position sending in `CollaborativeEditor.handleChange` via `awareness.setLocalStateField('selection', relRange)`.

4. **Cursor data not set in awareness** (fixed) — Added explicit `awareness.setLocalStateField('data', cursorData)` in the connect useEffect as a safety net.

5. **ESM/CJS type mismatch for sharedRoot** (fixed) — Changed `RemoteCursorOverlay` to use `doc.get('content', Y.XmlText)` with our ESM `yjs` import instead of accessing `editor.sharedRoot` (set by CJS `withYjs`).

6. **Awareness JSON round-trip destroys Y.RelativePosition class instances** (fixed) — Awareness state is encoded/decoded via `JSON.stringify`/`JSON.parse` in y-protocols. `Y.RelativePosition` instances (with `Y.ID` sub-objects) become plain objects after round-trip. While Yjs currently uses duck typing (property access only, no instanceof checks on RelativePosition/ID), this is fragile. Added `Y.createRelativePositionFromJSON()` reconstruction to create proper class instances from deserialized JSON.

7. **DOM stale during awareness-triggered cursor update** (fixed) — When a Y.Doc update and awareness update arrive together, `withYjs` applies the Y.Doc changes to the Slate tree synchronously, but React hasn't re-rendered the DOM yet. The overlay's `updateCursors` would then try to resolve cursor positions against a stale DOM, causing `editor.api.toDOMRange()` to fail silently. Fixed by deferring cursor updates to `requestAnimationFrame`, giving React a chance to flush DOM updates.

8. **`getClientRects()` returns 0 rects for collapsed ranges** (fixed) — When the remote user has a cursor (no text selection), the DOM Range is collapsed. `getClientRects()` can return 0 rects in certain contexts (empty paragraphs, element boundaries). Added `getBoundingClientRect()` fallback which returns a zero-width rect at the caret position even when `getClientRects()` is empty.

9. **`overflow-hidden` clips caret label** (fixed) — The overlay container had `overflow-hidden` which clipped the caret user-name label (positioned at `-top-5`) when the cursor was near the top of the editor. Removed `overflow-hidden`.

10. **`slate-dom` dual-package hazard — `editor.api.toDOMNode/toDOMRange` always fails** (ROOT CAUSE, fixed) — Two copies of `slate-dom` exist in the dependency tree: `slate-dom@0.123.0` (top-level, used by `slate-react`/`PlateContent`) and `slate-dom@0.114.0` (nested under `@udecode/slate`). `PlateContent` renders `<Editable>` from `slate-react`, which sets `EDITOR_TO_ELEMENT`, `EDITOR_TO_KEY_TO_ELEMENT`, etc. WeakMaps in the 0.123.0 copy. But `editor.api.toDOMNode` and `editor.api.toDOMRange` are defined in `@udecode/slate` which imports from the nested 0.114.0 copy — a completely separate set of WeakMaps that are never populated. Result: every `editor.api.toDOMNode(editor)` call returns `undefined`, causing the overlay to bail out before it even looks at awareness states. **Fix**: Import `DOMEditor` directly from `slate-dom` (resolves to top-level 0.123.0) and call `DOMEditor.toDOMNode(editor, editor)` / `DOMEditor.toDOMRange(editor, range)` instead of going through `editor.api.*`.

### If still not working — diagnostic steps

- In browser devtools, run: `window.__awareness = awareness` (exposed from useCollaboration) to inspect `.getStates()` in both browser tabs
- Check if awareness states contain `selection` and `data` fields for remote peers
- Add temporary `console.log` in `updateCursors` before/after `relativeRangeToSlateRange` and `toDOMRange` calls

### Key files

- `src/features/editor/components/Editor.tsx` — CollaborativeEditor sends cursor positions
- `src/features/collaboration/components/RemoteCursorOverlay.tsx` — Renders remote cursors
- `src/features/collaboration/lib/supabase-yjs-provider.ts` — Broadcasts awareness over Supabase
- `src/features/collaboration/hooks/useCollaboration.ts` — Creates Y.Doc, Awareness, Provider
- `node_modules/@slate-yjs/core/dist/index.js` — `withCursors`, `withYjs`, `CONNECTED` WeakSet
- `node_modules/@udecode/plate-yjs/dist/index.mjs` — `withPlateYjs` applies `withCursors`
