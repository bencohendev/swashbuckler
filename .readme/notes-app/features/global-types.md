# Global Types

**Status:** Done

## Summary

Reusable type blueprints defined outside of any space. Users create global types in Account Settings, then import (copy) them into spaces as needed. Each import creates an independent space-scoped copy — editing or deleting the global type has no effect on existing copies.

## Key Decisions

- **Copy/import model** — importing creates an independent copy with fresh field UUIDs
- **No templates** — global types don't carry templates; users add templates after import
- **Auth-only** — guest mode hides global types UI entirely

## Database

Migration `021_global_types.sql` replaces the single `object_types_space_slug_idx` with two partial unique indexes:

- `object_types_space_slug_idx` — `(space_id, slug) WHERE space_id IS NOT NULL` (space-scoped)
- `object_types_owner_global_slug_idx` — `(owner_id, slug) WHERE space_id IS NULL` (per-owner global)

Existing RLS policies (`auth.uid() = owner_id`) already cover global types.

## Data Layer

`GlobalObjectTypesClient` interface on `DataClient` with methods: `list`, `get`, `create`, `update`, `delete`, `importToSpace`. Implemented in both Supabase and Dexie clients.

Query keys: `globalObjectTypes.all()`, `globalObjectTypes.list()`, `globalObjectTypes.detail(id)`.
Event channel: `'globalObjectTypes'`.

## UI

### Settings — Global Types Page

Standalone page at `/settings/global-types` linked from the Account section in the settings hub. State-driven list/create/edit views using `ObjectTypeForm` with `isGlobal={true}`. Supports create, edit, and delete with confirmation dialog.

### Object Type Manager — Import Button

"Import Global Type" button next to "Create Type" (auth-only). Opens a dialog listing all global types with per-row "Import" buttons. Shows toast on success or slug conflict error.

## Data Export

Global types included in export payload as `globalObjectTypes` array.

## Files

- `supabase/migrations/021_global_types.sql`
- `src/shared/lib/data/types.ts` — `GlobalObjectTypesClient` interface
- `src/shared/lib/data/queryKeys.ts` — global type query keys
- `src/shared/lib/data/events.ts` — `'globalObjectTypes'` channel
- `src/shared/lib/data/supabase.ts` — Supabase implementation
- `src/shared/lib/data/local.ts` — Dexie implementation
- `src/features/global-types/hooks/useGlobalObjectTypes.ts`
- `src/features/global-types/components/GlobalTypesSection.tsx`
- `src/features/global-types/components/GlobalTypeImporter.tsx`
- `src/features/object-types/components/ObjectTypeForm.tsx` — `isGlobal` prop
- `src/features/object-types/components/ObjectTypeManager.tsx` — importer integration
- `src/app/(main)/settings/global-types/page.tsx` — standalone settings page
- `src/features/account/hooks/useAccountExport.ts` — export integration
