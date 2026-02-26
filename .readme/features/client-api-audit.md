# Client API Audit

**Status:** Not started

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

## Methodology

1. Interface review: read DataClient type and compare both implementations
2. Hook inventory: catalog all `useQuery`/`useMutation` calls, check key usage
3. Waterfall detection: trace component mount → data fetch chains
4. Cache analysis: test navigation patterns, check network tab for redundant fetches
5. Parity testing: run identical operations in Supabase and Dexie modes

## Deliverables

- Hook inventory spreadsheet (hook → key → staleTime → invalidation)
- Waterfall diagram for critical paths (sidebar, editor, dashboard)
- Parity gap list between Supabase and Dexie
- Fix PRs for key issues (waterfalls, missing invalidation, error handling)
- Updated spec with final results
