# API Audit (Frontend)

**Status:** Done

## Overview

Audit of frontend API calls for correctness, error handling, consistency, and performance. Focused on eliminating redundant network calls, reducing payload sizes, improving search performance, and ensuring consistent error surfacing.

## Findings & Fixes

### Redundant Auth Calls

| Issue | Fix |
|-------|-----|
| Every Supabase data client method called `supabase.auth.getUser()` individually (~11 calls per page load) | Pass `userId` into `createSupabaseDataClient()` once; shared `resolveUserId()` helper uses cached value |
| `DataProvider` made its own auth check on top of `providers.tsx` | Removed duplicate check; `DataProvider` accepts `user` and `isAuthLoading` as props |

### Payload Optimization

| Issue | Fix |
|-------|-----|
| List queries fetched full `content` column (rich text JSON) for every entry | Added `DataObjectSummary` type (`Omit<DataObject, 'content'>`); list endpoints select only summary columns |
| `getObjectsByTag` did two queries (fetch IDs, then fetch objects) | Replaced with single-join query using `object_tags!inner(tag_id)` |
| Tag sidebar counts fetched full objects just to count them | Added `countObjectsByTag()` using Supabase `count: 'exact', head: true` |

### Search Performance

| Issue | Fix |
|-------|-----|
| Search fetched 200 recent objects and filtered client-side | Two-pass strategy: server-side `ilike` title search first (GIN trigram index), content fallback only if title results < 50 |

### Relation Enrichment

| Issue | Fix |
|-------|-----|
| `useObjectRelations` made N sequential `objects.get()` calls to resolve linked objects | Cache-first strategy: check TanStack cache for each target ID, then `batchGetSummary()` for uncached IDs in one query |
| No batch object fetch endpoint | Added `batchGetSummary(ids)` to `ObjectsClient` interface (Supabase `in('id', ids)` + Dexie `bulkGet`) |
| Relations fetched all relations then filtered client-side | Added server-side `source_id` filter to `relations.listAll()` |

### Lint & Type Safety

| Issue | Fix |
|-------|-----|
| 46 lint errors/warnings across 34 files | Fixed all — unused imports, missing deps, type issues |
| 18 failing tests across 4 files | Updated stale schemas/fixtures from migrations |

### Consumer-Side Changes

All components consuming `objects.list()` updated to use `DataObjectSummary` instead of `DataObject`:
- Sidebar (`TypeSection`, `RecentSection`, `Sidebar`)
- Table views (`TypeDataTable`, `TypeCardView`, `TypeListView`, `BoardCard`, `BoardColumn`, `TagDataTable`, `TypeBoardView`)
- Pins (`PinnedSection`)
- Graph (`buildGraphData`)
- Tags (`useTags`)
- Filtering/sorting/grouping utilities (`filterObjects`, `sortObjects`, `groupObjects`)
- Export (`useAccountExport`)
- Exclusion filter (`useExclusionFilter`)

### Dexie Parity

All Supabase optimizations mirrored in the Dexie local client:
- `stripContent()` helper for list queries
- `batchGetSummary()` via `bulkGet`
- `countObjectsByTag()` via collection count
- `getObjectsByTag()` returns `DataObjectSummary`

## Key Files

| File | Changes |
|------|---------|
| `src/shared/lib/data/types.ts` | `DataObjectSummary` type, `batchGetSummary` on `ObjectsClient`, `countObjectsByTag` on `TagsClient` |
| `src/shared/lib/data/supabase.ts` | `resolveUserId()` helper, summary column select, two-pass search, single-join tag query, count-only tag query |
| `src/shared/lib/data/local.ts` | `stripContent()`, `batchGetSummary`, `countObjectsByTag`, summary returns |
| `src/features/relations/hooks/useObjectRelations.ts` | Cache-first batch enrichment |

## Verification

- [x] List views load without content column in network payloads
- [x] Search returns results from title and content
- [x] Tag counts display without fetching full objects
- [x] Relation enrichment uses cache before network
- [x] No redundant `getUser()` calls in network tab
- [x] All lint errors resolved
- [x] All tests pass
- [x] Types pass (`tsc --noEmit`)
