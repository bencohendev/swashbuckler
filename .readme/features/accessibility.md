# Accessibility Audit & Remediation

**Status:** Done

Comprehensive WCAG 2.1 AA accessibility pass across all features.

## What Was Done

### Phase 1: Global Foundations + Icon Button Labels
- Skip-to-content link in `(main)/layout.tsx`
- `aria-label` on all icon-only buttons in Header (menu, search, theme, avatar)
- `aria-current="page"` on active sidebar nav links
- `aria-label` on icon-only buttons in ObjectEditor, TrashList, TagPageView, ShareSpaceDialog

### Phase 2: Sidebar Collapsible Sections + Mobile Drawer
- `aria-expanded` / `aria-controls` on all collapsible section toggles (TypeSection, RecentSection, PinnedSection, TagsSection)
- Mobile sidebar drawer: `role="dialog"`, `aria-modal`, `aria-label`
- `inert` attribute on collapsed desktop sidebar content
- `aria-busy` + `role="status"` on sidebar skeleton loader

### Phase 3: Dialogs, Modals + Live Regions
- ObjectEditorModal converted to Radix Dialog (focus trap + modal semantics)
- `role="status"` + `aria-live="polite"` on save indicator in ObjectEditor
- `role="alert"` on error messages (PasswordSection, ProfileSection)
- `role="status"` on success/loading states (GraphView, GlobalSearchDialog)

### Phase 4: Table View Accessibility
- `<caption>` on type data tables
- `scope="col"` on `<th>` elements
- `aria-sort` on sortable column headers
- Sort trigger moved from `<th>` to `<button>` inside for keyboard access
- Keyboard-accessible table rows (`tabIndex`, `role="link"`, Enter/Space navigation)

### Phase 5: Forms — Label Association + Error Linking
- `htmlFor`/`id` pairs on ObjectTypeForm inputs (name, plural, slug)
- `aria-label` on icon button, color picker in ObjectTypeForm
- `htmlFor`/`id` on all PropertyFields field types
- `aria-pressed` on multi-select toggles in PropertyFields
- `aria-label` on FieldBuilder inputs (field name, type select, option input, remove)
- `aria-describedby` linking inputs to error messages (ShareSpaceDialog, PasswordSection)

### Phase 6: Graph, Search, Toggles + Color Swatches
- `role="img"` + `aria-label` on GraphCanvas SVG
- `role="region"` + `aria-label` on GraphNodeDetail panel
- `aria-pressed` on GraphFilterPanel filter buttons (mobile + desktop)
- `role="group"` + `aria-label` on GraphLayoutToggle and ViewToggle
- `aria-pressed` on layout/view mode toggle buttons
- `role="listbox"` / `role="option"` / `aria-selected` on GlobalSearchDialog results
- `aria-pressed` on type filter chips in GlobalSearchDialog
- `role="listbox"` / `role="option"` / `aria-selected` on MentionInput
- `role="menu"` / `role="menuitem"` on SlashMenu
- `aria-label` with color names + `aria-pressed` on color swatches in TagPicker and TagPageView

## Deferred Items

Tracked in [index.md](../index.md) Unfinished Features table:
- **Graph keyboard navigation** — Tab/arrow-key navigation through graph nodes
- **Custom confirm dialogs** — Replace `window.confirm()` with Radix AlertDialog
- **Type reorder keyboard support** — Up/down buttons as keyboard alternative to drag-drop
