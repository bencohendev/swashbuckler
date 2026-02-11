# Type Table Pages

**Status: Not started**

## Overview

Dedicated pages for each object type at `/types/[slug]` showing all instances in a sortable data table with columns for title, property fields, and tags.

## Decisions

| Area | Decision |
|------|----------|
| Route | `/types/[slug]` under `(main)` layout |
| View | Sortable data table (not cards or simple list) |
| Columns | Title + one per type field (by sort_order) + Tags |
| Sorting | Client-side, click column headers |
| Navigation | Click row to go to `/objects/[id]` |

## Implementation

### Route — `src/app/(main)/types/[slug]/page.tsx`
- Receives `slug` param, renders `<TypeTableView slug={slug} />`

### Components — `src/features/table-view/components/`

**`TypeTableView.tsx`** — container
- Resolves type by slug via `useObjectTypes()` + `.find(t => t.slug === slug)`
- Loads objects via `useObjects({ typeId: type.id, isDeleted: false })`
- Batch-loads tags via `dataClient.tags.getTagsForObjects(objectIds)`
- Passes data to `TypeDataTable`

**`TypeDataTable.tsx`** — sortable table
- Columns: Title + one per `type.fields` (sorted by `sort_order`) + Tags
- Client-side sorting via `useState<{ column: string, direction: 'asc' | 'desc' } | null>`
- Rows are clickable via `router.push(/objects/${obj.id})`
- Uses shadcn-style `<table>` with Tailwind classes

**`PropertyCell.tsx`** — renders a single property value based on field type
- `text` — truncated string
- `number` — right-aligned, `toLocaleString()`
- `date` — `Intl.DateTimeFormat`
- `checkbox` — check icon or dash
- `select` — small badge
- `multi_select` — row of small pills
- `url` — truncated clickable link

**`SortableHeader.tsx`** — clickable column header with sort arrow indicator

## Verification

- [ ] Navigate to `/types/page` and see all Page objects
- [ ] Custom type slugs work (e.g. `/types/task`)
- [ ] Property columns render correct values for each field type
- [ ] Sorting works on title, property columns, and tags
- [ ] Click row navigates to `/objects/[id]`
- [ ] Tags column shows tag badges
- [ ] Unknown slug shows "Type not found" error state
- [ ] `npm run build` passes
