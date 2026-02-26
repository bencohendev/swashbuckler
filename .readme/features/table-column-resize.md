# Table Column Resize

**Status:** Done

## Overview

Drag-to-resize handles on table column borders so users can manually control column widths. Uses Plate.js v48's built-in resize system (`TableProvider`, `useTableCellElementResizable`, `useTableColSizes`, `ResizeHandle`).

## Decisions

| Area | Decision |
|------|----------|
| Scope | Column resize only — rows auto-size to content |
| Resize direction | Drag right border of any cell |
| Visual indicator | Blue line on hover and during drag |
| Minimum width | 48px per column |
| Persistence | Stored in `table.colSizes[]` on the Slate node (auto-saved) |
| Read-only | Resize handles hidden |
| Existing tables | Normalizer seeds equal-width `colSizes` on first render |

## Design

### User interaction

Hover over the right border of any table cell to see a blue resize indicator line. Click and drag to adjust the column width. The adjacent column resizes inversely to preserve total table width.

### Technical approach

Integrate Plate's resize primitives rather than building from scratch:

1. **TablePlugin configuration** — set `minColumnWidth`, `initialTableWidth`, `disableMarginLeft`
2. **TableProvider** — wraps table content to provide resize context
3. **colgroup** — `<colgroup>` with `<col>` elements driven by `useTableColSizes()`
4. **table-layout: fixed** — ensures `<col>` widths are respected
5. **CellResizeHandle** — per-cell component using `useTableCellElementResizable()` + `ResizeHandle`

## Implementation

### Files changed

| File | Change |
|------|--------|
| `apps/web/package.json` | Add `@udecode/plate-resizable` dependency |
| `apps/web/src/features/editor/lib/plate-config.ts` | Configure TablePlugin with resize options |
| `apps/web/src/features/editor/types.ts` | Add `colSizes` to TableNode |
| `apps/web/src/features/editor/components/elements/Table.tsx` | TableProvider wrapper, colgroup, resize handles on cells |

### Key details

- `initialTableWidth: 640` triggers Plate's normalizer to seed `colSizes` on tables that lack them
- Dragging resizes current column and neighbor inversely (total width preserved)
- `colSizes` persists as a normal Slate node property — Yjs handles sync automatically
- Existing hover menus unaffected — ResizeObserver re-measures on layout changes
