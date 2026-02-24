# Board (Kanban) View

**Status:** Done

## Overview

A kanban-style board view on type pages that groups entries into columns by a `select` field. Users drag cards between columns to update the field value. Available as the fourth view mode alongside table, list, and card.

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| DnD library | react-dnd (HTML5Backend) | Already used by sidebar and editor — no new dependency |
| Grouping persistence | Zustand + localStorage | Same pattern as view mode store |
| Mobile DnD | Disabled (horizontal scroll only) | Touch DnD adds complexity; MVP ships without it |
| Column ordering | Follows `options` array order from field definition | Matches the order users defined in type settings |

## Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/features/table-view/stores/boardGrouping.ts` | Zustand store — persists which select field to group by per type slug |
| `src/features/table-view/lib/groupObjects.ts` | Pure function — groups objects into columns by field value |
| `src/features/table-view/components/TypeBoardView.tsx` | Container — orchestrates grouping, DnD provider, field selector |
| `src/features/table-view/components/BoardColumn.tsx` | Drop target column — header, count badge, card list |
| `src/features/table-view/components/BoardCard.tsx` | Draggable card — icon, title, field preview |
| `src/features/table-view/components/BoardFieldSelector.tsx` | Dropdown — pick which select field to group by |

### Modified Files

| File | Change |
|------|--------|
| `src/features/table-view/stores/viewMode.ts` | Added `'board'` to `ViewMode` union |
| `src/features/table-view/components/ViewToggle.tsx` | Added `KanbanIcon` fourth button |
| `src/features/table-view/components/TypeTableView.tsx` | Added `mode === 'board'` render branch |
| `src/features/table-view/components/index.ts` | Exported new components |

## Behavior

### Grouping
- User selects a `select` field from the "Group by" dropdown
- One column per option (in field definition order) plus an "Uncategorized" column
- Entries without a value for the field, or with a value not in current options, go to Uncategorized
- Grouping field choice persisted per type slug in localStorage

### Drag and Drop
- Cards can be dragged between columns to change their field value
- Dropping on the same column is a no-op
- Screen reader announcements via `aria-live="polite"` region
- View-only users see the board but cannot drag

### Empty States
- **No select fields on type** — message directing user to add one in type settings
- **No grouping field selected** — prompt to choose a field
- **Empty columns** — always rendered with "No entries" placeholder
- **Stored field deleted** — automatically reset, shows field selector

## Accessibility

- Columns use `role="group"` with `aria-label` including entry count
- Card list uses `role="list"`, cards use `role="listitem"`
- Cards are keyboard-focusable (`tabIndex={0}`) and navigable with Enter/Space
- Drop announcements via `aria-live="polite"`
