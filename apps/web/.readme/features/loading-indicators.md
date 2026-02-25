# Loading Indicators

**Status: Done**

## Overview

Reusable loading primitives (Spinner, Skeleton, Button `loading` prop) and a navigation progress bar that provides visual feedback during route transitions and mutations.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Progress bar approach | CSS keyframe + Zustand store | No route-level `loading.tsx` files; purely cosmetic bar that never blocks content |
| Skeleton strategy | Show on `isLoading` only, never `isFetching` | Preserves `keepPreviousData` anti-flicker — background refetches show stale data |
| Button loading | `loading` prop replaces first icon with spinner | Consistent pattern; label stays visible so users know what's happening |
| Navigation trigger | Opt-in `useNavigate` hook + `SidebarLink` onClick | Only fires for actual navigations, not same-page clicks |
| Sidebar/editor skeletons | Left as-is | Too layout-specific to abstract into generic Skeleton |

## Implementation

### Primitives

| File | Purpose |
|------|---------|
| `shared/components/ui/Spinner.tsx` | Lucide `LoaderIcon` with `animate-spin`, 3 sizes (sm/md/lg) |
| `shared/components/ui/Skeleton.tsx` | `animate-pulse rounded-md bg-muted` div with className prop |
| `shared/components/ui/Button.tsx` | Added `loading` prop: disables, sets `aria-busy`, swaps first SVG for spinner (icon buttons replace children entirely) |

### Navigation Progress Bar

| File | Purpose |
|------|---------|
| `shared/stores/navigation.ts` | Zustand store: `isNavigating` boolean |
| `shared/components/NavigationProgress.tsx` | Fixed `h-0.5` bar at viewport top, CSS keyframe animation, clears on `usePathname()` change, 10s safety timeout |
| `shared/hooks/useNavigate.ts` | Wraps `router.push` to set `isNavigating` first |
| `app/globals.css` | `@keyframes progress-bar` + `.animate-progress-bar` |
| `app/(main)/layout.tsx` | Mounts `<NavigationProgress />` |

### Navigation Triggers

| File | What |
|------|------|
| `sidebar/components/SidebarLink.tsx` | Sets `isNavigating` on click when navigating to a different path |
| `sidebar/components/Sidebar.tsx` | 4 create-then-navigate flows use `useNavigate().push` |
| `sidebar/components/TypeSection.tsx` | All `router.push` calls replaced with `useNavigate` |
| `sidebar/components/SpaceSwitcher.tsx` | Space switch + leave navigation use `useNavigate` |
| `search/components/GlobalSearchDialog.tsx` | Search result navigation + replaced bespoke spinner with `<Spinner>` |

### Mutation Button Loading

| File | What |
|------|------|
| `shared/components/ui/ConfirmDialog.tsx` | `loading={isPending}` on confirm, removed "Please wait..." text |
| `objects/components/ArchiveList.tsx` | `loading={processingId === id}` on all unarchive buttons |
| `objects/components/TrashList.tsx` | `loading={processingId === id}` on restore button |
| `templates/components/TemplateList.tsx` | `loading={isDeleting}` on menu trigger |
| `auth/components/OAuthButtons.tsx` | `loading={isLoading === provider}`, removed bespoke "Connecting..." text |
| `sharing/components/ShareSpaceDialog.tsx` | `loading={isSubmitting}` on invite button |

### Skeleton Refactors

Replaced inline `animate-pulse` divs with `<Skeleton>` in: `ObjectList`, `TemplateList`, `ArchiveList`, `TrashList`, `TypeTableView`.

## Verification

- [x] TypeScript passes (`tsc --noEmit`)
- [x] All 501 tests pass
- [x] No new lint errors
- [ ] Click sidebar link → progress bar animates, clears on load
- [ ] Click search result → progress bar
- [ ] Switch space → progress bar
- [ ] Create entry from sidebar → progress bar
- [ ] Confirm destructive dialog → spinner in button
- [ ] Archive/trash buttons → spinner during operation
- [ ] OAuth buttons → spinner replaces icon
- [ ] List views → Skeleton on initial load, no flash on refetch
- [ ] Space switch does NOT flash sidebar to empty (keepPreviousData preserved)
- [ ] Back-navigation within 30s shows cached data immediately (staleTime preserved)
