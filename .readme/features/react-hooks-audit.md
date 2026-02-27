# React Hooks Audit

**Status:** Not started

## Overview

Audit of all 47 custom React hooks across the codebase. Covers referential stability, race conditions, stale closures, resource leaks, performance, and Zustand patterns. Findings ranked by severity with specific file locations and fix guidance.

All file paths below are relative to `apps/web/src/`.

## Hook Inventory (47 hooks)

| Area | Hooks | Files |
|------|-------|-------|
| Data access | `useDataClient`, `useStorageMode`, `useAuth`, `useSpaceId`, `useMigrateData` | `shared/lib/data/DataProvider.tsx` |
| Spaces | `useCurrentSpace`, `useSpaces` | `shared/lib/data/SpaceProvider.tsx` |
| Objects | `useObjects`, `useObject`, `useNextTitle` | `features/objects/hooks/` |
| Object types | `useObjectTypes`, `useObjectType`, `useObjectTypeMap` | `features/object-types/hooks/` |
| Global types | `useGlobalObjectTypes` | `features/global-types/hooks/` |
| Relations | `useAllRelations`, `useObjectRelations` | `features/relations/hooks/` |
| Tags | `useTags`, `useObjectTags`, `useObjectTagsBatch`, `useTagCounts` | `features/tags/hooks/useTags.ts` |
| Templates | `useTemplate`, `useTemplates` | `features/templates/hooks/` |
| Pins | `usePins` | `features/pins/hooks/usePins.ts` |
| Saved views | `useSavedViews` | `features/table-view/hooks/useSavedViews.ts` |
| Editor | `useAutoSave`, `useImageResize` | `features/editor/hooks/` |
| Collaboration | `useCollaboration`, `useMousePresence`, `useRemoteMouseCursors` | `features/collaboration/hooks/` |
| Sharing | `useSpacePermission`, `useExclusionFilter`, `useSpaceShares` | `features/sharing/hooks/` |
| Graph | `useGraphData`, `useForceSimulation`, `useGraphLayout` | `features/graph/` |
| Search | `useGlobalSearch` | `features/search/hooks/` |
| Sidebar | `useCollapsible` | `features/sidebar/hooks/` |
| Onboarding | `useTutorial` | `features/onboarding/hooks/` |
| Starter kits | `useImportKit` | `features/starter-kits/hooks/` |
| Account | `useAccountExport` | `features/account/hooks/` |
| Shared utilities | `useNavigate`, `useIsMobile`, `useToast`, `useMutationAction`, `useVoidMutationAction`, `useFocusOnNavigation`, `useSessionGuard` | `shared/hooks/` |

## Findings

### S1. `useMutationAction` defeats `useCallback` for every consumer

**Severity:** High (systemic)
**File:** `shared/hooks/useMutationAction.ts` — affects every data hook

The returned callback depends on `[fn, actionLabel, emitChannels, onSuccess]`. Every caller passes `options` as an inline object literal:

```ts
const create = useMutationAction(createFn, {
  actionLabel: 'Create object',
  emitChannels: ['objects'],   // ← new array reference every render
})
```

`emitChannels` is a new array each render, so the `useCallback` inside `useMutationAction` recomputes every render — making it a no-op. Every mutation function returned from `useObjects`, `useObjectTypes`, `useTags`, `useSavedViews`, `useSpaceShares`, `usePins`, etc. is an unstable reference.

Additionally, `useSpaceShares` passes `onSuccess: () => invalidate()` — a new arrow function every render — making `createShare`, `updateShare`, `deleteShare` also unstable.

**Impact:** Not causing infinite loops today because these are called from event handlers, not effect deps. But every downstream `useCallback` wrapping them is wasted work, and any future code using them in a dep array will fire every render. The hooks give a false impression of referential stability.

**Fix:** Accept `emitChannels` and `onSuccess` via refs inside `useMutationAction`, removing them from the `useCallback` dependency array. Or hoist options to module scope / wrap in `useMemo` at call sites.

---

### S2. `SpaceProvider.loadSpaces` race condition

**Severity:** High (correctness)
**File:** `shared/lib/data/SpaceProvider.tsx:75-158`

`loadSpaces` fires from two sources:
1. The `useEffect` at line 155 (on mount / auth change)
2. `subscribe('spaces', loadSpaces)` and `subscribe('spaceShares', loadSpaces)` at lines 161-164

If events fire in quick succession, multiple `loadSpaces` calls race. Whichever resolves last writes state — potentially stale data from the first call overwriting fresh data from the second.

The empty-space guard at lines 85-97 calls `spacesClient.create({ name: 'My Space' })`. If two concurrent `loadSpaces` calls both see zero spaces, two default spaces get created for Supabase users (no uniqueness constraint on space name).

**Fix:** Add a sequence counter or `cancelled` flag to the effect. Abort stale calls before writing state. Consider making the default-space creation idempotent server-side.

---

### S3. `useExclusionFilter` async race condition

**Severity:** Medium (data visibility correctness)
**File:** `features/sharing/hooks/useExclusionFilter.ts:25-54`

No `cancelled` flag on the async effect. If `space` changes twice rapidly (user switches spaces), both `loadExclusions()` calls run concurrently. The first call (for old space) could resolve after the second (for new space), writing wrong-space exclusions to state. Type/field exclusions from Space A would be applied to Space B's data — hiding content that should be visible or showing content that should be hidden.

For a sharing/permissions feature, this is a data visibility correctness issue.

**Fix:** Add `let cancelled = false` in the effect with `return () => { cancelled = true }`, and check before calling `setExclusions`.

---

### S4. `useImageResize` stale closure on final width

**Severity:** Medium (off-by-one UX bug)
**File:** `features/editor/hooks/useImageResize.ts:74-88`

`handlePointerUp` reads `state.previewWidth` from the closure. The dep array includes `state.isResizing` and `state.previewWidth`, so the callback recreates when these change. But `handlePointerMove` calls `setState(prev => ({ ...prev, previewWidth: newWidth }))` which is async. If `pointerup` fires in the same frame before React flushes the state update, `handlePointerUp` reads the previous `previewWidth`. The user sees the correct preview (via optimistic state), but the persisted width is 1-2px off.

**Fix:** Track `previewWidth` in a ref alongside state. Read the ref in `handlePointerUp`.

---

### S5. `usePins.toggle` double-click race

**Severity:** Medium (incorrect mutation)
**File:** `features/pins/hooks/usePins.ts:84-90`

`toggle` checks `pinnedIds.has(objectId)` then calls `pin` or `unpin`. `pin` does a synchronous optimistic update via `queryClient.setQueryData`, but `pinnedIds` is derived from `data` via `useMemo` — it updates only after React re-renders. If the user double-clicks, the second click reads stale `pinnedIds` and sends a duplicate `pin()` instead of `unpin()`.

**Fix:** Read current pin state from `queryClient.getQueryData` inside `toggle` instead of from the memoized Set.

---

### S6. `useCollaboration` leaks Y.Doc on document navigation

**Severity:** Medium (memory leak)
**File:** `features/collaboration/hooks/useCollaboration.ts:36-74`

When `documentId` changes, `useMemo` creates a new `Y.Doc`, `Awareness`, and `SupabaseYjsProvider`. The `useEffect` cleanup disconnects the provider, but `Y.Doc.destroy()` is never called. Yjs docs hold internal observers, subdocs, and cross-references. Without explicit destruction, old docs accumulate in memory during rapid document navigation.

**Fix:** Call `collab.doc.destroy()` in the `useEffect` cleanup, after disconnecting the provider.

---

### S7. `SpaceProvider.spacesContextValue` inline closures churn context

**Severity:** Low-Medium (performance)
**File:** `shared/lib/data/SpaceProvider.tsx:215-352`

The `spacesContextValue` useMemo contains 5 inline async functions (`create`, `update`, `remove`, `archiveSpace`, `unarchiveSpace`) totaling ~130 lines. These close over `user`, `supabase`, `ownedSpaces`, `sharedSpaces`, `currentSpaceId`, and `switchSpace` — all listed as deps.

Every space switch (changing `currentSpaceId`) recreates the entire context value, re-rendering every `useSpaces()` consumer even though the CRUD functions haven't logically changed. `archiveSpace` reads `ownedSpaces` from closure to guard against archiving the last space — but uses values captured at useMemo evaluation time, which can be stale if spaces were added since the last render.

**Fix:** Extract CRUD operations into separate `useCallback` hooks. Read `ownedSpaces` from a ref inside `archiveSpace`.

---

### S8. `useForceSimulation` creates N*2 objects per tick at 60fps

**Severity:** Low-Medium (performance)
**File:** `features/graph/lib/useForceSimulation.ts:76-81`

```ts
simulation.on('tick', () => {
  setSimulatedNodes(clonedNodes.map(n => ({ ...n })))
  setSimulatedEdges(clonedEdges.map(e => ({ ...e })))
})
```

D3 ticks ~60x/second. For 100 nodes + 150 edges, this is 30,000 object allocations/second. Two `setState` calls per tick also means two re-renders per frame — D3's `on('tick')` fires outside React's event system, so React 18+ automatic batching may not apply.

**Fix:** Combine into a single `{ nodes, edges }` state object. Coalesce ticks into one update per frame via `requestAnimationFrame`. Consider a version counter + ref approach to avoid spreading objects entirely.

---

### S9. `useEditorStore` global singleton

**Severity:** Low (architectural risk)
**File:** `features/editor/store.ts`

This Zustand store is module-scoped. If the app ever renders two editor instances simultaneously (split view, nested editing, preview pane), they'd share `content`, `isDirty`, and `isSaving` — one editor's `markClean()` could suppress another's auto-save.

Not a bug today (single editor assumption holds), but architecturally fragile.

**Fix (future):** Convert to a context-scoped store or accept a store instance as a parameter. Document the single-editor assumption in the meantime.

---

### S10. `useNavigate` never clears `isNavigating`

**Severity:** Low (potential stuck state)
**File:** `shared/hooks/useNavigate.ts:11-16`

`push` calls `setNavigating(true)` but never sets it back to `false`. The `navigation` Zustand store at `shared/stores/navigation.ts` has no auto-reset logic. If nothing else in the app clears this flag, `isNavigating` stays true permanently after the first navigation.

**Fix:** Verify where `setNavigating(false)` is called. If nothing resets it, add a `useEffect` on `usePathname()` to clear the flag.

---

### S11. Double query invalidation on every mutation

**Severity:** Low (wasted work)
**Files:** `shared/lib/data/events.ts`, all mutation hooks

`emit('tags')` calls `queryClient.invalidateQueries({ queryKey: ['tags'] })` which broadly invalidates all tag queries. Then callers like `useObjectTags.addTag` also call `queryClient.invalidateQueries({ queryKey: queryKeys.tags.objectTags(objectId) })` — a subset already covered by the broad invalidation.

Every mutation across `useObjectTags`, `usePins`, `useObjectRelations`, etc. triggers 2-3x the needed query refetches.

**Fix:** Pick one invalidation strategy — either broad via emit (remove caller-side specifics) or precise caller-side (remove broad prefix invalidation from emit). Not both.

---

### S12. `useAccountExport` and `useGlobalSearch` missing async guards

**Severity:** Low (post-unmount state updates)
**Files:** `features/account/hooks/useAccountExport.ts`, `features/search/hooks/useGlobalSearch.ts`

`useAccountExport` runs a long async export with no abort mechanism. If the user navigates away mid-export, `setState` fires on an unmounted component.

`useGlobalSearch` uses a `useRef(true)` isMounted pattern — functional but a legacy approach. The debounce timer cleanup handles most cases; the guard only covers in-flight search requests.

**Fix:** Add `AbortController` to both if the data client supports it. Low priority since these are user-initiated actions.

---

## Patterns Verified as Correct

| Pattern | Examples | Notes |
|---------|----------|-------|
| Module-level EMPTY constants | `useObjects`, `useAllRelations`, `useRemoteMouseCursors`, `usePins`, `useTags` | Consistently applied; prevents TanStack Query infinite loops |
| Zustand `getState()` in callbacks | `useAutoSave` | Avoids all closure staleness in save path |
| Ref-based callback stabilization | `useAutoSave.onSaveRef` | Prevents effect churn |
| `keepPreviousData` for smooth UX | `useObjects`, `useObjectTypes`, `useTags`, `useSavedViews` | Consistent |
| State-during-render pattern | `useCollapsible` | Correct React "adjust state when props change" pattern |
| `useSyncExternalStore` | `useIsMobile` | Correct SSR-safe pattern with `getServerSnapshot` |
| RAF / timer cleanup | `useGraphLayout`, `useMousePresence`, `useGlobalSearch`, `useAutoSave` | All properly cleaned up |
| Subscription cleanup | `useSessionGuard`, `useCollaboration`, `useRemoteMouseCursors` | All properly cleaned up |
| Intentional exhaustive-deps suppressions | `useCollaboration:63`, `useGraphLayout:154` | Documented and correct — prevent unwanted provider teardown / animation re-trigger |

## Severity Summary

| Severity | # | IDs |
|----------|---|-----|
| High | 2 | S1 (useMutationAction instability), S2 (SpaceProvider race) |
| Medium | 4 | S3 (exclusion filter race), S4 (image resize off-by-one), S5 (pin toggle double-click), S6 (Y.Doc leak) |
| Low-Medium | 2 | S7 (SpaceProvider context churn), S8 (force simulation allocations) |
| Low | 4 | S9 (editor store singleton), S10 (navigate stuck state), S11 (double invalidation), S12 (missing async guards) |

## Fix Plan

### Phase 1 — Correctness (S1, S2, S3, S5)

1. **S1:** Refactor `useMutationAction` to use refs for `emitChannels` and `onSuccess`, making the returned callback stable
2. **S2:** Add sequence counter to `SpaceProvider.loadSpaces` to discard stale results; add idempotency guard for default space creation
3. **S3:** Add `cancelled` flag to `useExclusionFilter` async effect
4. **S5:** Read pin state from query cache inside `usePins.toggle`

### Phase 2 — Resource Management (S4, S6, S10)

5. **S6:** Add `Y.Doc.destroy()` call to `useCollaboration` cleanup
6. **S4:** Add previewWidth ref to `useImageResize`
7. **S10:** Verify `isNavigating` reset path; add safety reset if missing

### Phase 3 — Performance (S7, S8, S11)

8. **S8:** Batch `useForceSimulation` state updates and coalesce with RAF
9. **S7:** Extract `SpaceProvider` CRUD into stable `useCallback` hooks
10. **S11:** Deduplicate mutation invalidation strategy (pick emit-only or caller-only)

### Phase 4 — Hardening (S9, S12)

11. **S12:** Add `AbortController` to `useAccountExport` and `useGlobalSearch`
12. **S9:** Document single-editor assumption; consider scoped store for future multi-editor support
