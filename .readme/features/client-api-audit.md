# Client API Audit

**Status:** Active

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

### 1. DataClient Interface Design

**Result: PASS with notes**

- All 10 sub-clients (objects, objectTypes, globalObjectTypes, templates, relations, spaces, sharing, tags, pins, savedViews) implemented in both Supabase and Dexie
- All method signatures match the interface contract
- Error handling uses standardized `DataResult<T>` / `DataListResult<T>` everywhere — errors returned, never thrown
- Supabase checks `.error` after every query (100% coverage)
- Dexie wraps every method in try-catch (100% coverage)

**Issues:**
- **C1: `as` casts in supabase.ts** — 54 occurrences of `data as Type`. Unavoidable due to Supabase client returning generic types. Not a correctness risk but limits type inference.
- **C2: `any` in Zod schemas** — 15 instances in types.ts for `properties`, `content`, `filters`, `sort`, `context`. Intentional: these are user-defined JSON. Could be narrowed to `z.unknown()` for marginal safety.
- **C3: Sharing is a no-op in Local** — All 12 sharing methods return `{ error: 'Sharing is not available in guest mode' }`. Intentional design for guest mode.

### 2. TanStack Query Configuration

**Result: PASS**

Global defaults in `providers.tsx`:
- `staleTime: 30_000` (30s) — appropriate for most queries
- `gcTime: 5 * 60_000` (5min) — standard retention
- `refetchOnWindowFocus: false` — prevents surprise refetches; invalidation via `emit()` handles freshness
- `retry: 1` — single retry, won't loop on permanent errors

No per-query staleTime/gcTime overrides found. All hooks use global defaults, which is acceptable given the uniform data access patterns.

### 3. Query Key Consistency

**Result: FAIL — 2 inline keys + 1 event/key mismatch**

19 total `useQuery` call sites inventoried. 17/19 (89%) use the `queryKeys` factory.

**Issues:**
- **F1: Inline key in `useAllRelations.ts:15`** — `['relations', 'all', spaceId]` instead of factory. Factory lacks a `relations.all()` key.
- **F2: Inline key in `useGraphData.ts:20`** — Same `['relations', 'all', spaceId]` inline key. Both F1 and F2 use the same hardcoded key, which is consistent with each other but bypasses the factory.
- **F3: Event channel/query key mismatch for shares** — `emit('spaceShares')` maps to prefix `['spaceShares']` in `events.ts`, but queries use `queryKeys.shares.list()` → `['shares', spaceId]`. Result: **emit('spaceShares') does not invalidate share queries**. Workaround: `useSpaceShares` uses manual `queryClient.invalidateQueries()` — but this breaks cross-tab sync via BroadcastChannel.

**Good patterns:**
- 95% of hooks include spaceId in query keys (proper multi-tenant isolation)
- Empty array constants (`EMPTY_TAGS`, `EMPTY_OBJECTS`, etc.) prevent reference churn — all hooks follow this
- `keepPreviousData` used in list hooks for smooth UI transitions

### 4. Mutation & Invalidation Patterns

**Result: PASS with notes**

All hooks use `emit(channel)` after successful mutations, which invalidates via prefix match and broadcasts to other tabs.

**Good patterns:**
- Cross-entity invalidation on type deletion: `emit('objectTypes')` + `emit('objects')` + `emit('templates')`
- Optimistic cache updates in `useObject.update()` and `useTemplate.update()` via `queryClient.setQueryData()`
- Prefetching on hover in `SidebarLink` via `queryClient.prefetchQuery()`

**Issues:**
- **F3 (above):** `useSpaceShares` mutations don't emit — uses manual invalidation, breaking cross-tab sync.
- **F4: No global mutation defaults** — retry/timeout behavior varies per mutation. Not a bug, but a consistency gap.

### 5. Error Handling Uniformity

**Result: FAIL — silent mutation failures + missing error boundaries**

**Query error handling: GOOD (100%)**
All 12 query hooks throw from `queryFn` on error and expose `error` state to components.

**Mutation error handling: POOR (78%)**

| Hook | Mutations | Checked? |
|------|-----------|----------|
| useObjects | 6 | All ✓ |
| useObjectTypes | 5 | All ✓ |
| useGlobalObjectTypes | 4 | All ✓ |
| useTemplates | 4 | All ✓ |
| useTags | 3 | All ✓ |
| useObjectRelations | 2 | All ✓ |
| useSavedViews | 3 | All ✓ (throws) |
| **usePins** | **2** | **NONE** |
| **useSpaceShares** | **8** | **7/8** |

**Issues:**
- **F5: `usePins.ts:36,41`** — `pin()` and `unpin()` do not check errors. If the operation fails, `emit('pins')` still fires, leaving UI in an inconsistent state.
- **F6: `useSpaceShares.ts:76`** — `removeExclusion()` does not check errors. Failure is invisible to user.
- **F7: Only 1 error boundary** — `EditorErrorBoundary` wraps the Plate editor. No error boundaries around data-loading pages, sidebar, or other sections.
- **F8: No auth error handling** — No detection of expired sessions, 401 responses, or redirect-to-login flow.
- **F9: Inconsistent mutation return patterns** — Some return `null`, some return `{ data, error }`, some throw. Components must handle differently per hook.

### 6. Request Waterfall Detection

**Result: PASS — most paths parallel, 1 avoidable waterfall**

**Sidebar:** All queries (objects, types, pins, tags) fire in parallel ✓

**Object editor:** `useObject(id)` → `useObjectType(object?.type_id)` is serial but correct — can't know type_id until object loads. Templates and permissions load in parallel ✓

**Graph view:** Objects, types, and relations all fire in parallel ✓

**Type page:** Objects query initially fires with dummy typeId (`'__none__'`), then re-fires when types load. Suboptimal but not blocking.

**Issues:**
- **F10: Exclusion filter waterfall in `useExclusionFilter.ts:27-32`** — For shared users, fetches shares list serially, then finds user's share, then fetches per-user exclusions. The per-user arm could be parallelized with a single-RPC endpoint accepting `(spaceId, userId)`.
- **F11: Template variable fetch in `useTemplates.ts:115`** — `getTemplateVariables()` makes a network fetch for a template that's already in the cached list. Could check cache first.

### 7. Cache Utilization

**Result: PASS**

- `keepPreviousData` used in list hooks (useObjects, useObjectTypes, usePins, useTags, useSavedViews)
- Prefetching on hover in SidebarLink ✓
- Deduplication via TanStack Query (same query key = single network request) ✓
- Stale-while-revalidate via `staleTime: 30s` + `emit()` invalidation ✓
- No `refetchOnMount: 'always'` found — cache properly reused

**Missing opportunities:**
- Detail queries not populated from list cache (no `initialData` from list → detail)
- No route-level prefetching (e.g., prefetch type page data on sidebar hover)

### 8. Supabase/Dexie Parity

**Result: PASS with 1 behavioral difference**

- All method signatures, return types, and sort orders match
- Duplicate detection works in both (Supabase via DB constraint, Dexie via manual check)
- Cascade deletes handled in both (Supabase via FK, Dexie via explicit code)

**Issues:**
- **F12: Case-sensitive slug comparison mismatch** — Supabase unique constraint is case-sensitive (PostgreSQL `COALESCE(space_id, ...), slug`). Dexie checks case-insensitively via `slug.toLowerCase()`. Result: `page` vs `Page` would be allowed in Supabase but rejected in Dexie.
- **F13: Search result parity** — Supabase uses two-pass search (title via trigram index, then content on subset). Dexie does single-pass client-side search. Content-only matches may be missed in Supabase if title results fill the quota.

---

## Hook Inventory

| # | Hook | File | Query Key | Factory? | Space? | Mutations | emit? |
|---|------|------|-----------|----------|--------|-----------|-------|
| 1 | useObjects | objects/hooks/useObjects.ts:29 | objects.list | ✓ | ✓ | create, update, remove, restore, archive, unarchive | ✓ |
| 2 | useObject | objects/hooks/useObjects.ts:120 | objects.detail | ✓ | — | update, remove, archive | ✓ |
| 3 | useObjectTypes | object-types/hooks/useObjectTypes.ts:32 | objectTypes.list | ✓ | ✓ | create, update, remove, archive, unarchive | ✓ |
| 4 | useObjectType | object-types/hooks/useObjectTypes.ts:107 | objectTypes.detail | ✓ | — | refetch | — |
| 5 | useGlobalObjectTypes | global-types/hooks/useGlobalObjectTypes.ts:16 | globalObjectTypes.list | ✓ | — | create, update, remove, importToSpace | ✓ |
| 6 | useTemplates | templates/hooks/useTemplates.ts:49 | templates.list | ✓ | ✓ | saveAs, createFrom, delete, rename | ✓ |
| 7 | useTemplate | templates/hooks/useTemplate.ts:16 | templates.detail | ✓ | — | update (optimistic) | ✓ |
| 8 | useTags | tags/hooks/useTags.ts:28 | tags.list | ✓ | ✓ | create, update, remove | ✓ |
| 9 | useObjectTags | tags/hooks/useTags.ts:85 | tags.objectTags | ✓ | ✓ | addTag, removeTag | ✓ |
| 10 | useObjectTagsBatch | tags/hooks/useTags.ts:116 | tags.objectTagsBatch | ✓ | ✓ | — | — |
| 11 | useTagCounts | tags/hooks/useTags.ts:144 | tags.countsByTags | ✓ | ✓ | — | — |
| 12 | TagPageView | tags/components/TagPageView.tsx:35 | tags.objectsByTag | ✓ | ✓ | — | — |
| 13 | useObjectRelations | relations/hooks/useObjectRelations.ts:25 | relations.list | ✓ | ✓ | createLink, removeLink | ✓ |
| 14 | useAllRelations | relations/hooks/useAllRelations.ts:10 | **INLINE** | — | ✓ | — | — |
| 15 | usePins | pins/hooks/usePins.ts:19 | pins.list | ✓ | ✓ | pin, unpin, toggle | ✓ |
| 16 | useSpaceShares | sharing/hooks/useSpaceShares.ts:8 | shares.list | ✓ | ✓ | create, update, delete, exclusions | manual |
| 17 | useSavedViews | table-view/hooks/useSavedViews.ts:12 | savedViews.list | ✓ | ✓ | create, update, delete | ✓ |
| 18 | useGraphData | graph/hooks/useGraphData.ts:19 | **INLINE** | — | ✓ | — | — |
| 19 | SidebarLink | sidebar/components/SidebarLink.tsx:53 | objects.detail | ✓ (prefetch) | — | — | — |

---

## Issues Summary

### Critical (fix now)

| ID | Area | Issue | Location |
|----|------|-------|----------|
| F3 | Keys/Events | `emit('spaceShares')` doesn't invalidate share queries — prefix mismatch (`['spaceShares']` vs `['shares']`). Breaks cross-tab sync for shares. | events.ts:21, queryKeys.ts:40 |
| F5 | Errors | `usePins.pin()` and `unpin()` don't check errors — UI shows success even on failure | usePins.ts:36,41 |
| F6 | Errors | `useSpaceShares.removeExclusion()` doesn't check errors | useSpaceShares.ts:76 |

### High (fix soon)

| ID | Area | Issue | Location |
|----|------|-------|----------|
| F1 | Keys | Inline query key `['relations', 'all', spaceId]` — factory lacks `relations.all()` | useAllRelations.ts:15 |
| F2 | Keys | Same inline key duplicated | useGraphData.ts:20 |
| F7 | Errors | Only 1 error boundary in entire app (EditorErrorBoundary) | — |
| F8 | Errors | No auth error handling (expired sessions, 401 redirect) | — |
| F12 | Parity | Slug case sensitivity mismatch — Supabase case-sensitive, Dexie case-insensitive | local.ts:429, supabase.ts:125 |

### Medium (improve when touching)

| ID | Area | Issue | Location |
|----|------|-------|----------|
| F9 | Errors | Inconsistent mutation return patterns (null vs {data,error} vs throw) | Various |
| F10 | Waterfalls | Exclusion filter serial fetch (listShares → listExclusions) | useExclusionFilter.ts:27-32 |
| F11 | Cache | getTemplateVariables fetches instead of checking cache | useTemplates.ts:115 |
| F13 | Parity | Search result differences between Supabase two-pass and Dexie single-pass | supabase.ts:584, local.ts:1060 |
| C1 | Types | 54 `as` casts in supabase.ts (unavoidable with current Supabase types) | supabase.ts |
| C2 | Types | 15 `z.any()` in schemas (intentional for JSON fields) | types.ts |
| F4 | Config | No global mutation defaults (retry, timeout) | providers.tsx |

### Low / Informational

- Method definition order inconsistency in RelationsClient (list vs listAll)
- Missing route-level prefetching
- No `initialData` from list → detail cache
