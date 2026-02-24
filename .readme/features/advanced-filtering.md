# Advanced Filtering

**Status: Done**

## Overview

Extends type pages with filtering for all property types (date, number, text, URL) and a universal sort control that persists across sessions. Builds on existing search, select, checkbox, and tag filters.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Filter persistence | Zustand + localStorage per slug | Matches existing viewMode store pattern; filters survive navigation and refresh |
| Sort persistence | Same pattern, separate store | Sort and filter config change independently; separate keys simplify logic |
| Date comparison | ISO string comparison (YYYY-MM-DD) | All date values are stored as ISO strings; lexicographic comparison works correctly |
| Number comparison | Native numeric `>=`/`<=` | Straightforward range semantics; NaN/missing values excluded |
| Text/URL filter | Case-insensitive substring match | Consistent with existing title search behavior |
| Set serialization | Arrays in localStorage, Sets in memory | JSON can't serialize Sets; convert on read/write |
| Sort extraction | Shared `sortObjects()` utility | All four view modes (table, list, card, board) use the same sort logic |

## Implementation

| File | Purpose |
|------|---------|
| `src/features/table-view/lib/filterObjects.ts` | `TypePageFilters` interface, `isFiltered()`, `filterObjects()` — extended with `dateFilters`, `numberFilters`, `textFilters` |
| `src/features/table-view/lib/sortObjects.ts` | `SortConfig` type, `DEFAULT_SORT`, `sortObjects()` pure function — handles all field types + tags |
| `src/features/table-view/stores/filterConfig.ts` | Zustand store for persisted filter state per type slug (Sets serialized as arrays) |
| `src/features/table-view/stores/sortConfig.ts` | Zustand store for persisted sort config per type slug |
| `src/features/table-view/components/TypeTableView.tsx` | Wires persisted stores, applies `filterObjects()` then `sortObjects()` for all view modes |
| `src/features/table-view/components/TypeDataTable.tsx` | Accepts `sort`/`onSortChange` props from parent (no local sort state) |
| `src/features/table-view/components/TypePageFilterBar.tsx` | Sort dropdown, date/number/text/URL filter sections in popover, filter pills |

## Filter Types

| Type | UI Control | Logic |
|------|-----------|-------|
| Search | Text input (existing) | Case-insensitive title substring |
| Select / Multi-select | Checkbox group (existing) | Value in selected set; multi-select: any value matches |
| Checkbox | True/False/Any toggle (existing) | Exact boolean match |
| Tags | Checkbox group (existing) | Any selected tag present on entry |
| Date | From/To date inputs | ISO string `>=` from, `<=` to; missing value excluded |
| Number | Min/Max number inputs | Numeric `>=` min, `<=` max; missing value excluded |
| Text | Substring input | Case-insensitive `includes`; missing value excluded |
| URL | Substring input | Same as text filter |

All filters combine with AND logic. Within select/tag filters, values use OR logic.

## Sort

- Sort dropdown in filter bar with field picker + asc/desc toggle
- Supports: Title, Tags, Updated, Created, and all custom field types
- Table column headers sync with sort dropdown
- Default: `updated_at` descending
- Persists per type slug in localStorage

## Verification

- [x] Date range filter narrows entries by from/to date
- [x] Number range filter narrows entries by min/max
- [x] Text filter matches case-insensitive substring in text fields
- [x] URL filter matches case-insensitive substring in URL fields
- [x] Entries with missing property values are excluded when that filter is active
- [x] Sort dropdown applies across table, list, card, and board views
- [x] Table column header clicks update the sort dropdown state
- [x] Filters and sort persist after navigating away and returning
- [x] Filter pills display for new filter types with clear buttons
- [x] "Clear all" resets all filters including new types
- [x] All 501 tests pass, 0 type errors, 0 lint errors
