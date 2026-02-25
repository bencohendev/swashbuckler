# Delete Space

**Status:** Done

## Overview

Allow space owners to permanently delete a space and all its contents (entries, types, templates, tags, shares). Accessible from the Spaces settings page.

## Behavior

- Deleting a space cascades to all contained objects, object types, templates, tags, object tags, pins, space shares, and share exclusions
- Only the space owner can delete (enforced by RLS policy)
- Cannot delete the last remaining owned space — the delete button is hidden when only one non-archived owned space exists
- Recipients of shared spaces cannot delete them; they can only leave

## Cascade

**Supabase:** `ON DELETE CASCADE` foreign keys on `objects.space_id`, `object_types.space_id`, `templates.space_id`, and `space_shares.space_id` (migrations 010, 011). Type-level cascades (migration 020) handle objects/templates tied to deleted types.

**Dexie:** Application-level cascade in `local.ts` — deletes objects, pins, object types, templates, tags, object tags, then the space itself.

## UI

### Entry point

Settings → Spaces (`/settings/spaces`). Each owned space row shows a trash icon when `ownedSpaces.length > 1`.

### Confirmation

`ConfirmDialog` with destructive styling:
- **Title:** "Delete space"
- **Description:** `Permanently delete "{name}" and all its objects, types, and templates? This cannot be undone.`

### Post-delete navigation

1. If the deleted space is the current space, switch to the next available owned space
2. Show success toast ("Space deleted") or error toast on failure
3. Navigate to `/`

## Data Layer

- `SpacesClient.delete(id)` — Supabase: single `.delete().eq('id', id)`; Local: manual cascade
- `useSpaces().remove(id)` — calls `spacesClient.delete`, emits `'spaces'` channel

## Files

### Modified (feature added to existing files)
- `apps/web/src/features/spaces/components/SpacesSettings.tsx` — delete button, confirm dialog, post-delete logic
- `apps/web/src/shared/lib/data/supabase.ts` — `SpacesClient.delete`
- `apps/web/src/shared/lib/data/local.ts` — `SpacesClient.delete` with cascade
- `apps/web/src/shared/lib/data/types.ts` — `delete` method on `SpacesClient` interface
- `apps/web/src/shared/lib/data/SpaceProvider.tsx` — `remove` exposed via `useSpaces()`
