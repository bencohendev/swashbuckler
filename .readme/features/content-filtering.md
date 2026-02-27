# Content Filtering

**Status: Done**

## Overview

Extends the advanced filtering system to search entry body content, not just properties and title. "Content" appears as a filterable field with text operators, and the search bar also matches against body text. Content is stored as Plate/Slate JSON and extracted to plain text for matching.

## Key Constraint

Table view loads `DataObjectSummary` (excludes `content` for performance). Content is side-loaded via a dedicated `listContent()` data client method only when content filtering is active, following the same pattern as `tagsByObject` and `relationsByObject` in `FilterContext`.

## Architecture

### Content Field Type

A new `content` filter field type with a subset of text operators:

| Operator | Description |
|----------|-------------|
| contains | Body text includes the filter value (case-insensitive) |
| does_not_contain | Body text does not include the filter value |
| is_empty | Entry has no body content |
| is_not_empty | Entry has body content |

Operators like `equals`, `starts_with`, `ends_with` are intentionally excluded — they don't make sense for rich text bodies.

### Search Bar Extension

When content data is loaded (i.e., content filtering is active or search text is non-empty), the search bar matches against both title **OR** content. An entry passes the search filter if either its title or its body text contains the query.

### Side-Loading

- `ObjectsClient.listContent(options)` fetches only `id` and `content` columns
- `useObjectContents(options, enabled)` hook wraps the query, extracts plain text via `extractTextFromContent()`, and returns `Record<string, string>` (id → text)
- Enabled only when `hasContentFilter(expression)` is true or search text is non-empty
- Uses module-level empty record constant to avoid re-render loops

### Filter Context

`contentTextByObject: Record<string, string>` added to `FilterContext`, alongside existing `tagsByObject` and `relationsByObject`.

## Implementation

| File | Purpose |
|------|---------|
| `src/features/table-view/lib/filterTypes.ts` | Added `{ kind: 'content' }` to `FilterFieldTarget` union |
| `src/features/table-view/lib/operatorRegistry.ts` | Added `'content'` to `FilterFieldType`, `CONTENT_OPERATORS` array, registry entry |
| `src/features/table-view/lib/filterObjects.ts` | Added `contentTextByObject` to `FilterContext`, `content` case in evaluation, search+content matching, `hasContentFilter()` helper |
| `src/features/table-view/components/FilterConditionRow.tsx` | Added "Content" field option, `content` case in target mapping |
| `src/features/table-view/components/FilterPills.tsx` | Added `content` case in `getFieldLabel()` |
| `src/features/table-view/components/TypeTableView.tsx` | Wires `useObjectContents`, detects active content filter, passes `contentTextByObject` to context |
| `src/shared/lib/data/types.ts` | Added `listContent()` to `ObjectsClient` interface |
| `src/shared/lib/data/supabase.ts` | Implemented `listContent`: `select('id, content')` with same filters as `list()` |
| `src/shared/lib/data/local.ts` | Implemented `listContent`: fetch from Dexie, map to `{ id, content }` |
| `src/shared/lib/data/queryKeys.ts` | Added `queryKeys.objects.content()` key |
| `src/features/objects/hooks/useObjectContents.ts` | New hook: fetches content, extracts plain text, returns record |
| `src/features/objects/hooks/index.ts` | Re-exports `useObjectContents` |

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Operators | Subset of text operators (no equals/starts_with/ends_with) | Rich text bodies are multi-paragraph; exact match and prefix/suffix are meaningless |
| Side-loading | Separate `listContent()` query, enabled only when needed | Default table loads stay lightweight (no content column) |
| Search behavior | Title OR content match | Users expect search to find entries by content, not just title |
| Text extraction | Reuses existing `extractTextFromContent()` from search feature | Single source of truth for Slate JSON → plain text |

## Verification

- [x] Content `contains` / `does_not_contain` / `is_empty` / `is_not_empty` operators
- [x] Search bar matching content (title miss + content hit = pass)
- [x] Content filter with empty `contentTextByObject` (graceful fallback)
- [x] `hasContentFilter()` utility
- [x] All 577 tests pass, 0 type errors, 0 lint errors
