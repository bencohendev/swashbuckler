# Block Side Menu

**Status:** Done

## Overview

Notion-style hover handle in the left gutter of the editor that provides quick block actions: insert above/below, duplicate, delete, move up/down, and drag-to-reorder. Also serves as an escape hatch for "trapped" blocks (code blocks, tables, private blocks) where normal cursor navigation is limited.

## Architecture — `render.aboveNodes` Plugin

A `BlockSideMenuPlugin` using Plate's `render.aboveNodes` wraps each top-level block in a container that includes both the block content and the gutter. Since they share a parent `div`, CSS `group-hover` handles visibility with zero gap — no JS mouse tracking, no timeout hacks.

### Files

- **`apps/web/src/features/editor/plugins/block-side-menu-plugin.tsx`** — `createPlatePlugin` with `render.aboveNodes`. For top-level elements (`path.length === 1`), wraps in `<div className="group relative pl-8">` with `<BlockGutter>` positioned in the left padding. Returns `undefined` for nested elements. `BlockWrapper` component checks `useReadOnly()` and `useIsMobile()` and skips the gutter wrapper in those cases.
- **`apps/web/src/features/editor/components/BlockGutter.tsx`** — Grip handle button + Radix `DropdownMenu` with insert above/below, duplicate, delete. Uses `contentEditable={false}`. Visibility via `opacity-0 group-hover:opacity-100` with override when dropdown is open. Path computed lazily at action time via `editor.children.indexOf(element)`.
- **`apps/web/src/features/editor/lib/plate-config.ts`** — Registers `BlockSideMenuPlugin`.

### Actions

- **Insert above** — `editor.tf.insertNodes({ type: 'p', children: [{ text: '' }] }, { at: path })` + focus
- **Insert below** — insert at `[path[0] + 1]` + focus
- **Duplicate** — deep clone element, strip `id` fields (so NodeIdPlugin assigns fresh ones for Yjs safety), insert below
- **Move up/down** — `editor.tf.moveNodes` for keyboard-accessible reorder (disabled at boundaries)
- **Delete** — `editor.tf.removeNodes({ at: path })`

### Key Details

- **CSS hover over JS tracking**: The wrapper's `group` class makes `group-hover` work on descendants. No `mousemove`/`mouseleave` handlers, no RAF throttling, no timeout hacks.
- **Lazy path computation**: `editor.children.indexOf(element)` runs at action time, not render time. No stale paths if blocks above are added/deleted.
- **Gutter space**: `pl-8` on the `group` wrapper (not on PlateContent) gives 32px of left padding for the gutter. The gutter at `absolute left-0` sits inside the hover zone.
- **Yjs safety**: Duplicate action strips all `id` fields from cloned nodes
- **Mobile**: Hidden — `BlockWrapper` returns bare `<>{children}</>` when `useIsMobile()` is true
- **ReadOnly**: Same — no gutter wrapper in read-only mode
- **Accessibility**: `aria-label="Block options"` on trigger, Radix DropdownMenu provides keyboard nav, Move up/down items for non-drag reorder
- **Drag-to-reorder**: `BlockWrapper` uses `useDraggable({ element })` from `@udecode/plate-dnd`. `previewRef` on the wrapper div makes it both a drop target and drag preview. `handleRef` passed to `BlockGutter`'s grip button as the drag handle. `useDropLine` renders a horizontal indicator at the drop position. `body.dragging` CSS sets `cursor: grabbing` during drag. Dropdown auto-closes when drag starts.
