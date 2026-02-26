# Advanced Filtering

**Status: Done**

## Overview

Expression-tree-based filter system for type pages with rich operators per field type, OR logic via filter groups (DNF), relation filters, system date filtering (created_at/updated_at), and a Notion-style row-based UI.

## Architecture

### Expression Tree Model

Filters use a `FilterExpression` structure in Disjunctive Normal Form (DNF):

```
FilterExpression
├── search: string (global title search, AND'd with groups)
└── groups: FilterGroup[] (OR'd together)
    └── conditions: FilterCondition[] (AND'd together)
        ├── target: FilterFieldTarget (property | system | title | tag | relation)
        ├── operator: string (per-type operators)
        └── value / value2: unknown
```

All types are plain JSON-serializable — no Sets, Maps, or class instances.

### Operator Registry

Single source of truth mapping field types to available operators:

| Field Type | Operators | Count |
|---|---|---|
| text, url, title | contains, does_not_contain, equals, not_equals, starts_with, ends_with, is_empty, is_not_empty | 8 |
| number | eq, neq, gt, lt, gte, lte, is_empty, is_not_empty | 8 |
| date, system_date | is, is_before, is_after, is_on_or_before, is_on_or_after, is_between, is_empty, is_not_empty | 8 |
| select | is, is_not, is_empty, is_not_empty | 4 |
| multi_select | contains, does_not_contain, is_empty, is_not_empty | 4 |
| checkbox | is_checked, is_not_checked | 2 |
| tag | contains, does_not_contain, is_empty (has no tags), is_not_empty (has tags) | 4 |
| relation | links_to, links_to_type, has_links, has_no_links | 4 |

### Filter Logic

- **Search**: Global title substring filter, AND'd with group conditions
- **Within a group**: Conditions use AND logic
- **Between groups**: Groups use OR logic (DNF)
- **Empty groups**: Auto-removed when last condition is deleted

### Relation Filters

- **links_to**: Object has a relation (source or target) to a specific entry
- **links_to_type**: Object has a relation to any entry of a given type
- **has_links**: Object has at least one relation
- **has_no_links**: Object has no relations

### System Date Fields

`created_at` and `updated_at` are available as filterable fields with all date operators.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Expression model | DNF (AND-groups OR'd together) | Matches Notion's filter model; intuitive "any of these groups" semantics |
| Persistence | Zustand + localStorage, new key `swashbuckler:filterExpression:v2` | Clean break from old Set-based format; no migration needed |
| Serialization | Plain JSON (no serialize/deserialize) | FilterExpression is already JSON-serializable |
| Date comparison | ISO string YYYY-MM-DD lexicographic | Same as previous; all dates stored as ISO strings |
| Text matching | Case-insensitive | Consistent with title search |
| Relation data | Shared TanStack Query cache with graph (`['relations', 'all', spaceId]`) | Avoids duplicate network requests |
| UI pattern | Notion-style row builder in popover | More scalable than type-grouped sections; supports arbitrary condition combinations |

## Implementation

| File | Purpose |
|------|---------|
| `src/features/table-view/lib/filterTypes.ts` | `FilterExpression`, `FilterGroup`, `FilterCondition`, `FilterFieldTarget` types + immutable helper functions |
| `src/features/table-view/lib/operatorRegistry.ts` | Operator definitions per field type, `getOperators()`, `getDefaultOperator()`, `operatorNeedsValue()`, `getOperatorLabel()` |
| `src/features/table-view/lib/filterObjects.ts` | `filterObjects()` evaluation engine with `FilterContext`, re-exports from filterTypes |
| `src/features/table-view/lib/sortObjects.ts` | Sort logic (unchanged) |
| `src/features/table-view/stores/filterConfig.ts` | Zustand store for persisted `FilterExpression` per type slug |
| `src/features/table-view/stores/sortConfig.ts` | Sort config store (unchanged) |
| `src/features/table-view/components/TypePageFilterBar.tsx` | Composition root: search + sort + filter builder + pills + live region |
| `src/features/table-view/components/FilterBuilder.tsx` | Notion-style row builder popover content |
| `src/features/table-view/components/FilterConditionRow.tsx` | Single condition row: [Where/and] [field] [operator] [value] [x] |
| `src/features/table-view/components/FilterValueInput.tsx` | Polymorphic value input based on field type + operator |
| `src/features/table-view/components/FilterPills.tsx` | Active filter pills with operator labels |
| `src/features/table-view/components/SortPopover.tsx` | Extracted sort UI (field picker + direction toggle) |
| `src/features/table-view/components/TypeTableView.tsx` | Wires FilterExpression, useAllRelations, builds FilterContext |
| `src/features/relations/hooks/useAllRelations.ts` | Bulk-loads all relations, shares cache with graph hook |

## Verification

- [x] Every operator for every field type works correctly (~42 operator tests)
- [x] AND within groups, OR between groups
- [x] Empty/null handling for all types
- [x] System date fields (created_at, updated_at) filterable
- [x] Title as a filterable field (not just search)
- [x] Relation filters (links_to, links_to_type, has_links, has_no_links)
- [x] hasActiveFilters() function
- [x] Search + expression combination
- [x] Filter store round-trip persistence, multiple slugs, clean reset
- [x] Operator registry: correct counts, defaults, labels, needsValue flags
- [x] All 555 tests pass, 0 type errors
