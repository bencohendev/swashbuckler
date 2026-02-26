# Saved Views & Filters

**Status:** Done

## Summary

Let users save named views per type page — a combination of filters, sort order, view mode (table/list/card/board), and board grouping field — and switch between them. Currently filters persist automatically in localStorage but there's no way to name, save, or switch between different filter configurations.

## Motivation

Power users work with the same type in different contexts (e.g., "Recent recipes", "Vegetarian only", "By cook time"). Saved views let them switch contexts without re-applying filters each time.

## Scope

- Save current filter + sort + view mode + board group field as a named view
- View selector dropdown (bookmark icon + "Views" label) on type pages after the ViewToggle
- Apply a saved view by clicking it (loads settings into existing Zustand stores)
- Edit (rename / toggle default) and delete saved views via overflow menu
- One default view per type per user (enforced by partial unique index)
- Storage: Dexie (guest mode) and Supabase (authenticated) via `SavedViewsClient`
- Persist across sessions

## Implementation Details

### Data Model
- `saved_views` table: id, space_id, type_id, name, filters (JSONB), sort (JSONB), view_mode, board_group_field_id, is_default, owner_id, timestamps
- Supabase migration: `023_saved_views.sql` with RLS, indexes, and `update_updated_at` trigger
- Dexie v11 adds `savedViews` table

### Key Files
- `apps/web/src/shared/lib/data/types.ts` — `SavedView`, `CreateSavedViewInput`, `UpdateSavedViewInput`, `SavedViewsClient`
- `apps/web/src/shared/lib/data/supabase.ts` — `createSavedViewsClient()`
- `apps/web/src/shared/lib/data/local.ts` — `createLocalSavedViewsClient()`
- `apps/web/src/features/table-view/hooks/useSavedViews.ts` — TanStack Query hooks
- `apps/web/src/features/table-view/components/SavedViewSelector.tsx` — Dropdown UI
- `apps/web/src/features/table-view/components/SavedViewDialog.tsx` — Create/rename dialog
- `apps/web/src/features/table-view/components/TypeTableView.tsx` — Wired in after ViewToggle

### UX Model
Saved views are bookmarks — clicking one loads its settings into the existing Zustand stores. There's no "active view" tracking; after applying, the user can freely tweak filters and the stores persist those changes as before.
