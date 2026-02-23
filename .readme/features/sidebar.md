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

- On initial load (before any TanStack Query cache), a `SidebarSkeleton` renders in place of the real content — skeleton mimics section headers + indented item rows to prevent content jumps
- `sidebarLoading` is derived from `objectsLoading || typesLoading || pinsLoading || tagsLoading`
- `DraggableTypeSection` passes `objectsLoading` through to `TypeSection.isLoading` for per-section ObjectList skeletons
- TanStack Query caching means subsequent visits render instantly from cache (no skeleton)
- `<hr>` separators only render when the preceding section has visible content (no stacked dividers)
- Pinned, Recent, and Tags sections return `null` when empty (separators guard against layout jumps)

## Empty State

- When `filteredOrderedTypes.length === 0` and not loading, shows centered "No types yet" message with hint text above the "New Type" button

## Optimistic Active State

### Problem
Clicking sidebar items has a perceived delay — the active highlight only appears after the Next.js route transition completes because it's driven by `usePathname()`. PinnedSection and RecentSection also never highlight their items (missing `isActive` prop).

### Approach
Track a `pendingPath` in the sidebar Zustand store. `SidebarLink` component wraps `<Link>` and immediately highlights on click (before the route change). Clears `pendingPath` when `pathname` updates. Also prefetches object data via TanStack Query on hover.

### Key files
- `src/shared/stores/sidebar.ts` — `pendingPath` / `setPendingPath`
- `src/features/sidebar/components/SidebarLink.tsx` — wraps `<Link>` with optimistic active state + hover data prefetch
- `src/features/sidebar/components/Sidebar.tsx` — uses SidebarLink for nav items + trash, clears pendingPath on pathname change
- `src/features/objects/components/ObjectItem.tsx` — uses SidebarLink in compact mode (self-determining active state)
- `src/features/objects/components/ObjectList.tsx` — removed `isActive`/`usePathname` (SidebarLink handles it)
- `src/features/tags/components/TagsSection.tsx` — uses SidebarLink with active styling

## Expand/Collapse All Sections

Two icon buttons in a toolbar row above the first section (inside the scrollable content area):
- **Expand all** (`ChevronsUpDownIcon`) — expands every collapsible section (Pinned, Types, Recent, Tags)
- **Collapse all** (`ChevronsDownUpIcon`) — collapses every collapsible section

### How it works

Each section keeps its own local `collapsed` state via the shared `useCollapsible` hook (`src/features/sidebar/hooks/useCollapsible.ts`). The `Sidebar` parent emits a `CollapseSignal` object `{ collapsed: boolean, key: number }` on button click. Each section watches for `key` changes and syncs its local state accordingly. Individual toggles still work after a bulk action.

### Key files
- `src/features/sidebar/types.ts` — `CollapseSignal` interface
- `src/features/sidebar/hooks/useCollapsible.ts` — shared hook replacing duplicated `useState`/`useEffect` pattern
- `src/features/sidebar/components/Sidebar.tsx` — toolbar buttons and signal state

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
- [x] Expand all button expands all sections
- [x] Collapse all button collapses all sections
- [x] Individual toggles still work after bulk action
- [x] Section states persist to localStorage after bulk action
