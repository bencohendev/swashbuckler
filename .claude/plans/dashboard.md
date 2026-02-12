# Dashboard

**Status: Done**

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

## What's Done

- [x] Dashboard page exists
- [x] Recent entries section works
- [x] Pinned section (uses [pins](favorites.md) feature)
