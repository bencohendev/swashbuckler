# Archive

**Status:** Done

Hide entries, types, and spaces from normal views without deleting them. Archived items can be restored from a dedicated archive page.

## Behavior

- **Entries**: Archived entries disappear from the sidebar, search, pinned section, and recent section. They remain in the database and can be unarchived.
- **Types**: Archiving a type implicitly hides all entries of that type from the sidebar, search, pinned section, and recent section — without archiving individual entries. Unarchiving the type restores visibility.
- **Spaces**: Archived spaces disappear from the space switcher. If the current space is archived, the app auto-switches to the next available space.
- **Mutual exclusion**: Archive and trash are mutually exclusive — a trashed (soft-deleted) entry cannot be archived.

## Schema

`is_archived` (boolean, default false) and `archived_at` (timestamptz, nullable) columns on `objects`, `object_types`, and `spaces` tables.

Migration: `022_archive.sql`

Dexie schema bumped from v9 to v10 with `is_archived` index on objects and objectTypes, plus an upgrade function to backfill existing records.

## UI

### Archive an entry
- **ObjectEditor** "More Options" dropdown includes an "Archive" item (hidden when entry is trashed)
- On archive: toast confirmation, navigate away from the entry

### Archive a type
- **ObjectTypeManager** (Settings > Types) shows an archive icon button per type row with confirmation dialog
- On archive: type and all its entries disappear from the sidebar

### Archive a space
- **SpacesSettings** (Settings > Spaces) shows an archive icon button per space row with confirmation dialog
- On archive: space disappears from switcher, app switches to next available space

### Archive page (`/archive`)
- Three sections: Archived Entries, Archived Types, Archived Spaces
- Each item shows name, icon, archive date, and an "Unarchive" button
- Empty state shown when all sections are empty

### Implicit filtering
- Sidebar: archived types and their entries excluded via `archivedTypeIds` set
- Search (Cmd+K): archived-type entries excluded from results; archived types excluded from type filter pills
- Pinned section: entries of archived types filtered out
- Recent section: entries of archived types filtered out

## Guards

- Cannot archive the last non-archived owned space
- Cannot archive a trashed entry (mutually exclusive states)
- If `currentSpaceId` in localStorage points to an archived space, the app falls back to the first non-archived space

## Data Layer

### Client methods
- `ObjectsClient.archive(id)` / `unarchive(id)`
- `ObjectTypesClient.archive(id)` / `unarchive(id)`
- `SpacesClient.archive(id)` / `unarchive(id)`

### List filtering
- `ListObjectsOptions.isArchived` — filter objects by archive status
- `ListObjectTypesOptions.isArchived` — filter types by archive status
- `ListSpacesOptions.isArchived` — filter spaces by archive status
- Search excludes archived items by default

### Hooks
- `useObjects({ isArchived })` — pass-through to list options; exposes `archive`/`unarchive`
- `useObjectTypes({ isArchived })` — pass-through to list options; exposes `archive`/`unarchive`
- `useSpaces()` — `spaces` excludes archived; `allSpaces` includes all; exposes `archiveSpace`/`unarchiveSpace`

## Files

### New
- `apps/web/supabase/migrations/022_archive.sql`
- `apps/web/src/features/objects/components/ArchiveList.tsx`
- `apps/web/src/app/(main)/archive/page.tsx`

### Modified
- `apps/web/src/shared/lib/data/types.ts` — archive fields on schemas, new interfaces/methods
- `apps/web/src/shared/lib/data/supabase.ts` — archive/unarchive implementations, list filtering
- `apps/web/src/shared/lib/data/local.ts` — Dexie v10, archive/unarchive implementations
- `apps/web/src/shared/lib/data/queryKeys.ts` — options params for objectTypes keys
- `apps/web/src/shared/lib/data/SpaceProvider.tsx` — archive methods, filtered spaces
- `apps/web/src/features/objects/hooks/useObjects.ts` — archive/unarchive callbacks
- `apps/web/src/features/object-types/hooks/useObjectTypes.ts` — options param, archive/unarchive
- `apps/web/src/features/objects/components/ObjectEditor.tsx` — Archive menu item
- `apps/web/src/features/sidebar/components/Sidebar.tsx` — archive link, implicit type filtering
- `apps/web/src/features/object-types/components/ObjectTypeManager.tsx` — archive button and confirm dialog
- `apps/web/src/features/search/components/GlobalSearchDialog.tsx` — exclude archived types
