# Type Reorder Keyboard Support

**Status:** Done

## Overview

Up/down chevron buttons on each type row in Settings > Types, providing a keyboard-accessible alternative to sidebar drag-and-drop for reordering types.

## Behavior

- Each type row shows stacked chevron-up / chevron-down buttons on the left side
- Clicking a button swaps the type with its neighbor and persists both `sort_order` values immediately
- The top type's up button and the bottom type's down button are disabled (30% opacity)
- Order changes are reflected everywhere types are listed (sidebar, type pages, etc.)

## Implementation

Single-file change in `ObjectTypeManager.tsx`:

- `handleMoveType(index, direction)` swaps `sort_order` between the two affected types via the existing `update()` hook
- Chevron buttons use `aria-label="Move {name} up/down"` for screen readers
- Follows the same pattern as `FieldBuilder` field reordering
