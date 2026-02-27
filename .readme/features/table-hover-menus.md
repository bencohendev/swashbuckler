# Table Hover Menus

**Status:** Done

## Overview

Replace the current single floating toolbar above tables with per-row and per-column hover menus. Each row gets a left-gutter handle; each column gets a top-gutter handle. Clicking a handle opens a dropdown with contextual insert/delete actions — similar to Notion's table UX.

## Decisions

| Area | Decision |
|------|----------|
| Row handle position | Left gutter, visible when cell in that row is hovered |
| Column handle position | Above each column, visible when cell in that column is hovered |
| Menu component | Reuse existing `DropdownMenu` (Radix) |
| Positioning | Absolute positioning relative to table container |
| Delete table | Available as final item in any row or column menu |

## Design

### Row Controls

A grip handle appears on the left edge of a row when any cell in that row is hovered. Clicking opens a `DropdownMenu`:
- Insert row above
- Insert row below
- Delete row
- (separator)
- Delete table

### Column Controls

A handle appears above a column when any cell in that column is hovered. Clicking opens a `DropdownMenu`:
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
- `deleteRow(editor)` / `deleteColumn(editor)` / `deleteTable(editor)` — operate on current selection
- `editor.api.findPath(element)` — get element's Slate path

### Architecture

All handles render inside `TableElement` using DOM measurements (avoids HTML table structure issues — can't put `position: relative` on `<tr>` or insert non-`<td>` children).

- `ResizeObserver` on the `<table>` measures row heights/positions and column widths/positions from first-row cells
- Each handle is a `RowHandleMenu` or `ColumnHandleMenu` component using Radix `DropdownMenu` (portals, keyboard/a11y built-in)
- Per-cell hover tracking via `onMouseMove` on the wrapper div — computes which cell is hovered from `rowPositions`/`colPositions`, so only the hovered cell's row and column handles appear (not all handles at once)
- A `menuAnchorCell` state keeps the relevant handle visible when a dropdown menu is open (portal moves mouse outside the table container); takes priority over `hoveredCell`
- First-column cells have extra left padding (`pl-5`) in edit mode to prevent the row handle from overlapping cell content
- For `deleteRow`/`deleteColumn`, selection is moved into the target cell first via `editor.tf.select(editor.api.start(cellPath))`, then the delete function operates on selection
- Handles are `contentEditable={false}` and hidden in read-only mode
