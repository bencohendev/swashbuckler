# 07 -- Spaces, Sharing, and Permissions

Every piece of data in Swashbuckler belongs to a space. Spaces are the top-level container for objects, types, templates, tags, pins, and saved views. Users can own multiple spaces, share them with others at different permission levels, and fine-tune access through an exclusion system. This document covers the full space and sharing model from data schema through UI behavior.

---

## Table of Contents

- [Spaces Overview](#spaces-overview)
- [The Space Model](#the-space-model)
- [SpaceProvider Deep Dive](#spaceprovider-deep-dive)
- [Sharing System](#sharing-system)
- [Exclusion System](#exclusion-system)
- [Permission Resolution](#permission-resolution)
- [How Spaces Interact with Data](#how-spaces-interact-with-data)
- [Collaboration Activation](#collaboration-activation)
- [Space Lifecycle](#space-lifecycle)
- [Key Files Reference](#key-files-reference)
- [Gotchas](#gotchas)
- [Exercises](#exercises)

---

## Spaces Overview

The space model has a few core properties:

1. **Every entity belongs to a space.** Objects, object types, templates, tags, pins, and saved views all have a `space_id` foreign key. Objects, templates, tags, pins, and saved views have it as NOT NULL. Object types have it as nullable in the schema but every type in practice has a `space_id`.

2. **Users can own multiple spaces.** A single user account can create and manage many spaces. Each space has an `owner_id` pointing to the user who created it.

3. **Spaces can be shared.** An owner can invite other users by email, granting them `view` or `edit` permission. Shared users see the space in their space switcher alongside their own spaces.

4. **Space selection is context-based, not URL-based.** The current space is tracked in React context and persisted in `localStorage` under the key `swashbuckler:currentSpaceId`. Switching spaces does not change the URL -- it changes which data the entire application queries and renders.

---

## The Space Model

File: `apps/web/src/shared/lib/data/types.ts`

The `Space` type is defined by the `spaceSchema` Zod schema:

```typescript
export const spaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  icon: z.string().nullable(),
  owner_id: z.string().uuid(),
  is_archived: z.boolean(),
  archived_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Space = z.infer<typeof spaceSchema>
```

### Default space creation

When a new user signs up, the Supabase `handle_new_user()` database trigger fires and creates:

- A default space named "My Space"
- A default "Page" object type within that space

This ensures every authenticated user always has at least one space with one usable type.

### Guest mode

Guest (unauthenticated) users operate in local storage mode with a hardcoded default space:

```typescript
const LOCAL_DEFAULT_SPACE_ID = '00000000-0000-0000-0000-000000000099'
const LOCAL_OWNER_ID = '00000000-0000-0000-0000-00000000006c'
```

The `ensureLocalDefaultSpace()` function in `apps/web/src/shared/lib/data/local.ts` creates this space in IndexedDB if it does not already exist. Guest mode supports a single space only -- sharing and multi-space features are not available.

### Entity table space references

| Table | `space_id` constraint |
|---|---|
| `objects` | NOT NULL |
| `object_types` | Nullable in schema, always set in practice |
| `templates` | NOT NULL |
| `tags` | NOT NULL |
| `pins` | Scoped by user + space |
| `saved_views` | NOT NULL |

---

## SpaceProvider Deep Dive

File: `apps/web/src/shared/lib/data/SpaceProvider.tsx`

`SpaceProvider` is the React context provider that manages space state for the entire application. It sits above `DataProvider` in the component tree, so space selection happens before any data queries are created.

### Provider tree

The nesting in `apps/web/src/app/providers.tsx` is:

```
ThemeProvider
  QueryClientProvider
    SpaceProvider          <-- manages space list + current space
      DataProviderWithSpace  <-- reads space from context, passes spaceId to DataProvider
        DataProvider         <-- creates space-scoped data client
          {children}
```

The `DataProviderWithSpace` inner component bridges the two providers. It reads `space` from `useCurrentSpace()` and passes `space?.id` as the `spaceId` prop to `DataProvider`.

### State management

`SpaceProvider` manages several pieces of state:

```typescript
const [ownedSpaces, setOwnedSpaces] = useState<Space[]>([])
const [sharedSpaces, setSharedSpaces] = useState<Space[]>([])
const [shareInfoMap, setShareInfoMap] = useState<Map<string, { shareId: string; permission: SpaceSharePermission }>>(new Map())
const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(true)
```

The `shareInfoMap` is central to the permission system. It maps space IDs to their share record ID and permission level, but **only for spaces shared with the current user** -- owned spaces are never in this map.

### loadSpaces flow

The `loadSpaces` callback runs on mount (after auth resolves) and whenever `spaces` or `spaceShares` events fire. The flow:

1. Call `spacesClient.list()` to fetch all spaces accessible to the user (owned + shared).
2. If no spaces exist, create a default "My Space" (Supabase) or ensure the local default space (guest).
3. Classify spaces by `owner_id`:
   - `owned` = spaces where `owner_id === user.id`
   - `shared` = everything else
4. For authenticated users, call `sharingClient.getSharedSpaces()` to get share metadata (share ID + permission) for each shared space.
5. Build `shareInfoMap` from the share metadata. Any shared space missing from the result defaults to `'view'` permission.
6. Restore the current space from `localStorage`, falling back to the first active (non-archived) space.

A `loadSeqRef` counter prevents stale responses from overwriting fresher data when multiple loads overlap.

### switchSpace

```typescript
const switchSpace = useCallback((id: string) => {
  setCurrentSpaceId(id)
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id)
  }
}, [])
```

Switching spaces updates the React state and persists the selection to `localStorage`. Since `DataProvider` depends on `space?.id` from context, changing the space triggers a new `DataClient` creation, which invalidates all TanStack Query caches.

### Exported hooks

- **`useCurrentSpace()`** -- returns `{ space, spaces, switchSpace, leaveSpace, isLoading, sharedPermission }`. The `spaces` list includes only active (non-archived) spaces.
- **`useSpaces()`** -- returns `{ spaces, allSpaces, create, update, remove, archiveSpace, unarchiveSpace }`. The `allSpaces` list includes archived spaces.

### Space creation options

The `create` function accepts:

```typescript
interface CreateSpaceInput {
  name: string
  icon?: string
  copyTypesFromSpaceId?: string   // Clone types from an existing space
  includeTemplates?: boolean      // Also clone templates (requires copyTypesFromSpaceId)
  starterKitId?: string           // Import a starter kit into the new space
}
```

When `copyTypesFromSpaceId` is provided, the function creates a temporary data client scoped to the source space, reads all types and optionally templates, and recreates them in the new space with fresh IDs. The old-to-new type ID mapping is tracked so templates reference the correct new type IDs.

---

## Sharing System

### Permission levels

There are three permission levels, defined as TypeScript types:

```typescript
export type SpaceSharePermission = 'view' | 'edit'  // stored in share records
export type SpacePermission = 'owner' | 'edit' | 'view'  // resolved at runtime
```

| Level | Stored in DB? | Capabilities |
|---|---|---|
| `owner` | No (implicit from `space.owner_id`) | Full control: CRUD objects, manage types, share/unshare, archive, delete |
| `edit` | Yes (`space_shares.permission`) | Create and modify objects, cannot manage sharing settings |
| `view` | Yes (`space_shares.permission`) | Read-only access to space contents |

### The space_shares table

The sharing schema:

```typescript
export const spaceShareSchema = z.object({
  id: z.string().uuid(),
  space_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  shared_with_id: z.string().uuid(),
  shared_with_email: z.string(),
  permission: z.enum(['view', 'edit']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})
```

Key points:
- `owner_id` is the user who created the share (the space owner).
- `shared_with_id` is the recipient user's Supabase auth ID.
- `shared_with_email` stores the email used to invite (for display purposes).
- `permission` is either `'view'` or `'edit'`.

### Creating a share

The `ShareSpaceDialog` component (`apps/web/src/features/sharing/components/ShareSpaceDialog.tsx`) provides the UI. The flow:

1. Owner enters an email address and selects a permission level.
2. `useSpaceShares(spaceId).createShare(email, permission)` is called.
3. The data client calls `sharing.createShare({ space_id, shared_with_email, permission })`.
4. The Supabase implementation calls `findUserByEmail()` to resolve the email to a user ID, then inserts a `space_shares` row.
5. The `spaceShares` event is emitted, triggering a reload of the space list for all connected clients.

### The sharedPermission gotcha

This is one of the most important things to understand about the sharing system:

**`sharedPermission` from `useCurrentSpace()` is ALWAYS `null` for space owners.**

The `shareInfoMap` only contains entries for spaces shared *with* the current user. Since an owner is never a share recipient of their own space, `shareInfoMap.get(ownedSpaceId)` returns `undefined`, and `sharedPermission` resolves to `null`.

This means you **cannot** use `sharedPermission` to determine whether a space is shared. A null value could mean "I own this space and it has shares" or "I own this space and it has no shares" -- both look identical.

To check if an owned space is shared with anyone, use `useSpaceShares(spaceId)` and check `shares.length > 0`.

### useSpaceShares hook

File: `apps/web/src/features/sharing/hooks/useSpaceShares.ts`

This hook manages share records for a given space. It uses TanStack Query for the share list and provides mutation functions:

```typescript
const {
  shares,          // SpaceShare[] -- all share records for the space
  isLoading,
  createShare,     // (email, permission) => Promise<SpaceShare | null>
  updateShare,     // (shareId, permission) => Promise<SpaceShare | null>
  deleteShare,     // (shareId) => Promise<unknown>
  loadExclusions,  // (shareId) => Promise<ShareExclusion[]>
  addExclusion,    // (shareId, input) => Promise<ShareExclusion | null>
  removeExclusion, // (exclusionId) => Promise<unknown>
  loadSpaceExclusions,  // (spaceId) => Promise<ShareExclusion[]>
  addSpaceExclusion,    // (spaceId, input) => Promise<ShareExclusion | null>
} = useSpaceShares(spaceId)
```

---

## Exclusion System

Exclusions provide fine-grained access control on shared spaces. They allow an owner to hide specific types, objects, or fields from share recipients.

### Exclusion schema

```typescript
export const shareExclusionSchema = z.object({
  id: z.string().uuid(),
  space_share_id: z.string().uuid().nullable(),  // per-share exclusion
  space_id: z.string().uuid().nullable(),         // space-wide exclusion
  excluded_type_id: z.string().uuid().nullable(),
  excluded_object_id: z.string().uuid().nullable(),
  excluded_field: z.string().nullable(),
  created_at: z.string().datetime(),
})
```

### Two modes of exclusion

**Per-share exclusions** (`space_share_id` is set, `space_id` is null):
- Attached to a specific share record.
- Only affect the one recipient of that share.
- Managed through the `ExclusionManager` component inside `ShareSpaceDialog`.

**Space-wide exclusions** (`space_id` is set, `space_share_id` is null):
- Attached to the space itself.
- Apply to ALL share recipients.
- Managed through the sharing settings page.

### Exclusion types

An exclusion record represents one of three things depending on which nullable fields are populated:

| `excluded_type_id` | `excluded_object_id` | `excluded_field` | Effect |
|---|---|---|---|
| Set | null | null | Hides the entire object type and all its objects |
| null | Set | null | Hides a specific object |
| Set | null | Set | Hides a specific field on a type (across all objects of that type) |

### The useExclusionFilter hook

File: `apps/web/src/features/sharing/hooks/useExclusionFilter.ts`

This hook is the enforcement layer. It loads exclusions for the current user and provides filter functions that UI components use to strip excluded content.

The hook only activates for shared users (non-owners). For owners, all filter functions pass through data unchanged.

On mount, it loads two sets of exclusions in parallel:
1. **Per-user exclusions**: Finds the current user's share record, then loads exclusions for that share ID.
2. **Space-wide exclusions**: Loads exclusions by space ID.

Both sets are merged into a single list.

The hook returns:

```typescript
{
  isTypeExcluded: (typeId: string) => boolean,
  isObjectExcluded: (objectId: string) => boolean,
  filterTypes: (types: ObjectType[]) => ObjectType[],
  filterObjects: (objects: DataObjectSummary[]) => DataObjectSummary[],
  isFieldExcluded: (typeId: string, fieldId: string) => boolean,
  filterFields: (typeId: string, fields: FieldDefinition[]) => FieldDefinition[],
  filterProperties: (typeId: string, properties: Record<string, unknown>, fields: FieldDefinition[]) => Record<string, unknown>,
  isSharedUser: boolean,
  isLoading: boolean,
  error: string | null,
}
```

Usage in components follows a consistent pattern -- call the appropriate filter function before rendering lists:

```typescript
const { filterTypes, filterObjects } = useExclusionFilter()
const visibleTypes = filterTypes(allTypes)
const visibleObjects = filterObjects(allObjects)
```

### ExclusionManager component

File: `apps/web/src/features/sharing/components/ExclusionManager.tsx`

This component provides the UI for managing exclusions on a per-share basis. It renders inside the `ShareSpaceDialog`, expandable per recipient. It shows three sections:

1. **Hide entire types** -- checkbox list of all object types.
2. **Hide specific entries** -- collapsible type groups listing individual objects.
3. **Hide specific fields** -- per-type field lists with checkboxes.

Space-wide exclusions appear as disabled (checked but not toggleable) with a "(space-wide)" label, since they cannot be overridden at the per-share level.

---

## Permission Resolution

File: `apps/web/src/features/sharing/lib/permissions.ts`

The `resolveSpacePermission` function is the single source of truth for determining a user's access level to a space:

```typescript
export function resolveSpacePermission(
  space: Space | null,
  userId: string | undefined,
  sharedPermission: SpaceSharePermission | null,
): SpacePermission {
  if (!space) return 'view'
  if (!userId) return space.owner_id === LOCAL_OWNER_ID ? 'owner' : 'view'
  if (space.owner_id === userId) return 'owner'
  if (sharedPermission === 'edit') return 'edit'
  return 'view'
}
```

The resolution order:

1. No space loaded -- default to `'view'` (safe fallback).
2. No authenticated user -- check if the space is owned by the local owner ID (guest mode). If so, grant `'owner'`; otherwise `'view'`.
3. Current user is the space owner -- `'owner'`.
4. User has an `'edit'` share -- `'edit'`.
5. Everything else (including `'view'` shares and no share at all) -- `'view'`.

Two helper functions simplify downstream checks:

```typescript
export function canEdit(permission: SpacePermission): boolean {
  return permission === 'owner' || permission === 'edit'
}

export function isOwner(permission: SpacePermission): boolean {
  return permission === 'owner'
}
```

### The useSpacePermission hook

File: `apps/web/src/features/sharing/hooks/useSpacePermission.ts`

This hook wraps `resolveSpacePermission` and provides the computed result to components:

```typescript
export function useSpacePermission() {
  const { space, sharedPermission } = useCurrentSpace()
  const { user } = useAuth()

  return useMemo(() => {
    const permission = resolveSpacePermission(space, user?.id, sharedPermission)
    return {
      permission,         // 'owner' | 'edit' | 'view'
      canEdit: canEdit(permission),   // boolean
      isOwner: isOwner(permission),   // boolean
    }
  }, [space, user?.id, sharedPermission])
}
```

Components use `canEdit` to conditionally render editing UI (buttons, editors, mutation controls) and `isOwner` to show or hide administrative actions (sharing, archiving, deleting).

---

## How Spaces Interact with Data

### Data client scoping

`DataProvider` receives `spaceId` from `SpaceProvider` via the `DataProviderWithSpace` bridge component. The data client is created with this space ID:

```typescript
const dataClient = useMemo(() => {
  const effectiveSpaceId = spaceId ?? undefined
  if (user) {
    return createSupabaseDataClient(supabase, effectiveSpaceId, user.id)
  }
  return createLocalDataClient(effectiveSpaceId)
}, [user, supabase, spaceId])
```

All queries issued through this client are automatically scoped to the active space. Supabase queries add `.eq('space_id', spaceId)` filters. Dexie queries filter by the `space_id` index.

### Cache invalidation on space switch

When the user switches spaces, `currentSpaceId` changes in `SpaceProvider`, which propagates to `DataProviderWithSpace`, which passes a new `spaceId` to `DataProvider`. Since `spaceId` is a dependency of the `useMemo` that creates the data client, a new client is created.

TanStack Query cache keys include the space ID:

```typescript
export const queryKeys = {
  objects: {
    all: (spaceId?: string) => ['objects', spaceId] as const,
    list: (spaceId?: string, options?: ListObjectsOptions) => ['objects', spaceId, 'list', options] as const,
    // ...
  },
  // same pattern for objectTypes, tags, templates, etc.
}
```

Since the space ID is embedded in every query key, switching spaces means all queries target different cache entries. Previously cached data for the old space is preserved in TanStack Query's garbage collection window (5 minutes by default), so switching back is fast.

---

## Collaboration Activation

Realtime collaboration (Yjs-based concurrent editing) activates when all three conditions are true:

```typescript
// From ObjectEditor.tsx
const isSharedSpace = isOwner ? shares.length > 0 : sharedPermission !== null
const isCollaborative = storageMode === 'supabase' && canEdit && isSharedSpace
```

The three conditions:

1. **`storageMode === 'supabase'`** -- The user must be authenticated. Guest mode (Dexie) has no server to broker collaboration.
2. **`canEdit`** -- The user must have `'owner'` or `'edit'` permission. View-only users open the editor in read-only mode.
3. **`isSharedSpace`** -- The space must actually be shared with someone. For owners, this is determined by checking `shares.length > 0` (whether they have created any share records). For share recipients, this is determined by `sharedPermission !== null`.

When `isCollaborative` is `true`, the `useCollaboration` hook initializes Yjs, connects the Supabase Broadcast provider, and enables multi-user editing.

---

## Space Lifecycle

### Create

Users create spaces through the `SpaceSwitcher` dropdown ("New Space") or through the `SpacesSettings` page. The `CreateSpaceDialog` supports:

- Naming the space and choosing an icon.
- Copying types (and optionally templates) from an existing space.
- Importing a starter kit.

### Share

Owners share a space from the `SpaceSwitcher` dropdown ("Share Space"), which opens `ShareSpaceDialog`. They enter an email and choose `view` or `edit`. The system looks up the Supabase user by email and creates a share record.

### Switch

The `SpaceSwitcher` component (`apps/web/src/features/sidebar/components/SpaceSwitcher.tsx`) renders as a dropdown in the sidebar header. It shows:

- Owned spaces (with a checkmark on the active one).
- A "Shared with you" section for spaces shared by others (with a "Shared" badge).
- Actions: Share Space (owners only), Leave Space (shared users only), New Space.

On switch, `switchSpace(id)` is called, which updates context and `localStorage`, and navigates to `/dashboard`.

### Archive

Archiving hides a space without deleting it. The space is excluded from the active spaces list and the switcher. Archived spaces can be viewed and unarchived from the settings page.

The `archiveSpace` function guards against archiving the last active owned space -- a user must always have at least one non-archived space.

If the archived space was the current space, the provider automatically switches to the next available space.

### Delete

Permanent deletion removes the space and all its contents (objects, types, templates, tags, etc.) via database cascading. This action requires confirmation through a `ConfirmDialog`. Like archiving, deleting the current space triggers an automatic switch.

### Leave

For shared users, "Leave Space" removes their share record. The `leaveSpace` function in `SpaceProvider` calls `sharingClient.deleteShare(info.shareId)` using the share ID from the `shareInfoMap`. If the user is leaving the current space, it switches to the first owned space.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `apps/web/src/shared/lib/data/types.ts` | `Space`, `SpaceShare`, `ShareExclusion` schemas and types; `SharingClient` interface |
| `apps/web/src/shared/lib/data/SpaceProvider.tsx` | Space context: load, switch, create, archive, delete, leave |
| `apps/web/src/shared/lib/data/DataProvider.tsx` | Data context: creates space-scoped `DataClient` |
| `apps/web/src/shared/lib/data/queryKeys.ts` | TanStack Query key factories (space-scoped) |
| `apps/web/src/shared/lib/data/local.ts` | Dexie implementation including `LOCAL_DEFAULT_SPACE_ID` |
| `apps/web/src/shared/lib/data/supabase.ts` | Supabase implementation of `SharingClient` |
| `apps/web/src/app/providers.tsx` | Provider nesting: `SpaceProvider` > `DataProviderWithSpace` > `DataProvider` |
| `apps/web/src/features/sharing/lib/permissions.ts` | `resolveSpacePermission`, `canEdit`, `isOwner` |
| `apps/web/src/features/sharing/hooks/useSpacePermission.ts` | Hook wrapping permission resolution |
| `apps/web/src/features/sharing/hooks/useSpaceShares.ts` | Share CRUD hook with exclusion management |
| `apps/web/src/features/sharing/hooks/useExclusionFilter.ts` | Exclusion enforcement hook |
| `apps/web/src/features/sharing/components/ShareSpaceDialog.tsx` | Share invitation UI with per-recipient exclusion management |
| `apps/web/src/features/sharing/components/ExclusionManager.tsx` | Exclusion toggle UI (types, objects, fields) |
| `apps/web/src/features/spaces/components/SpacesSettings.tsx` | Space management settings page |
| `apps/web/src/features/sidebar/components/SpaceSwitcher.tsx` | Sidebar space switcher dropdown |
| `apps/web/src/features/objects/components/ObjectEditor.tsx` | Collaboration activation logic |

---

## Gotchas

1. **`sharedPermission` is null for owners.** Do not use it to check whether a space is shared. For owners, check `useSpaceShares(spaceId).shares.length > 0`.

2. **Space switching does not change the URL.** Only context changes. The data client is recreated, TanStack Query keys shift, and new queries fire. Navigation to `/dashboard` happens separately in the `SpaceSwitcher` component.

3. **Archiving the last owned space is prevented.** `archiveSpace` checks `activeOwned.length <= 1` and returns an error if you try. A user must always have at least one active owned space.

4. **Exclusions have two modes.** Per-share exclusions are scoped to a single recipient (`space_share_id` FK). Space-wide exclusions apply to all recipients (`space_id` FK, no `space_share_id`). Both are loaded and merged by `useExclusionFilter`.

5. **Guest mode uses a hardcoded space ID.** The constant `LOCAL_DEFAULT_SPACE_ID` (`00000000-0000-0000-0000-000000000099`) is used for all Dexie data in guest mode. No sharing, no multi-space support.

6. **Local-to-Supabase migration does not preserve spaces.** When a guest migrates to an authenticated account, all local data is imported into the user's default Supabase space. Local space IDs are not carried over.

7. **loadSpaces uses a sequence counter.** `loadSeqRef` prevents stale async responses from overwriting fresher data when `loadSpaces` is called multiple times in rapid succession (for example, from event subscriptions).

8. **Non-owned spaces missing from shareInfoMap default to `'view'`.** If `getSharedSpaces()` does not return metadata for a shared space (edge case), `SpaceProvider` assumes `'view'` permission rather than denying access.

---

## Exercises

1. **Trace a space switch.** Starting from a click in `SpaceSwitcher`, follow the code through `switchSpace`, context updates, `DataProvider` recreation, and TanStack Query cache behavior. Identify every state change and side effect.

2. **Map the provider tree.** Read `apps/web/src/app/providers.tsx` and diagram the nesting of `SpaceProvider`, `DataProviderWithSpace`, and `DataProvider`. Explain why `DataProvider` cannot be a sibling of `SpaceProvider`.

3. **Trace exclusion enforcement.** Pick a component that renders a list of objects (like a type page). Follow how `useExclusionFilter().filterObjects()` removes excluded items before rendering. Check what happens when a type-level exclusion is active -- are objects of that type filtered too?

4. **Follow collaboration activation.** Read the `isCollaborative` derivation in `ObjectEditor.tsx`. For each of the three conditions, identify the hook or context value it reads from and trace where that value is set.

5. **Build a permission mental model.** Draw the hierarchy: `owner` > `edit` > `view` > no access (`null`). For each level, list what the user can and cannot do. Pay attention to the asymmetry: `sharedPermission` is null for both owners and unauthenticated users -- how does `resolveSpacePermission` disambiguate?
