# Data Caching (TanStack Query)

**Status: Done**

## Overview

Migrated all data-fetching hooks from manual `useState`/`useEffect`/`subscribe` to TanStack Query for automatic caching, deduplication, and stale-while-revalidate behavior. Eliminates loading flickers, content jumps, and redundant network requests.

## Decisions

| Area | Decision |
|------|----------|
| Library | `@tanstack/react-query` v5 |
| Stale time | 30 seconds (background refetch after 30s) |
| GC time | 5 minutes |
| Refetch on focus | Disabled |
| Retry | 1 attempt |

## Implementation

### Infrastructure

- `src/shared/lib/data/queryKeys.ts` — centralized query key factory for type-safe invalidation
- `src/shared/lib/data/events.ts` — bridge: `emit()` also calls `queryClient.invalidateQueries()` for the corresponding key prefix
- `src/app/providers.tsx` — `QueryClientProvider` wraps the tree inside `ThemeProvider`

### Query Key Structure

```
objects / {spaceId} / list / {options}
objects / detail / {id}
objectTypes / {spaceId} / list
objectTypes / detail / {id}
tags / {spaceId} / list
tags / objectTags / {objectId}
tags / objectsByTag / {tagId}
pins / {spaceId}
templates / {spaceId} / list / {typeId}
relations / {objectId}
```

### Migrated Hooks

| Hook | File |
|------|------|
| `useObjects`, `useObject` | `src/features/objects/hooks/useObjects.ts` |
| `useObjectTypes`, `useObjectType` | `src/features/object-types/hooks/useObjectTypes.ts` |
| `useTags`, `useObjectTags` | `src/features/tags/hooks/useTags.ts` |
| `usePins` | `src/features/pins/hooks/usePins.ts` |
| `useTemplates` | `src/features/templates/hooks/useTemplates.ts` |
| `useObjectRelations` | `src/features/relations/hooks/useObjectRelations.ts` |
| `useGraphData` | `src/features/graph/hooks/useGraphData.ts` |
| `TagPageView` | `src/features/tags/components/TagPageView.tsx` |

### Event Bridge

Mutations still call `emit(channel)` which:
1. Notifies remaining `subscribe()` listeners (SpaceProvider, useSpaceShares)
2. Calls `queryClient.invalidateQueries()` for the corresponding query key prefix

### Auth Deduplication

- Removed duplicate `supabase.auth.getUser()` call from `DataProvider`
- `DataProvider` now accepts `user` and `isAuthLoading` as props from `Providers`
- Single auth check in `providers.tsx`, passed down through the tree

### Provider Exposed `spaceId`

- `DataProvider` context now includes `spaceId`
- New `useSpaceId()` hook for query key construction in data hooks

## UI Fixes (sidebar)

- Removed `sidebarLoading` all-or-nothing gate — sidebar sections render progressively
- `<hr>` separators only render when the preceding section has visible content
- TagsSection fetches tag counts in parallel (`Promise.all`) instead of sequential loop

## Verification

- [x] Cold start: sidebar sections render progressively
- [x] Warm navigation: sidebar renders instantly from cache
- [x] Mutations trigger cache invalidation and UI updates
- [x] Space switching keeps old data visible briefly (stale-while-revalidate)
- [x] Tag counts fetch in parallel
- [x] No layout jumps from conditional separators
- [x] `npm run build` passes with no type errors
