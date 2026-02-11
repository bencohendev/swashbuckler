# Sidebar

**Status: Partial** (context menu planned)

## Overview

Notion-style hierarchical sidebar with collapsible type sections and drag-and-drop reordering.

## Decisions

| Area | Decision |
|------|----------|
| Style | Notion-style hierarchical tree |
| Nesting | 3 levels max |
| Reordering | Drag-and-drop for object types |
| Navigation | Home, Graph, Trash, Settings |
| Space switcher | Dropdown in sidebar header |

## Implementation

- `src/features/sidebar/components/Sidebar.tsx` — main sidebar with navigation
- `src/features/sidebar/components/TypeSection.tsx` — collapsible type sections with objects
- `src/features/sidebar/components/SpaceSwitcher.tsx` — space switching dropdown
- `src/features/sidebar/components/CreateSpaceDialog.tsx` — space creation modal
- React DnD for drag-and-drop type reordering

## Context Menu (planned)

Right-click context menu on type sections in the sidebar.

### Install
- `npx shadcn@latest add context-menu` -> `src/shared/components/ui/ContextMenu.tsx`

### Update `src/features/sidebar/components/TypeSection.tsx`
- Wrap type header row in `<ContextMenu>` / `<ContextMenuTrigger>`
- Menu items:
  - **View all {plural_name}** -> navigates to `/types/[slug]`
  - **Edit type** -> navigates to `/settings/types` (or opens edit dialog)
  - **Separator**
  - **Delete type** -> confirmation dialog, then `objectTypes.delete(id)`
- For built-in types: only show "View all", hide edit/delete

## Verification

- [x] Hierarchical tree renders objects by type
- [x] Expand/collapse type sections
- [x] Drag to reorder object types
- [x] Navigation links work (Home, Graph, Trash, Settings)
- [x] Space switcher shows all spaces
- [x] "Shared with you" section for shared spaces
- [ ] Right-click type in sidebar shows context menu
- [ ] "View all" navigates to type table page
- [ ] Edit/delete actions work from context menu
- [ ] Built-in types only show "View all"
