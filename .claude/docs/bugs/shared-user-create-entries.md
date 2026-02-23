# Shared user can't create new entries

**Status**: Open
**Feature**: Sharing / Spaces
**Severity**: High — blocks core editing workflow for shared users

## Description

Shared users with `edit` permission are unable to create new entries (objects) in shared spaces. The "Create" option in the sidebar type dropdown is hidden, and even if creation were triggered, any Supabase errors would be swallowed silently with no user feedback.

## Root cause

**Fragile two-query reconciliation in `SpaceProvider.loadSpaces()`.**

`loadSpaces()` makes two sequential calls:
1. `spacesClient.list()` — returns ALL visible spaces (owned + shared) via updated RLS from migration 011
2. `sharingClient.getSharedSpaces()` — returns shared spaces with `{ shareId, permission }` info

The results are cross-referenced: shared spaces from `getSharedSpaces()` populate `shareInfoMap`, and then `list()` results are filtered to remove duplicates. The `sharedPermission` context value is derived from `shareInfoMap.get(currentSpaceId)?.permission ?? null`.

**When `getSharedSpaces()` fails** (network error, transient auth issue, or Supabase RLS mismatch):
- `loadedShared` is empty → `shareInfoMap` is empty
- `sharedIds` is empty → shared spaces from `list()` are NOT filtered out
- Shared spaces appear in the space list as if they're owned
- But `space.owner_id !== userId` → `resolveSpacePermission()` returns `'view'` (falls through both owner and sharedPermission checks)
- `canEdit('view')` returns `false` → create button is hidden

The permission resolution chain:
```
SpaceProvider.sharedPermission: null (missing from shareInfoMap)
  → resolveSpacePermission(space, userId, null): 'view' (not owner, no sharedPermission)
    → canEdit('view'): false
      → hideCreateButton={true}
```

**Secondary issue**: silent error swallowing. In `useObjects.create()`, errors return `null` with no logging. In `handleCreateBlank()`, a null result just skips navigation — no feedback to the user.

## Fix plan

### 1. Classify spaces by `owner_id` instead of cross-referencing queries

**File**: `src/shared/lib/data/SpaceProvider.tsx` — `loadSpaces()` callback

Instead of relying on `getSharedSpaces()` to identify which spaces are shared, split `list()` results using `owner_id`:

- `owned = list().filter(s => s.owner_id === user.id)`
- `nonOwned = list().filter(s => s.owner_id !== user.id)`

Use `getSharedSpaces()` solely to enrich `nonOwned` spaces with permission info in `shareInfoMap`. If `getSharedSpaces()` fails, fall back to `'view'` permission for non-owned spaces (safe default, better than the current behavior where they appear as "owned" with broken permission resolution).

This ensures `shareInfoMap` always has entries for ALL non-owned visible spaces.

### 2. Add error feedback on creation failure

**Files**: `src/features/sidebar/components/Sidebar.tsx`, `src/features/objects/hooks/useObjects.ts`

- `handleCreateBlank`: add `else` branch with `window.alert(...)` when `create()` returns null
- `useObjects.create()`: add `console.error(...)` when `dataClient.objects.create` returns an error

### 3. Hide type management actions for non-owner shared users

**Files**: `src/features/sidebar/components/Sidebar.tsx`, `src/features/sidebar/components/TypeSection.tsx`

- Hide "New Type" button for non-owners (both inline and empty-state) using existing `isSpaceOwner` from `useSpacePermission()`
- Add `hideManageActions` prop to `TypeSection` to hide "Type settings" and "Delete type" from dropdown and context menu
- Render plain `TypeSection` (no drag-reorder wrapper) for non-owners

## Key files

- `src/shared/lib/data/SpaceProvider.tsx` — space loading, `shareInfoMap`, `sharedPermission`
- `src/shared/lib/data/supabase.ts` — `getSharedSpaces()` (line ~922), `createObjectsClient.create()` (line ~199)
- `src/features/sharing/lib/permissions.ts` — `resolveSpacePermission()`, `canEdit()`
- `src/features/sharing/hooks/useSpacePermission.ts` — `useSpacePermission()` hook
- `src/features/sidebar/components/Sidebar.tsx` — `handleCreateBlank`, `hideCreateButton` prop, "New Type" buttons
- `src/features/sidebar/components/TypeSection.tsx` — create/manage UI in dropdown and context menu
- `src/features/objects/hooks/useObjects.ts` — `create()` callback (silent error)
- `supabase/migrations/011_sharing.sql` — RLS policies, `user_can_edit_space()` function

## Verification

1. `npx tsc --noEmit` — no type errors
2. `npx vitest run` — no broken tests
3. `npm run lint` — no new lint errors
4. Manual: share a space with edit permission, log in as shared user, verify create button visible and functional; verify "New Type" hidden for non-owners
