# Sidebar

**Status: Done**

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

## Verification

- [x] Hierarchical tree renders objects by type
- [x] Expand/collapse type sections
- [x] Drag to reorder object types
- [x] Navigation links work (Home, Graph, Trash, Settings)
- [x] Space switcher shows all spaces
- [x] "Shared with you" section for shared spaces
