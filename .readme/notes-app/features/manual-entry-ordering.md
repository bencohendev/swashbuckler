# Manual Entry Ordering

**Status:** Done

## Overview

Lets users drag-and-drop to reorder entries manually. Applies to two surfaces:

- **Sidebar** — within each type section (up to 10 items), space owners can drag entries to reorder
- **Types page** — table and list views when "Manual" sort is selected show drag handles for reordering

## Schema

- `objects.sort_order INT NOT NULL DEFAULT 0` — 0 means unsorted (new entries default). On reorder, items get values 1, 2, 3, ...
- Supabase migration: `029_object_sort_order.sql`
- Dexie version 14 adds `sort_order` index on objects table

## Sort Strategy

- Primary: `sort_order ASC`, secondary: `updated_at DESC`
- Unsorted items (sort_order=0) appear first, newest-first among themselves
- When user reorders, all visible items get reassigned 1..N

## Sidebar

- `DraggableObjectItem` wraps each entry with `useDrag`/`useDrop` (same midpoint-crossing pattern as type section DnD)
- Shows `GripVertical` icon on hover
- Drag type scoped per object type: `SIDEBAR_OBJECT_${typeId}`
- Space owners only; shared users see standard non-draggable list
- Uses optimistic local ordering during drag, persists `sort_order` via `update()` on drop

## Types Page

- "Manual" added as first option in sort popover
- Direction buttons hidden when Manual sort is selected (always ascending)
- Table view: narrow first column with `GripVertical` drag handle per row (`DraggableRow` component)
- List view: `GripVertical` handle inside each item (`DraggableListItem` component)
- `TypeTableView` wraps table/list in `DndProvider` when manual sort is active
- Uses reorder-IDs state pattern for optimistic ordering; persists on drop

## Files Modified

- `supabase/migrations/029_object_sort_order.sql` — migration
- `src/shared/lib/data/types.ts` — `sort_order` in Zod schemas
- `src/shared/lib/data/supabase.ts` — summary columns + ordering
- `src/shared/lib/data/local.ts` — Dexie v14 + sort change
- `src/features/table-view/lib/sortObjects.ts` — sort_order case
- `src/features/table-view/components/SortPopover.tsx` — Manual option
- `src/features/table-view/components/TypeDataTable.tsx` — DnD rows
- `src/features/table-view/components/TypeListView.tsx` — DnD items
- `src/features/table-view/components/TypeTableView.tsx` — orchestration
- `src/features/sidebar/components/DraggableObjectItem.tsx` — new component
- `src/features/sidebar/components/TypeSection.tsx` — optional DnD mode
- `src/features/sidebar/components/Sidebar.tsx` — object reorder state
