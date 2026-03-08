# Trash

**Status:** Done

## Overview

Soft delete with restore and permanent delete functionality.

## Decisions

| Area | Decision |
|------|----------|
| Mechanism | Soft delete (`is_deleted` flag + `deleted_at` timestamp) |
| Retention | 30-day (planned) |
| Restore | Full restore to original state |
| Permanent delete | Available from trash UI |

## Implementation

- `src/features/objects/components/TrashList.tsx` — trash UI with restore and permanent delete
- `src/app/(main)/trash/page.tsx` — trash page
- Trash link in sidebar navigation

## Verification

- [x] Delete moves to trash
- [x] Trash page shows deleted items
- [x] Restore from trash works
- [x] Permanent delete works
- [x] Auto-purge after 30 days
