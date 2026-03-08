# Client API Audit

**Status:** Done

## Overview

Audit of the client-side data layer: DataClient interface design, TanStack Query configuration, query key consistency, mutation/invalidation patterns, error handling, request waterfall detection, cache utilization, and Supabase/Dexie client parity.

## Scope

### In Scope
- DataClient interface completeness and type safety
- TanStack Query configuration (staleTime, gcTime, retry, refetch)
- Query key factory consistency and collision avoidance
- Mutation patterns and cache invalidation correctness
- Error handling uniformity across all data hooks
- Request waterfall detection (serial fetches that could be parallel)
- Cache utilization and deduplication
- Supabase client vs Dexie client parity
- Optimistic updates (presence or absence, correctness)
- Loading/error state handling in UI components

### Out of Scope
- Database schema and RLS policies (covered in [Database Audit](database-audit.md) and [API Audit — Backend](api-audit-backend.md))
- API endpoint correctness (covered in [API Audit — Backend](api-audit-backend.md))
- Frontend API call review already completed (covered in [API Audit — Frontend](api-audit-frontend.md))

## Audit Areas

### 1. DataClient Interface Design

**Checks:**
- All CRUD operations covered for every entity (objects, types, templates, relations, tags, pins, spaces)
- Method signatures consistent (parameter order, return types)
- Optional parameters vs overloads
- Error return types (thrown errors vs result types)
- Type safety (generic parameters, no `any` types)
- Interface matches both Supabase and Dexie implementations

**Key Files:**
- `src/shared/lib/data/types.ts` — DataClient interface and Zod schemas
- `src/shared/lib/data/supabase.ts` — Supabase implementation
- `src/shared/lib/data/local.ts` — Dexie implementation

**Pass Criteria:**
- Every DataClient method has matching implementations in both clients
- No `any` types in interface signatures
- Consistent error handling pattern across all methods

### 2. TanStack Query Configuration

**Checks:**
- Global defaults (staleTime: 30s, gcTime: 5min) appropriate for each query type
- Per-query overrides where needed (e.g., user profile rarely changes, objects change often)
- Retry configuration (count, delay, which errors retry)
- Refetch on window focus / reconnect behavior
- Suspense mode usage (if any)
- Query client creation and provider setup

**Key Files:**
- `src/shared/lib/data/DataProvider.tsx` — query client setup
- `src/features/*/hooks/` — individual query hooks

**Pass Criteria:**
- staleTime/gcTime appropriate per data type
- No aggressive refetching causing unnecessary API calls
- Retry doesn't loop on permanent errors (404, 403)

### 3. Query Key Consistency

**Checks:**
- All queries use `queryKeys` factory (no inline key arrays)
- Key hierarchy correct (entity → list → detail)
- Space scoping in keys (queries include spaceId)
- No key collisions between different queries
- Invalidation keys match query keys (not over/under-invalidating)

**Key Files:**
- `src/shared/lib/data/queryKeys.ts` — key factory
- All files importing `queryKeys`

**Pass Criteria:**
- Every `useQuery` call uses `queryKeys.xxx` factory
- Invalidation in mutations targets correct scope
- No stale data from key mismatches

### 4. Mutation & Invalidation Patterns

**Checks:**
- All mutations invalidate affected queries
- Invalidation scope correct (not too broad, not too narrow)
- Cross-entity invalidation (e.g., deleting a type invalidates objects)
- `emit(channel)` calls trigger query invalidation
- Optimistic updates used where appropriate (or justified absence)
- Mutation error handling (rollback, user notification)

**Key Files:**
- `src/shared/lib/data/` — emit/subscribe system
- `src/features/*/hooks/` — mutation hooks

**Pass Criteria:**
- No stale data after mutations in any view
- Invalidation doesn't cause unnecessary refetch cascades
- Errors surfaced to user via toast or inline message

### 5. Error Handling Uniformity

**Checks:**
- Consistent pattern for handling query errors (error boundaries vs inline)
- Consistent pattern for handling mutation errors (toast, inline, retry)
- Network error handling (offline detection, retry)
- Auth error handling (session expired → redirect to login)
- Supabase-specific error codes mapped to user messages
- Dexie error handling (quota exceeded, version mismatch)

**Key Files:**
- `src/shared/lib/data/` — data layer error handling
- `src/features/*/hooks/` — per-feature error handling
- `src/features/toast/` — toast notification system

**Pass Criteria:**
- Every mutation surfaces errors to the user
- Auth errors trigger re-authentication flow
- Offline state detected and communicated

### 6. Request Waterfall Detection

**Checks:**
- Queries that depend on other queries (serial chains)
- Components that trigger multiple independent queries on mount
- Sidebar loading (spaces → types → objects: sequential or parallel?)
- Dashboard loading (pins + recent: parallel?)
- Object editor loading (object + type + template: batched?)
- Graph data loading (objects + relations: single RPC or waterfall?)

**Key Files:**
- `src/features/sidebar/` — sidebar data loading
- `src/features/dashboard/` — dashboard hooks
- `src/features/editor/` — editor data loading
- `src/features/graph/` — graph data hooks

**Pass Criteria:**
- Independent queries fire in parallel
- Dependent queries use `enabled` flag (not nested fetches)
- No unnecessary serial loading chains

### 7. Cache Utilization

**Checks:**
- Detail queries populated from list query cache (select/initialData)
- Navigation between views reuses cached data
- Prefetching on hover or route transition
- Cache not bypassed unnecessarily (refetchOnMount: 'always')
- Deduplication working (same query from multiple components)

**Key Files:**
- `src/shared/lib/data/DataProvider.tsx` — query client config
- `src/features/*/hooks/` — query hooks

**Pass Criteria:**
- Navigating to a previously viewed page shows cached data instantly
- Same data not fetched twice from different components
- Stale-while-revalidate pattern working correctly

### 8. Supabase/Dexie Parity

**Checks:**
- All DataClient methods behave identically in both implementations
- Return types match (same shape, same nullability)
- Error behavior matches (same error types for same conditions)
- Sort order consistent between implementations
- Filtering logic equivalent (case sensitivity, partial matching)
- Cascade delete logic matches between Dexie and Supabase

**Key Files:**
- `src/shared/lib/data/supabase.ts` — Supabase client
- `src/shared/lib/data/local.ts` — Dexie client
- `src/shared/lib/data/types.ts` — shared interface

**Pass Criteria:**
- Switching between Supabase and Dexie produces identical UI behavior
- No features work in one mode but break in the other
- Edge cases (empty results, not found) handled identically

## Findings

### Critical Issues

#### C1. Retry retries permanent errors — and errors lack metadata to distinguish them
**Area:** TanStack Query Configuration
**Files:** `providers.tsx:40`, `supabase.ts` (all error returns), all query hooks

Global `retry: 1` retries ALL errors including permanent failures. Worse: the fix is non-trivial because errors are stripped of metadata before reaching TanStack Query.

The error chain works like this:
1. `supabase.ts` catches Supabase errors and returns `{ data: null, error: { message, code } }` — where `code` is a Postgres error code (e.g. `'23505'`), not an HTTP status
2. Query hooks check `result.error` and `throw new Error(result.error.message)` — a generic Error with no `.status` property
3. TanStack Query sees a plain `Error` with only a `.message` string — it cannot distinguish 404 from 500 from duplicate key

**Impact:** Doubled latency on every permanent error. More importantly, no retry callback can filter by status because the status is lost.

**Fix:** Two-part:
1. Create a typed error class that preserves error classification:
```typescript
class DataLayerError extends Error {
  constructor(message: string, public code: string, public retryable: boolean) {
    super(message)
  }
}
```
2. Throw `DataLayerError` from query hooks, then filter in retry:
```typescript
retry: (failureCount, error) => {
  if (error instanceof DataLayerError && !error.retryable) return false
  return failureCount < 1
}
```

#### C2. Missing `emit()` in share mutations — cross-tab sync broken
**Area:** Mutation & Invalidation
**Files:** `sharing/hooks/useSpaceShares.ts:22-56`

`createShare`, `updateShare`, and `deleteShare` call `invalidateQueries()` but never `emit('spaceShares')`. SpaceProvider subscribes to that channel (`SpaceProvider.tsx:162`) for cross-tab sync.

**Impact:** Share changes in one tab don't propagate to other tabs. Also affects exclusion mutations (`addExclusion`, `removeExclusion`, `addSpaceExclusion`).

**Fix:** Add `emit('spaceShares')` after each successful mutation.

#### C3. Inline query keys for relations — bypasses factory
**Area:** Query Key Consistency
**Files:** `relations/hooks/useAllRelations.ts:15`, `graph/hooks/useGraphData.ts:20`

Both use hardcoded `['relations', 'all', spaceId]` instead of the `queryKeys` factory. The `queryKeys.relations` namespace only has `list(objectId)`, missing an `all(spaceId)` entry.

**Impact:** If relation key structure changes, these queries become stale. Violates DRY.

**Fix:** Add `all: (spaceId?: string) => ['relations', 'all', spaceId] as const` to `queryKeys.relations`, update both files.

#### ~~C4.~~ M10. SharingClient is no-op in Dexie — downgraded to Major
**Area:** Supabase/Dexie Parity
**Files:** `local.ts:2091-2107`, `sidebar/components/SpaceSwitcher.tsx:99-108`

All SharingClient methods return `{ error: 'Sharing is not available in guest mode' }`. The Share button in `SpaceSwitcher` renders in guest mode (the `isOwned` guard passes because `!user` is true), but the dialog silently fails — not a crash, but a dead-end UX.

**Impact:** Button clickable → dialog opens → nothing works → no error shown. Poor UX, not a crash.

**Fix:** Guard the Share button with `storageMode === 'supabase'`, or show "not available in guest mode" in the dialog.

#### ~~C5.~~ Pins user scoping mismatch — downgraded to Info
**Area:** Supabase/Dexie Parity
**Files:** `supabase.ts:1561-1630` vs `local.ts:1923-1985`

Supabase scopes all pin operations by `user_id`. Dexie ignores `user_id` (always null in guest mode). Guest mode is always single-user, so the mismatch is purely theoretical. No action required — documented for completeness.

---

### Major Issues

#### M1. Silent mutation errors — 17% toast coverage (should be Critical)
**Area:** Error Handling
**Files:** All feature hooks

95 error checks found across mutations; only 16 produce toast notifications. Most return `null` silently. Four inconsistent patterns: return null, console.error, throw, return error object.

**Root cause:** Zero `useMutation` usage across the entire codebase. All mutations are bare `useCallback` async functions, which means no automatic `isPending`/`isError`/`isSuccess` state tracking, no deduplication of concurrent identical mutations, and no built-in retry. The inconsistent error patterns are a symptom of manually reimplementing what TanStack already provides.

**Additional problem:** Some mutations `emit()` unconditionally even on failure (e.g., `usePins.ts:35-43` calls `emit('pins')` without checking the result). The UI briefly shows the optimistic state, then the next refetch reverts it — a confusing flash for the user.

**Impact:** Users don't know operations failed. Data loss risk. This is the #1 user-facing issue in the audit.

**Fix:** Either adopt `useMutation` across all hooks (preferred — gets isPending/isError/retry for free), or create a standard wrapper that toasts on error and suppresses emit on failure. Standardize return type across hooks.

#### M2. No session-expired redirect
**Area:** Error Handling
**Files:** `supabase.ts:105,244`, `providers.tsx:50-61`

Auth errors return generic "Must be logged in" messages. No 401 detection, no redirect to login page.

**Impact:** Users see cryptic errors instead of being sent to re-authenticate.

**Fix:** Detect 401/auth errors in data layer, trigger redirect to `/login?expired=true`.

#### M3. No error boundaries for sidebar/graph
**Area:** Error Handling
**Files:** Only `EditorErrorBoundary.tsx` and route-level `error.tsx` exist

A single query failure in the sidebar or graph crashes the entire section with no recovery UI.

**Impact:** Sidebar or graph errors take out the whole view.

**Fix:** Add error boundaries around sidebar, graph view, and type manager.

#### M4. Dashboard fires redundant object query
**Area:** Request Waterfalls
**Files:** `pins/components/PinnedObjects.tsx`, `objects/components/RecentObjects.tsx`

`PinnedObjects` calls `useObjects({ isDeleted: false })`, `RecentObjects` calls `useObjects({ isDeleted: false, limit: 5 })`. Different cache keys → two network requests for nearly identical data.

**Impact:** Extra network request on every dashboard load.

**Fix:** Use single `useObjects()` call, filter/slice in memory.

#### M5. Owner ID divergence between Supabase and Dexie
**Area:** Supabase/Dexie Parity
**Files:** `supabase.ts:103-112,713-746` vs `local.ts:450,1190`

Supabase `create()` methods (objectTypes, templates) set `owner_id` from auth user. Dexie sets `owner_id: null`. `GlobalObjectTypesClient.list()` also diverges: Supabase filters by `owner_id=userId`, Dexie doesn't.

**Impact:** Owner-scoped queries behave differently. Syncing auth→guest would break.

**Fix:** Low priority — guest mode is single-user. Document divergence.

#### M6. Search algorithm divergence
**Area:** Supabase/Dexie Parity
**Files:** `supabase.ts:584-655` vs `local.ts:1060-1093`

Supabase: two-pass (title up to 50 results, then content for remainder). Dexie: single pass (title OR content, limit 50 total).

**Impact:** Different result rankings and counts between modes.

**Fix:** Align algorithms or document the difference.

#### M7. Relations create — upsert vs explicit check
**Area:** Supabase/Dexie Parity
**Files:** `supabase.ts:863` vs `local.ts:1314-1347`

Supabase uses `.upsert()` with onConflict. Dexie does explicit filter+check, returns existing if found.

**Impact:** Different behavior on duplicate creation attempts (one succeeds silently, other returns existing).

**Fix:** Low priority — both prevent duplicates. Align for consistency.

#### M8. Dexie quota/version errors unhandled
**Area:** Error Handling
**Files:** `local.ts`

No handling for `QuotaExceededError` or `VersionChangeBlockedError`. App silently fails if IndexedDB quota filled or schema corrupted.

**Impact:** Guest mode data loss with no user feedback.

**Fix:** Catch specific Dexie errors, show recovery UI.

#### M9. Exclusion filter silently fails
**Area:** Error Handling
**Files:** `sharing/hooks/useExclusionFilter.ts`

Errors are logged but not exposed. If exclusion load fails in a shared space, wrong data may be visible.

**Impact:** Shared space data leakage on exclusion load failure.

**Fix:** Expose error state, warn user if exclusions unavailable.

---

### Minor Issues

#### m1. Pins lack optimistic updates
**Area:** Mutation & Invalidation
**Files:** `pins/hooks/usePins.ts:35-51`

Pin/unpin emit but don't provide instant visual feedback. User waits for emit → invalidation → refetch cycle.

**Fix:** Add optimistic cache update with rollback on error.

#### m2. Over-broad template invalidation
**Area:** Mutation & Invalidation
**Files:** `templates/hooks/useTemplate.ts:38`

Template detail update invalidates ALL template lists (`queryKeys.templates.all(spaceId)`) instead of scoped invalidation.

**Fix:** Only invalidate relevant list keys when name/type changes.

#### m3. Detail queries not seeded from list cache
**Area:** Cache Utilization
**Files:** All detail hooks (`useObject`, `useObjectType`, `useTemplate`)

Detail queries always fetch independently even when the item exists in a list cache.

**Fix:** Use `initialData` or `placeholderData` from list cache to eliminate redundant fetches.

#### m4. Direct DataClient calls in ArchiveList component
**Area:** Mutation & Invalidation
**Files:** `objects/components/ArchiveList.tsx:81`

Calls `dataClient.objectTypes.unarchive()` directly instead of using hook, duplicating invalidation logic.

**Fix:** Refactor to use `useObjectTypes()` hook's `unarchive()` method.

#### m5. No reverse relation invalidation
**Area:** Mutation & Invalidation
**Files:** `relations/hooks/useObjectRelations.ts:87-105`

Creating A→B only invalidates A's relations, not B's incoming relations (backlinks).

**Fix:** If backlinks are displayed, invalidate target object's relations too. Otherwise document as intentional.

#### m6. `z.any()` in schema definitions
**Area:** DataClient Interface
**Files:** `types.ts:43,127,128,287,452,453`

Fields like `content`, `properties`, `context`, `filters`, `sort` use `z.any()`. Intentional for flexible JSON but loses compile-time type safety.

**Fix:** Low priority. Consider narrower types for `filters`/`sort` as schemas stabilize.

#### m7. Editor waterfall — object → type sequential
**Area:** Request Waterfalls
**Files:** `objects/components/ObjectEditor.tsx:61-62`

`useObjectType(object?.type_id)` depends on `useObject(id)` result — type fetch waits for object fetch.

**Fix:** Low priority — type data is small and likely cached. Could prefetch type alongside object if `type_id` is known from list cache.

---

### Passing Areas

| Area | Assessment |
|------|-----------|
| **Query key hierarchy** | Proper prefix structure, space scoping on all multi-tenant queries, no collisions |
| **Query key factory usage** | 99% compliance (only 2 inline keys in relations) |
| **Cross-entity invalidation** | Type deletion cascades to objects + templates. Type import invalidates target space. Space creation with kit triggers objectTypes + templates |
| **emit() coverage** | 98% — all mutation hooks emit correctly except useSpaceShares |
| **keepPreviousData** | Used on 5 list queries (objects, objectTypes, pins, tags, savedViews) |
| **Prefetching** | SidebarLink prefetches object detail on hover |
| **Cache-first enrichment** | useObjectRelations checks TanStack cache before batch fetching |
| **Refetch config** | Conservative — `refetchOnWindowFocus: false`, no polling |
| **Global defaults** | `staleTime: 30s`, `gcTime: 5min` appropriate for this app |
| **Sort order parity** | Consistent between Supabase and Dexie for all list methods |
| **Return type consistency** | All methods use `{ data: T | null, error: DataError | null }` |
| **Sidebar loading** | 5 queries fire in parallel (objects, types, tags, pins, permission) |
| **Graph loading** | 3 queries fire in parallel (objects, types, relations) |

## Hook Inventory

| Hook | Query Key | staleTime | Enabled | keepPreviousData |
|------|-----------|-----------|---------|------------------|
| `useObjects()` | `queryKeys.objects.list(spaceId, opts)` | 30s | Conditional | Yes |
| `useObject(id)` | `queryKeys.objects.detail(id)` | 30s | `!!id` | No |
| `useObjectTypes()` | `queryKeys.objectTypes.list(spaceId, opts)` | 30s | true | Yes |
| `useObjectType(id)` | `queryKeys.objectTypes.detail(id)` | 30s | `!!id` | No |
| `useGlobalObjectTypes()` | `queryKeys.globalObjectTypes.list()` | 30s | true | No |
| `useTemplates(opts)` | `queryKeys.templates.list(spaceId, typeId)` | 30s | param | No |
| `useTemplate(id)` | `queryKeys.templates.detail(id)` | 30s | `!!id` | No |
| `useTags()` | `queryKeys.tags.list(spaceId)` | 30s | true | Yes |
| `useObjectTags(objectId)` | `queryKeys.tags.objectTags(objectId)` | 30s | true | No |
| `useObjectTagsBatch(ids)` | `queryKeys.tags.objectTagsBatch(sortedIds)` | 30s | `ids.length > 0` | No |
| `useTagCounts(tags)` | `queryKeys.tags.countsByTags(sortedTagIds)` | 30s | `ids.length > 0` | No |
| `usePins()` | `queryKeys.pins.list(spaceId)` | 30s | true | Yes |
| `useObjectRelations(id)` | `queryKeys.relations.list(objectId)` | 30s | `!!objectId` | No |
| `useAllRelations()` | `['relations', 'all', spaceId]` (inline) | 30s | true | No |
| `useGraphData()` | `['relations', 'all', spaceId]` (inline) | 30s | true | No |
| `useSpaceShares(spaceId)` | `queryKeys.shares.list(spaceId)` | 30s | `!!spaceId` | No |
| `useSavedViews(typeId)` | `queryKeys.savedViews.list(spaceId, typeId)` | 30s | `!!typeId` | Yes |

## Waterfall Diagrams

### Sidebar
```
t=0  objects.list()       ━━━━━━━┓
     objectTypes.list()   ━━━━━━━┤  All parallel
     tags.list()          ━━━━━━━┤
     pins.list()          ━━━━━━━┛
                                  ↓ (shared user only)
     exclusions.load()    ━━━━━━━┛  Sequential — acceptable
```

### Dashboard
```
t=0  pins.list()              ━━━━━━━━━┓
     objects.list()           ━━━━━━━━━┤  Parallel
     objects.list({limit:5})  ━━━━━━━━━┛  ← REDUNDANT (M4)
```

### Object Editor
```
t=0  objects.get(id)      ━━━━━━━━━┓
     templates.list()     ━━━━━━━━━┛  Parallel
                                    ↓ wait for type_id
     objectTypes.get(typeId)  ━━━━━┛  Sequential — minor (m7)
```

### Graph
```
t=0  objects.list()       ━━━━━━━━━┓
     objectTypes.list()   ━━━━━━━━━┤  All parallel — good
     relations.listAll()  ━━━━━━━━━┛
```

## Parity Gap Summary

| Client Method | Divergence | Severity |
|---------------|-----------|----------|
| `SharingClient.*` | No-op in Dexie | Major (M10) |
| `PinsClient.list/pin/isPinned` | Not user-scoped in Dexie | Info |
| `ObjectTypesClient.create` | `owner_id: null` in Dexie | Major (M5) |
| `TemplatesClient.create` | `owner_id: null` in Dexie | Major (M5) |
| `GlobalObjectTypesClient.list` | No owner filter in Dexie | Major (M5) |
| `ObjectsClient.search` | Different algorithm | Major (M6) |
| `RelationsClient.create` | Upsert vs explicit check | Major (M7) |
| `ObjectTypesClient.delete` | Dexie cascades explicitly, Supabase relies on FK | Info |
| `SavedViewsClient.create` | Different owner source | Info |

## Review Corrections

The initial audit was static-analysis-only. A follow-up review verified claims against actual code and identified severity misratings and methodology blind spots.

### Severity Adjustments

| Finding | Original | Revised | Reason |
|---------|----------|---------|--------|
| C1 (retry) | Critical | Critical | Confirmed, but fix was wrong — errors lose metadata before reaching TanStack (see updated C1) |
| C4 (sharing no-op) | Critical | Major (M10) | Share button renders in guest mode but dialog fails silently — poor UX, not a crash |
| C5 (pins scoping) | Critical | Info | Guest mode is always single-user; divergence is purely theoretical |
| M1 (silent errors) | Major | Critical | 83% of mutations silently fail; root cause is zero `useMutation` adoption |

### Verified Passing

These areas were checked at the code level and confirmed safe:

| Area | Verification |
|------|-------------|
| **Subscribe/emit cleanup** | `subscribe()` returns unsubscribe; all callers clean up in useEffect returns. No memory leaks. |
| **Space switch re-keying** | DataProvider recreates `dataClient` in useMemo with `[user, supabase, spaceId]` deps. All query keys include spaceId. No stale cross-space data. |
| **SSR safety** | QueryClient created inside `useState` (correct for Next.js). No `window`/`document` in data hooks. SpaceProvider guards localStorage with `typeof window`. |
| **Re-render churn** | All list hooks use module-level empty array constants (`const EMPTY: T[] = []`). Derived data wrapped in `useMemo`. No inline `data ?? []`. |
| **DataProvider context** | `useDataClient()`, `useSpaceId()`, etc. throw clear errors when used outside provider. |
| **Tag batch key stability** | `useObjectTagsBatch` and `useTagCounts` sort arrays before keying — prevents infinite refetches from reference changes. |
| **Realtime debounce** | `realtime.ts` batches Postgres changes with 100ms debounce before emitting. No double-invalidation from realtime + local emit. |

## Additional Findings

These areas were outside the initial audit scope but surfaced during review.

### Architecture

#### A1. No runtime Zod validation at the data boundary (Major)
**Files:** `supabase.ts` (~54 `as Type` casts), `types.ts` (schemas defined but unused)

`types.ts` defines Zod schemas for every entity, but they are never used to parse Supabase responses. `supabase.ts` casts all responses with `as ObjectType`, `as DataObject`, etc. If a migration drifts from the TypeScript types (e.g., a column renamed in Supabase but not in the client), the app receives silently mistyped data that causes runtime crashes deep in component trees.

**Fix:** Parse responses with `.parse()` or `.safeParse()` at the data layer boundary, at least in development mode. Zod v4 parse is fast enough for production if needed.

#### A2. Zero `useMutation` adoption (Major)
**Files:** All feature hooks

The project imports TanStack Query but uses only `useQuery`. All 95+ mutations are bare `useCallback` async functions. This is the root cause of M1 (silent errors), the inconsistent error patterns, and the lack of `isPending` loading states on mutation triggers.

`useMutation` provides for free: `isPending` (for button disabled states), `isError`/`error` (for inline error display), `onError`/`onSuccess`/`onSettled` callbacks (for toast/emit), automatic retry for transient failures, and request deduplication.

**Fix:** Migrate mutations to `useMutation` incrementally. Start with high-traffic hooks (useObjects, useObjectTypes) as a pattern, then roll out.

#### A3. No mutation ordering or queueing (Minor)
**Files:** All mutation hooks

Rapid-fire creates (quick-capture, paste) execute in parallel with no FIFO guarantee. If network is slow, creation order may differ from submission order. Each completes independently and fires `emit()`, causing multiple invalidation cycles.

**Fix:** Low priority. Only matters for operations where order is user-visible (e.g., list position). No action needed unless this surfaces as a bug.

### Runtime Performance

#### P1. No list virtualization (Major)
**Files:** `table-view/components/TypeTableView.tsx:57-97`, `TypeDataTable.tsx`, `TypeCardView.tsx`, `TypeListView.tsx`

No `react-window`, `react-virtuoso`, or `@tanstack/react-virtual` in the project. All list views render every object as a DOM node. At 500+ objects per type, browser paint time is 200-500ms and scroll performance degrades measurably. Lists also fetch all objects without pagination — no `limit`/`offset`/`cursor` patterns in use.

**Fix:** Virtualize TypeDataTable and TypeCardView with `@tanstack/react-virtual`. Consider server-side pagination if spaces grow beyond 1000 objects.

#### P2. Mention/link search fires on every keystroke (Minor)
**Files:** `editor/components/LinkedObjects.tsx:119-136`

Global search (`useGlobalSearch`) has a 300ms debounce. But the `@` mention trigger and the LinkedObjects link search fire `dataClient.objects.search(query)` on every keystroke via a bare `useEffect` with `query` in deps. Typing 12 characters = 12 parallel network requests.

**Fix:** Add 200-300ms debounce to the link search effect, matching global search.

#### P3. Limited `memo()` coverage (Minor)
**Files:** Only `graph/components/GraphNode.tsx:20`, `graph/components/GraphEdge.tsx:12`

Only 2 components are wrapped in `memo()`. Every `emit('objects')` invalidation re-renders every component that calls `useObjects()`, plus all their unmemoized children. Fine for current scale, but a cost that grows with component tree depth.

**Fix:** Low priority. Add `memo()` to expensive leaf components (table rows, card items) if profiling shows paint jank.

### Accessibility of Async States

#### X1. No focus management after navigation or destructive actions (Major)
**Files:** `objects/components/ObjectEditor.tsx:154-172`, `sidebar/components/Sidebar.tsx`

When an object is deleted, `router.push('/dashboard')` fires but focus is not moved — it lands on `<body>`. Same when creating an object: navigation to `/objects/{id}` happens without focusing the editor title. Screen reader users are stranded after every create/delete/archive operation.

**Fix:** Create a `useFocusOnNavigation` hook or use Next.js `onNavigate` to move focus to the main content heading after route changes. After destructive actions, focus the next logical element (list, dashboard heading).

#### X2. Graph and sharing loading states lack ARIA (Minor)
**Files:** `graph/components/GraphView.tsx:72-75`, `sharing/components/ShareSpaceDialog.tsx:112-117`

Graph loading has `role="status"` but no `aria-busy` or `aria-label`. Share dialog loading uses `animate-pulse` skeleton divs with zero ARIA attributes. Screen readers announce nothing during these loading states.

**Fix:** Add `aria-busy="true"` + `aria-label="Loading graph"` / `"Loading shares"` to containers.

#### X3. Inline error states missing `aria-live` (Minor)
**Files:** `sharing/components/ShareSpaceDialog.tsx:103`, `objects/components/ObjectEditor.tsx:271-279`

Some error displays use `role="alert"` but without `aria-live="assertive"`. When error state changes dynamically (e.g., share fails), the change may not be re-announced by screen readers. ObjectEditor's error state (`error || 'Entry not found'`) has no `role="alert"` at all.

**Fix:** Add `aria-live="assertive"` to all dynamically-appearing error messages.

### Testing

#### T1. Zero error-path test coverage (Major)
**Files:** `apps/web/tests/unit/`

13 test files with ~140 tests exist, all covering success paths. Zero tests for: API failure → error state propagation, cache invalidation after mutations, cross-hook interactions (e.g., delete type → objects list stale), or loading state transitions. `useSpaceShares` has no tests at all.

**Fix:** Add error-path tests for the highest-risk hooks: useObjects (create fails), useObjectTypes (delete cascades), useSpaceShares (all operations). Test that `emit()` triggers query refetch.

### React 19

#### R1. On React 19 but using zero concurrent features (Info)
**Files:** `app/providers.tsx`, all feature hooks

The app runs on React 19.2.3 but uses no concurrent features: no `startTransition`, `useTransition`, `useDeferredValue`, `use()`, or Suspense for data. The entire data layer pattern (useCallback mutations, manual loading booleans, no Suspense) is React 17-era. This isn't a bug — the current patterns are concurrent-safe — but it's design debt that means React 19's main value proposition is unused.

No action needed. Documented for future planning.

## Implementation

All actionable findings were addressed in 7 phases. Key changes:

### Phase 1: Foundation (C1, C3)
- **`DataLayerError` class** (`src/shared/lib/data/errors.ts`): Typed error with `code`, `retryable`, `isAuth` fields. Classifies Postgres/PostgREST permanent codes and auth patterns.
- **Smart retry** in `providers.tsx`: Permanent errors skip retry immediately.
- **`queryKeys.relations.all()`**: Added to factory, used by `useAllRelations` and `useGraphData`.

### Phase 2: Mutation Standardization (A2, M1, C2, m4)
- **`useMutationAction`/`useVoidMutationAction`** (`src/shared/hooks/useMutationAction.ts`): Wrapper that toasts on error, emits channels only on success, and supports `onSuccess` callback. Returns `T | null` or `boolean`.
- Migrated all 13 hook files (95+ mutations) to use the wrapper.
- **C2 fix**: Added `emitChannels: ['spaceShares']` to share mutations (was missing entirely).
- **m4 fix**: `ArchiveList` now uses `useObjectTypes().unarchive()` instead of direct `dataClient` call.

### Phase 3: Error Handling (M2, M3, M8, M9)
- **`useSessionGuard`** (`src/shared/hooks/useSessionGuard.ts`): Watches TanStack Query cache for auth errors, redirects to `/login?expired=true`.
- **`SectionErrorBoundary`** (`src/shared/components/SectionErrorBoundary.tsx`): Reusable error boundary with reset button. Wraps Sidebar and GraphView.
- **Dexie error classification** in `local.ts`: `handleDexieError()` classifies `QuotaExceededError` and `VersionError` into user-friendly messages.
- **Exclusion filter error exposure**: `useExclusionFilter` now exposes `error` in return value.

### Phase 4: Quick Fixes (M10, P2)
- **Share button guard**: Added `user &&` check to prevent Share button in guest mode.
- **Debounced link search**: 250ms debounce on `LinkSearch` component (was firing on every keystroke).

### Phase 5: Cache & Performance (M4, m1-m5)
- **Dashboard dedup** (`DashboardContent.tsx`): Single `useObjects()` call shared between pinned and recent sections.
- **Pin optimistic updates**: Instant UI update with rollback on API failure.
- **Template invalidation scope**: `useTemplate.update()` invalidates only the specific type's list, not all templates.
- **Detail query seeding**: `useObjectType(id)` and `useTemplate(id)` use `placeholderData` from list cache.
- **Reverse relation invalidation**: `createLink`/`removeLink` invalidate the target object's relations too.

### Phase 6: Accessibility (X1, X2, X3)
- **`useFocusOnNavigation`** (`src/shared/hooks/useFocusOnNavigation.ts`): Moves focus to main heading after route changes.
- **ARIA loading states**: Added `aria-busy`/`aria-label` to GraphView and ShareSpaceDialog loading states.
- **ARIA error states**: Added `role="alert"` + `aria-live="assertive"` to ObjectEditor error state.

### Phase 7: Testing (T1)
- **`tests/unit/data/errors.test.ts`** (18 tests): DataLayerError classification, retryable logic, auth detection.
- **`tests/unit/data/mutationAction.test.ts`** (12 tests): Verifies toast on error, emit suppression on failure, onSuccess callback behavior.

### Post-Implementation Review Fixes
A code review pass caught 4 bugs introduced during implementation:
1. **`useSessionGuard` was dead code**: All queryFn threw plain `Error`, but the guard checked `instanceof DataLayerError`. Fixed to use `isAuthError()` instead, plus added `hasRedirected` ref to prevent duplicate redirects.
2. **`usePins` optimistic update lacked try/catch**: If `pinRaw`/`unpinRaw` rejected (vs returning error), rollback wouldn't fire. Added try/catch with rollback in catch block.
3. **`useObjectRelations.removeLink` depended on `data`**: Caused excessive callback recreation on every query refetch. Fixed to read target ID from query cache instead.
4. **`useTemplates.ts` import ordering**: `const EMPTY_TEMPLATES` was declared before an `import` block. Moved imports above the const.
5. **Test typecheck error**: `mutationAction.test.ts` had untyped mock causing TS2322. Fixed with explicit generic type.

### Deferred (documented, no implementation)
M5 (owner ID divergence), M6 (search algorithm), M7 (relations upsert), A1 (no Zod validation), A3 (mutation ordering), P1 (list virtualization), P3 (memo coverage), m6 (z.any schemas), m7 (editor waterfall), R1 (React 19 features).

### Verification
- 594 tests passing (was 564, +30 new)
- TypeScript: 0 errors
- Lint: 0 new warnings (1 pre-existing in SlashInput.tsx)
