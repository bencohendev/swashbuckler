# Mobile Responsive Design

**Status:** Done

## Context

The app has no mobile support — sidebar is always visible at fixed width, no hamburger menu, no touch-friendly spacing. This plan makes the app usable on phones and tablets (320px through iPad).

## Decisions

- **Breakpoint**: `md:` (768px) is the mobile/desktop boundary
- **Sidebar**: Hamburger drawer overlay on mobile, unchanged on desktop
- **Editor modal**: Full-screen takeover on mobile with back button
- **Approach**: CSS-first (`md:hidden`, responsive Tailwind) with a `useIsMobile` hook for cases where CSS alone isn't enough

## New Files

| File | Purpose |
|------|---------|
| `src/shared/hooks/useIsMobile.ts` | `matchMedia` hook returning boolean, synced to `md:` breakpoint (768px) |

## Modified Files

### Core layout changes

| File | Changes |
|------|---------|
| `src/shared/stores/sidebar.ts` | Add `mobileOpen` + `setMobileOpen` to Zustand store (transient, not persisted) |
| `src/features/sidebar/components/Sidebar.tsx` | On mobile: render as fixed overlay drawer with backdrop. Close on navigation (`pathname` change). Keyboard shortcut toggles `mobileOpen` on mobile instead of `collapsed`. |
| `src/shared/components/layout/Header.tsx` | Add hamburger `MenuIcon` button with `md:hidden`, calls `setMobileOpen(true)` |
| `src/app/(main)/layout.tsx` | Main content padding `p-4 md:p-6` |
| `src/features/objects/components/ObjectEditorModal.tsx` | On mobile: bypass Dialog, render `fixed inset-0` full-screen view with back button |

### Spacing/positioning polish

| File | Changes |
|------|---------|
| `src/features/objects/components/ObjectEditor.tsx` | Responsive padding: `px-4 md:px-6`, `p-4 md:p-6` |
| `src/features/graph/components/GraphFilterPanel.tsx` | Position `top-2 right-2 md:top-9 md:right-9` |
| `src/features/graph/components/GraphLayoutToggle.tsx` | Position `top-2 left-2 md:top-9 md:left-9` |
| `src/features/graph/components/GraphNodeDetail.tsx` | On mobile: full-width bottom card (`bottom-2 left-2 right-2 w-auto`) |
| `src/shared/components/ui/Dialog.tsx` | Content padding `p-4 md:p-6` |
| `src/features/search/components/GlobalSearchDialog.tsx` | Top position `top-[10%] md:top-[20%]` |

### Dialog/form overflow fixes

| File | Changes |
|------|---------|
| `src/features/object-types/components/FieldBuilder.tsx` | FieldRow wraps to two rows on mobile: row 1 = grip + name input (full width), row 2 = type select + required checkbox + delete (indented past grip). Uses `flex flex-wrap` with `w-full sm:w-auto sm:flex-1` grouping. |
| `src/features/sharing/components/ShareSpaceDialog.tsx` | Container: `max-w-[calc(100%-2rem)] sm:max-w-lg`, content padding `p-4 sm:p-6`, header padding `px-4 sm:px-6`. Add-share form: email full-width on mobile, select+button on second row. Share entry rows: wrap to two rows — row 1 = avatar + email + delete, row 2 = permission select + exclusions button (indented `pl-11 sm:pl-0`). |

### Touch targets & component-specific fixes

| File | Changes |
|------|---------|
| `src/features/quick-capture/components/QuickCaptureButton.tsx` | Adjust floating button position to avoid overlap with mobile UI (e.g. `bottom-4 right-4 md:bottom-6 md:right-6`) |
| `src/features/table-view/stores/viewMode.ts` | Default to card view on mobile (use `useIsMobile` or responsive initial value) |
| `src/features/table-view/components/TypeTableView.tsx` | Add horizontal scroll wrapper (`overflow-x-auto`) for table on narrow screens |
| `src/features/sidebar/components/SpaceSwitcher.tsx` | Ensure dropdown doesn't clip inside the mobile drawer (check `z-index`, use portal or `side="bottom"` positioning) |
| Various interactive elements | Audit small icon buttons for 44px minimum touch target (`min-h-11 min-w-11` or `p-2.5` on mobile) |

## Design Details

### Sidebar Drawer (mobile)

The `Sidebar` component checks `useIsMobile()` and renders two different wrappers:

- **Desktop** (unchanged): `<aside>` with `w-64`/`w-12` transition, participates in flex layout
- **Mobile**: `<aside>` wrapped in a `fixed inset-y-0 left-0 z-50` container that slides in/out via `translate-x`. A backdrop `div` with `fixed inset-0 z-40 bg-black/50` sits behind it. Always renders at `w-64` (ignores `collapsed` state).

Close triggers:
- Backdrop click
- Navigation (via `usePathname()` effect)
- `Cmd/Ctrl + \` keyboard shortcut

Body scroll lock: `useEffect` toggles `document.body.style.overflow = 'hidden'` when drawer is open.

Note: `DndProvider` with `HTML5Backend` doesn't support touch. Type section drag-to-reorder won't work on mobile — everything else (expand/collapse, navigation, context menus) still works. Acceptable for initial pass.

### Full-Screen Editor (mobile)

When `useIsMobile()` is true, `ObjectEditorModal` renders a `fixed inset-0 z-50 bg-background` div instead of the Radix Dialog. A header bar with `ArrowLeftIcon` + "Back" button replaces the dialog close. The existing `ObjectEditor` component renders inside with no changes needed (it already uses `flex h-full flex-col`).

### Header Hamburger

A `MenuIcon` button with `md:hidden` in the left slot of the header (currently an empty `<div />`). Calls `setMobileOpen(true)` from the sidebar store.

## Implementation Order

1. Create `useIsMobile` hook
2. Extend sidebar store with `mobileOpen`
3. Sidebar as drawer on mobile + body scroll lock + close on navigate
4. Header hamburger button
5. ObjectEditorModal full-screen on mobile
6. Layout + editor padding adjustments
7. Graph page positioning (filter panel, layout toggle, node detail)
8. Dialog + search dialog adjustments
9. Quick capture button positioning
10. Type pages — default to card view on mobile, horizontal scroll on table view
11. SpaceSwitcher dropdown clipping fix
12. FieldBuilder field-row wrap for mobile
13. ShareSpaceDialog container, form row, and share entry row responsive layout
14. Touch target audit — ensure 44px minimum on interactive elements

## Verification

- Resize browser below 768px — sidebar should disappear, hamburger appears
- Tap hamburger — sidebar draws in from left with backdrop
- Tap a sidebar link — drawer closes, navigates
- Tap backdrop — drawer closes
- Open an entry — full-screen editor with back button (no dialog)
- Graph page — filter/toggle/detail panels positioned closer to edges
- Resize above 768px — everything returns to normal desktop behavior
- `Cmd/Ctrl + \` toggles drawer on mobile, sidebar collapse on desktop
- Quick capture button doesn't overlap with other mobile UI elements
- Type page defaults to card view on mobile; table view scrolls horizontally
- SpaceSwitcher dropdown opens fully inside the mobile sidebar drawer
- Icon buttons and interactive elements are comfortably tappable (44px+)
- Slash menu renders as bottom panel with backdrop on mobile (no keyboard flicker)
- Create Type dialog: field rows wrap cleanly at 375px, all controls accessible and tappable
- Share dialog: add-share form and share entry rows don't overflow at 375px, all controls tappable
