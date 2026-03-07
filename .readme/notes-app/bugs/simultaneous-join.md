# Simultaneous join content duplication

**Status**: Closed
**Feature**: Realtime Collaboration
**Severity**: High — document content doubles when two users open the same page at nearly the same time

## Description

When two users navigate to the same shared document at close to the same time, the page content appears twice. This is a race condition in the Y.Doc seeding logic.

## Root cause

Both clients connect with empty Y.Docs and exchange empty sync-step1/sync-step2 messages. After sync completes, both check `sharedType.length === 0` (true for both since neither had content during sync), and both independently seed the Y.Doc using `slateNodesToInsertDelta`. Each seed uses a different Yjs clientID, so the CRDT treats them as distinct insertions and merges them — doubling the content.

## Fix

Temporarily set `doc.clientID = 0` before seeding so every peer produces identical Yjs structs (same client + clock pairs). When the second peer's seed update arrives, Yjs recognizes the structs already exist and skips them. The real clientID is restored immediately after seeding for subsequent edits.

## Key files

- `src/features/editor/components/Editor.tsx` — `CollaborativeEditor` seeding logic in the sync callback
