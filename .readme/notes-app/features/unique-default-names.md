# Unique Default Names

**Status:** Done

## Overview
When creating new objects, each gets an incrementing default title instead of duplicating "New {type}".

## Behavior
- First object of a type: `New Page`
- Second: `New Page 2`
- Third: `New Page 3`
- No gap-filling: if "New Page" and "New Page 5" exist, the next is "New Page 6"
- Each type is independent: "New Page 2" doesn't affect "New Note" numbering
- Only non-deleted objects in the current space are considered
- When a user types a custom title (e.g., in the mention input), that title is used instead

## Implementation
- `src/shared/lib/naming.ts` — pure `getNextDefaultName(typeName, existingTitles)` utility
- `src/features/objects/hooks/useNextTitle.ts` — hook that reads current objects and returns a title generator
- Used in: CreateObjectButton, QuickCaptureDialog, Sidebar, SlashInput, MentionInput

## Tests
- `tests/unit/naming.test.ts` — 8 tests covering the pure utility function
