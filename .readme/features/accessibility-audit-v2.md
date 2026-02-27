# Accessibility Audit v2

**Status:** Active

## Overview

Fresh accessibility pass building on the completed [Accessibility Audit & Remediation](accessibility.md). Focuses on areas not covered in v1: automated testing infrastructure, keyboard navigation completeness, screen reader testing, color contrast across all themes (including custom themes), motion preferences, touch targets, and zoom/reflow behavior.

## Scope

### In Scope
- Automated testing setup (axe-core integration, Lighthouse CI)
- Keyboard navigation completeness (every interactive element reachable)
- Screen reader testing (VoiceOver on macOS, NVDA reference)
- Focus management in dynamic UI (modals, drawers, toasts, dropdowns)
- Color contrast across all themes (light, dark, custom)
- Motion preferences (`prefers-reduced-motion`)
- Touch targets (minimum 44x44px)
- Zoom and reflow (up to 200% zoom, 320px reflow)
- New features added after v1 (board view, archive, todo blocks, image resize, etc.)

### Out of Scope (covered in v1)
- Skip-to-content link (implemented)
- Icon button labels (implemented)
- Sidebar collapsible sections and mobile drawer (implemented)
- Dialog/modal focus trapping (implemented)
- Live regions for save/error states (implemented)
- Table view column headers and sorting (implemented)
- Form label associations (implemented)
- Graph and search ARIA roles (implemented)

## Audit Areas

### 1. Automated Testing Infrastructure

**Checks:**
- axe-core integration in test suite (vitest + @axe-core/react or similar)
- Automated accessibility checks on key pages (dashboard, editor, type page, settings)
- Lighthouse CI accessibility score baseline
- ESLint accessibility plugin (eslint-plugin-jsx-a11y) configured and passing
- CI pipeline integration for automated checks

**Key Files:**
- `apps/web/tests/` — test directory
- `apps/web/vitest.config.ts` — test config
- `.eslintrc` / `eslint.config.js` — lint config
- `package.json` — testing dependencies

**Pass Criteria:**
- axe-core tests run on at least 5 key pages
- Zero critical or serious axe violations
- jsx-a11y ESLint plugin active with no suppressed errors

### 2. Keyboard Navigation

**Checks:**
- Tab order logical on every page (left-to-right, top-to-bottom)
- All interactive elements focusable (buttons, links, inputs, toggles)
- Custom components (dropdowns, color pickers, emoji picker) keyboard-accessible
- Escape closes modals/drawers/dropdowns
- Enter/Space activates buttons and links
- Arrow keys navigate lists, menus, tabs, and tree views
- Board view (kanban) keyboard navigation
- Block side menu keyboard access
- Image resize handles keyboard-accessible
- No keyboard traps (can always Tab out)

**Key Files:**
- `src/features/sidebar/` — tree navigation
- `src/features/editor/` — editor blocks, menus
- `src/features/board-view/` (if exists) — kanban board
- `src/shared/components/` — shared interactive components

**Pass Criteria:**
- Every feature usable without a mouse
- Focus visible on all interactive elements
- No keyboard traps in any view

### 3. Screen Reader Testing

**Checks:**
- Page landmarks (header, nav, main, complementary)
- Heading hierarchy (h1 → h2 → h3, no skipped levels)
- Image alt text (cover images, uploaded images, avatars)
- Dynamic content announcements (toast notifications, live save status)
- Form field announcements (labels, descriptions, errors)
- Table announcements (caption, headers, sort state)
- Sidebar tree structure announcements
- Editor block type announcements
- Loading state announcements

**Key Files:**
- `src/app/(main)/layout.tsx` — landmarks
- `src/features/toast/` — toast announcements
- `src/features/editor/` — editor elements
- All page-level components

**Pass Criteria:**
- VoiceOver can navigate and operate all features
- All dynamic state changes announced
- No "unlabeled" elements in VoiceOver rotor

### 4. Focus Management

**Checks:**
- Modal open → focus moves to modal
- Modal close → focus returns to trigger
- Drawer open/close → focus management
- Toast notifications → don't steal focus
- Route navigation → focus moves to main content or heading
- Delete confirmation → focus moves to dialog
- Inline editing (rename) → focus management
- Dropdown menus → focus trapped while open
- Quick capture dialog (Cmd+E) → focus management
- Search dialog (Cmd+K) → focus management

**Key Files:**
- `src/shared/components/` — dialog, drawer, dropdown primitives
- `src/features/search/` — search dialog
- `src/features/quick-capture/` — quick capture dialog
- `src/features/toast/` — toast system

**Pass Criteria:**
- Focus never lost (no focus on `<body>` after interaction)
- Focus always moves to a meaningful element
- Focus restoration works after all overlay dismissals

### 5. Color Contrast

**Checks:**
- Text contrast meets WCAG AA (4.5:1 normal, 3:1 large text)
- UI component contrast (3:1 against adjacent colors)
- Focus indicator contrast (3:1 against adjacent)
- Light theme contrast
- Dark theme contrast
- Custom themes: validation that user-created themes meet contrast requirements
- Disabled state contrast (still readable, distinguished from enabled)
- Graph node/edge contrast
- Editor syntax highlighting contrast

**Key Files:**
- `src/features/theme/` — theme definitions
- `src/features/custom-themes/` (if exists) — custom theme system
- `tailwind.config.ts` — color tokens
- `src/app/globals.css` — CSS custom properties

**Pass Criteria:**
- All text passes AA contrast in light and dark themes
- Custom theme creation warns when contrast is insufficient
- Focus indicators visible in all themes

### 6. Motion Preferences

**Checks:**
- `prefers-reduced-motion` media query respected
- Animations/transitions disabled or reduced when preference set
- Loading spinners still visible (animation ≠ rotation)
- Page transitions reduced
- Graph animations optional
- Toast slide-in/out reduced
- No essential information conveyed only through animation

**Key Files:**
- `src/app/globals.css` — global animations
- `tailwind.config.ts` — animation config
- `src/features/graph/` — graph animations
- `src/features/toast/` — toast animations
- `src/features/loading/` — loading indicators

**Pass Criteria:**
- Setting `prefers-reduced-motion: reduce` eliminates non-essential motion
- No information lost when motion is reduced
- Loading states still communicate progress

### 7. Touch Targets

**Checks:**
- All interactive elements at least 44x44px touch target
- Spacing between adjacent targets sufficient (no accidental taps)
- Icon buttons have adequate touch target (even if icon is smaller)
- Sidebar items adequate touch target on mobile
- Editor toolbar buttons on mobile
- Table row actions on mobile
- Board view card drag handles on mobile

**Key Files:**
- `src/features/mobile/` (if exists) — mobile layout
- `src/shared/components/` — button/link primitives
- `src/features/sidebar/` — sidebar items

**Pass Criteria:**
- No touch target smaller than 44x44px on mobile
- Adjacent targets have at least 8px spacing
- Touch targets meet WCAG 2.2 Level AA (Target Size)

### 8. Zoom & Reflow

**Checks:**
- Content reflows at 320px width (no horizontal scrolling)
- Text scales to 200% without loss of content or functionality
- No fixed-width containers that break at small viewports
- Images and media scale appropriately
- Sidebar responsive behavior at zoomed viewports
- Editor usable at 200% zoom
- Tables horizontally scrollable (not clipped)
- Modals/dialogs fit in zoomed viewport

**Key Files:**
- `src/app/(main)/layout.tsx` — responsive layout
- `src/features/editor/` — editor layout
- `src/features/sidebar/` — sidebar responsive
- `tailwind.config.ts` — breakpoints

**Pass Criteria:**
- No horizontal scroll at 320px viewport width
- All content and functionality available at 200% zoom
- Text wraps, doesn't overflow or get clipped

### 9. Features Added After v1

**Checks:**
- Board view: card focus, drag accessible alternative, column headers
- Todo blocks: checkbox keyboard toggle, checked state announced
- Image resize: keyboard-accessible resize handles
- Archive: archived state announced, restore action accessible
- Block side menu: keyboard-accessible, menu items announced
- Toast notifications: `role="status"` or `role="alert"` as appropriate
- Template section in type settings: accessible form controls
- Advanced filtering: filter controls keyboard-accessible
- Type starter kits: selection keyboard-accessible
- Saved views: view switcher accessible

**Key Files:**
- `src/features/board-view/` (if exists)
- `src/features/editor/components/` — todo, image, block menu
- `src/features/archive/` (if exists)
- `src/features/toast/`
- Various feature directories

**Pass Criteria:**
- All post-v1 features meet same accessibility standard as v1 remediated features
- No regressions in previously fixed areas

## Methodology

1. Automated scanning: axe-core on all key pages, Lighthouse accessibility audit
2. Manual keyboard testing: Tab through every page, operate every control
3. Screen reader testing: VoiceOver walkthrough of key flows (create entry, edit, navigate, share)
4. Visual inspection: contrast checker on all theme combinations
5. Responsive testing: zoom to 200%, resize to 320px width
6. Regression check: verify all v1 fixes still in place

## Deliverables

- axe-core test suite added to CI
- Findings table with WCAG criterion, severity, affected component
- Fix PRs for all Level A and AA violations
- Contrast validation tool for custom themes
- Updated spec with final results
