# Unsaved changes lost when navigating away quickly

**Status**: Fixed
**Feature**: Editor
**Severity**: High — user data loss

## Description

Creating or editing an entry and clicking away quickly (e.g., navigating to another entry or sidebar item) can result in changes not being persisted. When the entry is re-opened, some edits are missing.

## Root cause

Two compounding issues:

1. **No key-based remount**: `<Editor>` in ObjectEditor had no `key` prop. When navigating between entries (`/objects/A` → `/objects/B`), React reused the same SoloEditor instance — it never unmounted. The unmount save effect never fired. Meanwhile the global Zustand store was overwritten with the new entry's content, and `onSaveRef` was updated to the new entry's save function. The pending debounce timer from entry A would eventually fire, but by then it would save the wrong content to the wrong entry (or the wrong content to the new entry).

2. **Unstable save callback**: The `save` callback in `useAutoSave.ts` had `content`, `isDirty`, and `onSave` in its dependency array, causing it to change on every keystroke. Even if the unmount effect had fired, it captured stale values. In collaborative mode, `doSave` had the same instability.

There was also no `beforeunload` handler, so closing the tab silently dropped pending changes.

## Fix

**Key-based remount (`ObjectEditor.tsx`):**
- Added `key={id}` to `<Editor>` — forces React to unmount the old editor and mount a fresh one when the entry changes
- On unmount, the save flush fires with the correct content (still in the global store) and the correct save function (still in the old instance's ref)

**Spurious save prevention (`Editor.tsx` SoloEditor + CollaborativeEditor):**
- Added `markClean()` effect on mount (SoloEditor) and after Y.Doc seeding (CollaborativeEditor) — Plate fires onChange during initialization which marks the store dirty even though the user hasn't edited anything; this clears that false positive

**Stable save callback (`useAutoSave.ts`):**
- Store `onSave` in a ref; read `content`, `isDirty`, `setSaving`, `setLastSaved`, `markClean` from `useEditorStore.getState()` at call time
- `save` now has `[]` deps — fully stable reference
- Unmount effect reads `isDirty` from `getState()` (not stale closure) and clears the pending debounce timer before flushing
- `markClean()` called at save start to prevent concurrent duplicate saves; re-marks dirty on failure
- New `beforeunload` listener prompts the user when dirty changes exist

**Collaborative mode (`Editor.tsx`):**
- `onSave`, `awareness`, `editor` stored in refs; `doSave` reads from refs → deps reduce to `[readOnly]`
- Y.Doc update listener no longer re-registers unnecessarily
- `doSave` fires on unmount when `hasPendingRef.current` is true

**Dirty tracking for both modes:**
- `setContent` always sets `isDirty: true` regardless of collaborative mode — enables the "Unsaved changes" / "Edited" status indicators in both modes
- `handleContentSave` throws when `update()` returns an error — ensures the save's catch block fires correctly

**Status indicators:**
- ObjectEditor header: "Unsaved changes" (amber) / "Saving..." / "Saved [time]"
- Editor overlay: "Edited" / "Saving..." / "Saved [time]"

## Key files

- `src/features/editor/hooks/useAutoSave.ts`
- `src/features/editor/components/Editor.tsx`
- `src/features/editor/store.ts`
- `src/features/objects/components/ObjectEditor.tsx`
