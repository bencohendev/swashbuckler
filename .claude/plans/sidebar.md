# Sidebar

**Status: Done**

## Overview

Notion-style hierarchical sidebar with collapsible type sections and drag-and-drop reordering.

## Decisions

| Area | Decision |
|------|----------|
| Style | Notion-style hierarchical tree |
| Nesting | 3 levels max |
| Reordering | Drag-and-drop for types |
| Navigation | Home, Graph, Trash, Settings |
| Space switcher | Dropdown in sidebar header |

## Implementation

- `src/features/sidebar/components/Sidebar.tsx` — main sidebar with navigation
- `src/features/sidebar/components/TypeSection.tsx` — collapsible type sections with entries
- `src/features/sidebar/components/SpaceSwitcher.tsx` — space switching dropdown
- `src/features/sidebar/components/CreateSpaceDialog.tsx` — space creation modal
- `src/shared/stores/sidebar.ts` — Zustand store for collapsed state with localStorage persistence
- React DnD for drag-and-drop type reordering

## Collapsible Sidebar

- Toggle button in sidebar header: `PanelLeftClose` (expanded) / `PanelLeftOpen` (collapsed)
- Collapsed width: `w-12` (48px); Expanded width: `w-64` (256px)
- Collapsed view shows: expand button, nav icons (Home, Graph, Settings) stacked vertically, Trash icon
- Expanded view: full sidebar content with collapse button in header
- Width transition: `transition-[width] duration-200`
- Keyboard shortcut: `Cmd/Ctrl + \`
- State persisted in `localStorage('swashbuckler:sidebarCollapsed')`

## Context Menu

Right-click context menu on type sections in the sidebar.

- Uses Radix `ContextMenu` primitive directly (from `radix-ui` package, no separate shadcn component needed)
- Wraps type header row in `<ContextMenu.Root>` / `<ContextMenu.Trigger>`
- Menu items:
  - **View all {plural_name}** → navigates to `/types/[slug]`
  - **Edit type** → navigates to `/settings/types`
  - **Separator**
  - **Delete type** (destructive) → `window.confirm()` then `objectTypes.delete(id)`
- For built-in types: only shows "View all"

## Loading Behavior

- No all-or-nothing skeleton gate — sections render progressively as their data arrives
- TanStack Query caching means subsequent visits render instantly from cache
- `<hr>` separators only render when the preceding section has visible content (no stacked dividers)
- Pinned, Recent, and Tags sections return `null` when empty (separators guard against layout jumps)

## Verification

- [x] Hierarchical tree renders entries by type
- [x] Expand/collapse type sections
- [x] Drag to reorder types
- [x] Navigation links work (Home, Graph, Trash, Settings)
- [x] Space switcher shows all spaces
- [x] "Shared with you" section for shared spaces
- [x] Right-click type in sidebar shows context menu
- [x] "View all" navigates to type table page
- [x] Edit/delete actions work from context menu
- [x] Built-in types only show "View all"
- [x] Collapse button shrinks sidebar to icon rail
- [x] Expand button restores full sidebar
- [x] Collapsed state persists across page refresh
- [x] Cmd/Ctrl+\ keyboard shortcut toggles sidebar
- [x] Navigation icons work in collapsed mode
