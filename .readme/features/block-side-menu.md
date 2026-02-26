# Block Side Menu

**Status:** Done

## Overview

Notion-style hover handle in the left gutter of the editor that provides quick block actions: insert above/below, duplicate, and delete. Also serves as an escape hatch for "trapped" blocks (code blocks, tables, private blocks) where normal cursor navigation is limited.

## Approach — Single Floating Handle

One `BlockSideMenu` component rendered as a sibling to `PlateContent` inside `<Plate>`. Tracks the mouse position and positions itself at the left edge of whichever top-level block is hovered. This avoids modifying any of the 15+ element components.

Follows the same patterns as:
- `RemoteCursorOverlay.tsx` — absolute overlay inside `<Plate>`, uses `DOMEditor` from `slate-dom` directly (avoiding the dual-package WeakMap issue), RAF-throttled updates
- `Table.tsx` — hover state + `DropdownMenu` (Radix) staying visible while menu is open

## New Files

### 1. `apps/web/src/features/editor/hooks/useHoveredBlock.ts`

Hook that tracks which top-level block the mouse is over.

- Attach `mousemove` listener to editor DOM element (via `DOMEditor.toDOMNode(editor, editor)` from `slate-dom` — same `@ts-expect-error` pattern as RemoteCursorOverlay)
- On mousemove: walk up from `event.target` via `closest('[data-slate-node="element"]')` until finding a node whose parent is the editor element (= top-level block)
- Convert DOM node to Slate element via `DOMEditor.toSlateNode` + `DOMEditor.findPath`
- Compute rect relative to editor container via `getBoundingClientRect` subtraction
- Throttle with `requestAnimationFrame`, skip processing if hovered DOM node unchanged
- Return `{ element, path, rect }` or `null`
- Clear on `mouseleave` from editor element

### 2. `apps/web/src/features/editor/components/BlockSideMenu.tsx`

Floating handle component with dropdown menu.

- Guards: return `null` if `useReadOnly()` or `useIsMobile()`
- Uses `useHoveredBlock()` for position tracking
- When dropdown opens, locks to current block position (stored in ref) so handle stays put even if mouse moves
- Renders absolutely positioned `GripVertical` button at `top: rect.top`, `left: -36px` (in the page padding gutter — ObjectEditor has `p-4`/`p-6` on its `<main>`)
- `contentEditable={false}` wrapper to prevent Slate interference
- `DropdownMenu` with items:
  - **Insert above** — `editor.tf.insertNodes({ type: 'p', children: [{ text: '' }] }, { at: path })` + focus
  - **Insert below** — insert at `[...path.slice(0,-1), path.at(-1)! + 1]` + focus
  - **Duplicate** — deep clone element, strip `id` fields (so NodeIdPlugin assigns fresh ones for Yjs safety), insert below
  - **Delete** — `editor.tf.removeNodes({ at: path })`
- Smooth fade via `transition-opacity duration-150`

## Modified Files

### 3. `apps/web/src/features/editor/components/Editor.tsx`

- Import `BlockSideMenu`
- Render `<BlockSideMenu />` inside `<Plate>` in both `SoloEditor` and `CollaborativeEditor`

## Key Details

- **Gutter space**: ObjectEditor wraps editor in `<main className="p-4 md:p-6">`. The handle at `left: -36px` sits comfortably in this padding. The editor's `<div className="relative">` provides the positioning context.
- **DOMEditor import**: Must use top-level `slate-dom` (v0.123.0), NOT `@udecode/slate`'s nested copy — same dual-package issue documented in RemoteCursorOverlay
- **Yjs safety**: Duplicate action strips all `id` fields from cloned nodes so NodeIdPlugin generates fresh IDs
- **Mobile**: Hidden entirely via `useIsMobile()` guard
- **Accessibility**: `aria-label="Block options"` on trigger, Radix DropdownMenu provides keyboard nav

## Verification

- `cd apps/web && npx vitest run`
- `cd apps/web && npx tsc --noEmit`
- `npm run lint`
- Manual: hover blocks, verify handle appears/hides, test all 4 menu actions, test with tables/code/private blocks, verify hidden in read-only mode and on mobile
