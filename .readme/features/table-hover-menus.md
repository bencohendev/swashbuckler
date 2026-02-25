# Table Hover Menus

**Status:** Not started

## Overview

Replace the current single floating toolbar above tables with per-row and per-column hover menus. Each row gets a left-gutter handle; each column gets a top-gutter handle. Clicking a handle opens a dropdown with contextual insert/delete actions — similar to Notion's table UX.

## Decisions

| Area | Decision |
|------|----------|
| Row handle position | Left gutter, visible on row hover |
| Column handle position | Above each column, visible on table hover |
| Menu component | Reuse existing `DropdownMenu` (Radix) |
| Positioning | Absolute positioning relative to table container |
| Delete table | Available as final item in any row or column menu |

## Design

### Row Controls

A grip handle appears on the left edge of each row on hover. Clicking opens a `DropdownMenu`:
- Insert row above
- Insert row below
- Delete row
- (separator)
- Delete table

### Column Controls

A handle appears above each column on table hover. Clicking opens a `DropdownMenu`:
- Insert column left
- Insert column right
- Delete column
- (separator)
- Delete table

Column handles are positioned absolutely above the table by measuring cell offsets from the first row.

## Implementation

### Key files

- `src/features/editor/components/elements/Table.tsx` — all four table element components live here
- `src/shared/components/ui/DropdownMenu.tsx` — reusable dropdown menu (Radix)

### Plate.js APIs

- `insertTableRow(editor, { at: rowPath, before: true })` — insert above
- `insertTableRow(editor, { at: rowPath })` — insert below
- `insertTableColumn(editor, { at: cellPath, before: true })` — insert left
- `insertTableColumn(editor, { at: cellPath })` — insert right
- `deleteRow(editor)` / `deleteColumn(editor)` / `deleteTable(editor)`
- `usePath()` from `@udecode/plate/react` — get element's Slate path

### Steps

1. Refactor `TableRowElement` to render a left-gutter grip icon with `DropdownMenu` (insert above/below, delete row, delete table)
2. In `TableElement`, measure first-row cell positions and render absolutely-positioned column handles with `DropdownMenu` (insert left/right, delete column, delete table)
3. Remove the existing top-right hover toolbar from `TableElement`
4. Style handles with frosted-glass effect consistent with other editor controls; visible on hover, hidden in read-only mode
5. Add `aria-label` on handles; keyboard accessibility is handled by Radix

### Challenges

- **Column positioning** — HTML tables have no per-column wrapper; need `ResizeObserver` or refs on first-row cells to measure `offsetLeft`/`offsetWidth`
- **`contentEditable={false}`** — Handles must be non-editable to avoid interfering with typing
- **`deleteRow`/`deleteColumn` path targeting** — Verify these accept `at` option; if not, select the target path first via `editor.tf.select(path)`

## Verification

- [ ] Hover a row — left handle appears
- [ ] Hover the table — column handles appear above each column
- [ ] Insert row above/below targets the correct row
- [ ] Insert column left/right targets the correct column
- [ ] Delete row/column/table all work
- [ ] Handles hidden in read-only mode
- [ ] `npx vitest run` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
