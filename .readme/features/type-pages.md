# Type Table Pages

**Status:** Done

## Search & Filter

Type pages include a search bar and structured filter popover between the header and view content. All filtering is client-side — views receive pre-filtered data with no changes to their internal logic.

### Search
- Text input with search icon, searches title only (case-insensitive `includes`)
- Escape key clears the search and blurs the input

### Filters
- Radix Popover triggered by a "Filter" button with badge count
- Sections for each filterable field type:
  - **select / multi_select** — checkboxes for each option value
  - **checkbox** — Any / Yes / No toggle buttons (`aria-pressed`)
  - **tags** — checkboxes with `TagBadge` for each space tag
- All filters combine with AND logic
- "Clear all" button when any filter is active

### Filter Pills
- Active filters shown as removable badge pills below the search bar
- Each pill has a remove button with `aria-label="Remove filter: {description}"`

### Result Count
- Header count shows `"X of Y"` when filtered, `"Y"` otherwise
- `aria-live="polite"` region announces count changes for screen readers

### Empty Filtered State
- When filters match no entries: "No {plural_name} match your filters" with "Clear filters" link
- Replaces the view entirely (no empty table/list/card grid)

### Implementation Files
- `lib/filterObjects.ts` — pure filter logic (`TypePageFilters`, `EMPTY_FILTERS`, `isFiltered`, `filterObjects`)
- `components/TypePageFilterBar.tsx` — search input, filter popover, filter pills, live region
- Tag fetching lifted from `TypeDataTable` to `TypeTableView` (passed down as `tagsByObject` prop)

## Overview

Dedicated pages for each type at `/types/[slug]` showing all instances in table, list, or card views with a persistent toggle. The table view has sortable columns for title, property fields, and tags.

## Decisions

| Area | Decision |
|------|----------|
| Route | `/types/[slug]` under `(main)` layout |
| Views | Table (default), list, and card — toggled via segmented control |
| View persistence | Per-type slug in localStorage (`swashbuckler:typeViewMode`) via Zustand store |
| Columns (table) | Title + one per type field (by sort_order) + Updated (tags deferred) |
| Sorting | Table: client-side click column headers. List/card: `updated_at` descending |
| Navigation | Click row/card to go to `/objects/[id]` |

## Implementation

### Route — `src/app/(main)/types/[slug]/page.tsx`
- Receives `slug` param, renders `<TypeTableView slug={slug} />`

### Components — `src/features/table-view/components/`

**`TypeTableView.tsx`** — container
- Resolves type by slug via `useObjectTypes()` + `.find(t => t.slug === slug)`
- Loads objects via `useObjects({ typeId: type.id, isDeleted: false })`
- Renders `ViewToggle` in header and conditionally renders `TypeDataTable`, `TypeListView`, or `TypeCardView`
- List/card modes sort objects by `updated_at` descending

**`TypeDataTable.tsx`** — sortable table
- Columns: Title + one per `type.fields` (sorted by `sort_order`) + Updated
- Client-side sorting via `useState<{ column: string, direction: 'asc' | 'desc' } | null>`
- Rows are clickable via `router.push(/objects/${obj.id})`
- Semantic `<table>` with Tailwind classes

**`PropertyCell.tsx`** — renders a single property value based on field type
- `text` — truncated string
- `number` — right-aligned, `toLocaleString()`
- `date` — `Intl.DateTimeFormat`
- `checkbox` — check icon or dash
- `select` — small badge
- `multi_select` — row of small pills
- `url` — truncated clickable link

**`SortableHeader.tsx`** — clickable column header with sort arrow indicator

### View Modes — `src/features/table-view/`

**`stores/viewMode.ts`** — Zustand store
- Persists `Record<string, ViewMode>` in localStorage (`swashbuckler:typeViewMode`)
- Each type slug has an independent mode: `'table' | 'list' | 'card'`
- Default: `'table'`
- `useViewMode(slug)` hook returns `{ mode, setMode }`

**`lib/extractPlainText.ts`** — content preview utility
- Walks Plate.js `Value` tree collecting text nodes
- Skips `img`, `code_block`, `table` nodes
- Adds spaces between top-level blocks
- Early-exits at `maxLength` (default 120), appends `…` if truncated

**`components/ViewToggle.tsx`** — segmented control
- Three icon buttons: Table, List, Grid (lucide-react)
- Active button gets `bg-background shadow-sm`, inactive gets muted styling

**`components/TypeCardView.tsx`** — card grid
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Cards show: cover image (if set, `h-32 object-cover`), icon + title, content preview (`line-clamp-2`), updated date
- Empty state: centered "No {plural_name} yet"

**`components/TypeListView.tsx`** — list rows
- Rows inside `rounded-lg border divide-y`
- Each row: icon, title, content preview (80 chars), date
- Preview hidden on small screens (`hidden sm:inline`)
- Empty state same pattern as card view

## Verification

- [x] Navigate to `/types/page` and see all Page entries
- [x] Custom type slugs work (e.g. `/types/task`)
- [x] Property columns render correct values for each field type
- [x] Sorting works on title and property columns
- [x] Click row navigates to `/objects/[id]`
- [ ] Tags column shows tag badges (deferred — tags feature not yet implemented)
- [x] Unknown slug shows "Type not found" error state
- [x] View toggle switches between table, list, and card views
- [x] View mode persists per type slug in localStorage
- [x] Card view shows cover image, icon, title, content preview, date
- [x] List view shows icon, title, content preview, date
- [x] Empty state shows "No X yet" in all three views
- [x] `npm run build` passes
- [ ] Search filters entries by title across all views
- [ ] Select/multi_select filters narrow entries by property values
- [ ] Checkbox filter toggles between Any/Yes/No
- [ ] Tag filter narrows entries by tag
- [ ] Combined filters use AND logic
- [ ] Filter pills appear and are individually removable
- [ ] "Clear all" resets all filters
- [ ] Empty filtered state shows message with "Clear filters" link
- [ ] Header count shows "X of Y" when filtered
- [ ] Keyboard navigation works in filter popover (Escape to close)
- [ ] `aria-live` announces result count changes
