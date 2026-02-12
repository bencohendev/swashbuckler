# Search

**Status: Done**

## Overview

Global full-text search with Cmd+K shortcut, searching entry names and content with type filtering.

## Decisions

| Area | Decision |
|------|----------|
| Trigger | Cmd+K keyboard shortcut |
| Scope | Entry names + body content |
| Filtering | By type |
| Navigation | Arrow keys + Enter |
| UI | Dialog overlay |

## Implementation

- `src/features/search/components/GlobalSearchDialog.tsx` — search dialog with keyboard navigation
- `src/features/search/hooks/useGlobalSearch.ts` — search logic
- `src/features/search/lib/extractText.ts` — extract plain text from Plate.js content for searching
- Integrated in Header component

## Verification

- [x] Cmd+K opens search
- [x] Search finds entries by name
- [x] Search finds content in body
- [x] Type filtering works
- [x] Keyboard navigation (arrow keys, enter)
- [x] Navigate to selected entry
