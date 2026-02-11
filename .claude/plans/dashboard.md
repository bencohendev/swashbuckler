# Dashboard

**Status: Partial**

## Overview

Home page showing favorites and recent objects.

## Decisions

| Area | Decision |
|------|----------|
| Sections | Favorites + Recent |
| Location | Home page (`/`) |

## Implementation

- `src/app/(main)/page.tsx` — dashboard layout with Favorites and Recent sections
- `src/features/objects/components/RecentObjects.tsx` — recent objects list

## What's Done

- [x] Dashboard page exists
- [x] Recent objects section works

## What's Left

- [ ] Favorites section (depends on [favorites](favorites.md) feature)
