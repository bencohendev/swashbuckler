# First-Use Tutorial

**Status:** Done

## Context

New users need orientation to discover Swashbuckler's core features. The first-use tutorial is a guided walkthrough that appears automatically on first sign-in, introducing navigation, spaces, types, search, quick capture, the editor, graph view, tags, sharing, and help. Users can restart it anytime from the sidebar help menu or account settings.

## Implementation

### Architecture
- **Feature directory:** `src/features/onboarding/`
- **State management:** Zustand store (`hooks/useTutorial.ts`), persisted in localStorage (`swashbuckler:tutorialCompleted`)
- **Orchestration:** `TutorialController` component mounted in `src/app/providers.tsx`
- **Target binding:** `data-tour="..."` attributes on UI elements throughout the app
- **No external dependencies** — custom-built with React, Zustand, and DOM measurements

### Tutorial Steps

| # | Target | Title | Description |
|---|--------|-------|-------------|
| 0 | — (dialog) | Welcome to Swashbuckler | Welcome dialog with "Take a tour" / "Skip" |
| 1 | `sidebar-nav` | Navigation | Navigate between Home, Graph, and Settings |
| 2 | `space-switcher` | Spaces | Organize work into separate spaces |
| 3 | `type-sections` | Types | Entries are organized by type |
| 4 | `search` | Search | Find anything instantly (Cmd+K) |
| 5 | `quick-capture` | Quick Capture | Capture a quick thought (Cmd+E) |
| 6 | `editor-area` | Editor | Rich text editor — type / for commands, @ to link |
| 7 | `nav-graph` | Graph View | Visualize how entries connect |
| 8 | `tags-section` | Tags | Organize entries with color-coded tags |
| 9 | `space-switcher` | Sharing | Share your space for real-time collaboration |
| 10 | `help-menu` | Help & Shortcuts | Find docs and keyboard shortcuts here |

### Components

- **`WelcomeDialog`** — Centered modal for step 0 with Take a tour / Skip buttons
- **`CoachMark`** — Positioned popover with title, description, step dots, and Next/Back/Skip buttons. Desktop: fixed-position 18rem popover. Mobile: full-width bottom sheet with slide-up animation
- **`SpotlightOverlay`** — SVG `fill-rule: evenodd` overlay that darkens everything except the target element (6px padding, 8px border radius on cutout, 200ms transition)
- **`TutorialController`** — Lifecycle orchestrator: auto-starts for authenticated users after 1s delay, manages sidebar visibility for sidebar-targeted steps, resolves target elements via DOM queries

### State

```typescript
interface TutorialState {
  completed: boolean
  active: boolean
  currentStep: number
  start: () => void
  next: () => void
  back: () => void
  skip: () => void
  complete: () => void
  restart: () => void
}
```

### Behavior
- Auto-starts once for newly authenticated users (1s delay for UI to settle)
- Sidebar auto-expands when coach mark targets a sidebar element, waits 300ms for animation
- If a target element is missing from the DOM, the step is auto-skipped
- Back button disabled on step 1 (can't return to welcome dialog)
- "Next" becomes "Done" on the final step
- Completion persisted in localStorage — revisits require manual restart
- Respects `prefers-reduced-motion` (no spotlight animation)

### Accessibility
- `aria-live="polite"` region announces each step for screen readers
- Coach mark has `role="dialog"` with proper `aria-label`
- Escape key skips the tour
- Tab navigation within popover buttons
- Focus automatically moves to popover on each step change
- Step dots are `aria-hidden` (decorative)

## Integration Points

- **`src/app/providers.tsx`** — `<TutorialController />` in root provider stack
- **Sidebar help menu** — "Take a tour" option calls `restart()`
- **Account settings** (PreferencesSection) — "Restart tutorial" button
- **`data-tour` attributes** in Header, QuickCaptureButton, Sidebar, SpaceSwitcher, and editor area
