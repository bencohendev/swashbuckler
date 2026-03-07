# Dashboard

**Status:** Done

## Overview

Home page showing pinned and recent entries.

## Decisions

| Area | Decision |
|------|----------|
| Sections | Pinned + Recent |
| Location | Home page (`/`) |

## Implementation

- `src/app/(main)/page.tsx` — dashboard layout with Pinned and Recent sections
- `src/features/objects/components/RecentObjects.tsx` — recent entries list
- `src/features/pins/components/PinnedObjects.tsx` — pinned entries list

## Empty States

- **Pinned section:** When no entries are pinned, shows a centered PinIcon + "No pinned entries" + hint about the pin icon
- **Recent section:** When no entries exist, shows a centered FileTextIcon + "No entries yet" + hint to create first page
- Both use the `emptyState` prop on `ObjectList` (renders custom JSX instead of plain text)
- Empty states only show after loading completes; during loading, ObjectList shows its standard skeleton

## What's Done

- [x] Dashboard page exists
- [x] Recent entries section works
- [x] Pinned section (uses [pins](favorites.md) feature)
- [x] Visual empty states for both sections
