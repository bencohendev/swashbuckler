# Regression Testing

**Status:** Active

## Overview

Comprehensive regression test coverage via automated Playwright e2e tests (guest-mode, Phase 1) and a manual regression checklist. Targets the highest-risk areas identified in the bug log: editor crashes, data rendering (infinite loops, flicker), navigation, and entry lifecycle.

## Scope

### Phase 1 (Automated — Guest Mode)

- **Shared helpers** (`tests/e2e/helpers.ts`) — custom Playwright fixture for guest mode, reusable create/navigation/tag/pin/archive/template helpers
- **9 e2e test files** covering 56 tests across:
  - Editor (7 tests) — highest risk, 6+ crashes in bug log
  - Types & entries (5 tests) — default type, creation, unique names
  - Navigation & lifecycle (7 tests) — all views, trash, settings, sidebar
  - Search & quick capture (7 tests) — Cmd+K, Cmd+E, keyboard nav
  - Tags & pins (7 tests) — tag CRUD, sidebar tags, pin/unpin, dashboard pinned section
  - Dashboard & archive (6 tests) — sections, recent entries, archive/unarchive, empty states
  - Templates (5 tests) — save/apply template, settings list, delete, empty state
  - Type settings & properties (6 tests) — add fields, property display, persistence, view modes
  - Theme & editor formatting (6 tests) — theme toggle/cycle, dark mode, bold autoformat, blockquote, todo checkbox
- **Playwright config updates** — CI reporter, failure screenshots, web server timeout
- **CI integration** — e2e job in GitHub Actions (PRs only, Chromium, artifact upload)

### Phase 2 (Planned — Supabase-Backed)

- Auth flows (signup, login, OAuth, session persistence)
- Sharing & permissions (invite, view-only, edit, exclusions)
- Realtime collaboration (two browser contexts, concurrent editing)
- Space management (create, switch, delete, archive)
- Requires: Supabase CLI, local Postgres, seed scripts, Docker in CI

## Test Files

| File | Tests | Risk |
|------|-------|------|
| `editor.test.ts` | 7 | Highest |
| `types-and-entries.test.ts` | 5 | High |
| `navigation-and-lifecycle.test.ts` | 7 | High |
| `search-and-quick-capture.test.ts` | 7 | Medium |
| `tags-and-pins.test.ts` | 7 | Medium |
| `dashboard-and-archive.test.ts` | 6 | Medium |
| `templates.test.ts` | 5 | Medium |
| `type-settings-and-properties.test.ts` | 6 | Medium |
| `theme-and-editor-formatting.test.ts` | 6 | Low |

## CI Integration

- Runs on PRs only (`if: github.event_name == 'pull_request'`)
- Depends on lint + test jobs
- Single browser (Chromium) for speed
- Uploads `playwright-report/` and `test-results/` as artifacts on failure
- Build job uses `if: always()` so it isn't blocked when e2e is skipped on pushes

---

## Manual Regression Checklist

### Authentication (9 items)

- [ ] Login with email/password works
- [ ] Login with Google OAuth works
- [ ] Login with GitHub OAuth works
- [ ] Signup creates account and redirects
- [ ] Password strength meter displays correctly
- [ ] Invalid credentials show error message
- [ ] Logout clears session and redirects to login
- [ ] Session persists across page reload
- [ ] Guest mode activates on first visit without auth

### Editor (15 items) — HIGHEST RISK

- [ ] Editor loads with contenteditable area
- [ ] Can type text in the editor body
- [ ] Enter key creates new paragraph (no crash)
- [ ] Backspace at start of block doesn't crash
- [ ] Slash menu opens on `/` keystroke
- [ ] Slash menu items create correct block types
- [ ] Heading block renders correctly
- [ ] Code block accepts text and Mod+Enter exits
- [ ] Todo/checkbox block toggles checked state
- [ ] Image upload block appears and accepts files
- [ ] Table block renders with hover menus
- [ ] Table column resize works
- [ ] Mention `@` triggers search dropdown
- [ ] Block side menu appears on hover (desktop)
- [ ] Entry title persists on reload

### Types & Entries (12 items)

- [ ] Default Page type exists in guest mode
- [ ] Can create new entry from sidebar
- [ ] Can create new type with custom name
- [ ] Type appears in sidebar after creation
- [ ] Entry appears in sidebar after creation
- [ ] Multiple entries get unique default names
- [ ] Type page shows entries in table view
- [ ] Entry deletion moves to trash
- [ ] Type settings page loads
- [ ] Type properties render correctly
- [ ] Board view renders when enabled
- [ ] Template can be applied to entry

### Navigation & Sidebar (11 items)

- [ ] Dashboard loads with pinned + recent sections
- [ ] Sidebar collapses/expands with Cmd+\
- [ ] All sidebar links navigate correctly
- [ ] Active page highlighted in sidebar
- [ ] Sidebar entry list updates after creation
- [ ] Sidebar doesn't flicker during navigation
- [ ] Settings page loads all section cards
- [ ] Graph view renders without crash
- [ ] Archive page loads
- [ ] Trash page loads with empty state
- [ ] Browser back/forward navigation works

### Search & Quick Capture (8 items)

- [ ] Cmd+K opens search dialog
- [ ] Escape closes search dialog
- [ ] Search finds entries by title
- [ ] Search result navigates to entry
- [ ] Keyboard navigation works in search results
- [ ] Cmd+E opens quick capture dialog
- [ ] Quick capture shows available types
- [ ] Quick capture creates entry successfully

### Tags (5 items)

- [ ] Can create tags from entry sidebar
- [ ] Tags appear in sidebar tag section
- [ ] Tag filter works on type page
- [ ] Can remove tag from entry
- [ ] Tag deletion removes from all entries

### Pins (4 items)

- [ ] Can pin entry from context menu
- [ ] Pinned entry appears on dashboard
- [ ] Can unpin entry
- [ ] Pin order persists

### Templates (7 items)

- [ ] Can create template from entry
- [ ] Template appears in type settings
- [ ] Can create entry from template
- [ ] Template content populates new entry
- [ ] Template variables resolve
- [ ] Can rename template
- [ ] Can delete template

### Trash & Archive (9 items)

- [ ] Deleted entry appears in trash
- [ ] Can restore entry from trash
- [ ] Can permanently delete from trash
- [ ] Trash shows retention period info
- [ ] Archived entry disappears from sidebar
- [ ] Archived entry appears in archive page
- [ ] Can restore from archive
- [ ] Archived type hides its entries
- [ ] Archived space hides from switcher

### Graph View (7 items)

- [ ] Graph renders without crash
- [ ] Nodes represent entries
- [ ] Edges represent relations/mentions
- [ ] Click on node navigates to entry
- [ ] Graph responds to zoom/pan
- [ ] New entry appears as node
- [ ] Deleted entry removed from graph

### Spaces (5 items)

- [ ] Space switcher shows current space
- [ ] Can create new space
- [ ] Switching space changes sidebar content
- [ ] Space settings accessible
- [ ] Can duplicate types from another space

### Sharing (5 items)

- [ ] Can invite user to space
- [ ] Shared user sees shared space
- [ ] View-only user cannot edit
- [ ] Share exclusions hide entries
- [ ] Can leave shared space

### Collaboration (3 items)

- [ ] Two users see each other's edits live
- [ ] Presence indicators show active users
- [ ] Conflict resolution doesn't lose data

### Theme (4 items)

- [ ] Light/dark/system toggle works
- [ ] Custom theme colors apply
- [ ] Theme persists across reload
- [ ] Per-space theme applies correctly

### Mobile (4 items)

- [ ] Sidebar is off-screen by default on mobile
- [ ] Swipe or button opens sidebar
- [ ] Editor is usable on mobile viewport
- [ ] Touch targets are >= 44px

### Accessibility (6 items)

- [ ] All interactive elements keyboard-accessible
- [ ] Focus visible indicators present
- [ ] Screen reader announces page transitions
- [ ] Dialog trap focus correctly
- [ ] Color contrast meets WCAG AA
- [ ] Reduced motion preference respected

---

## Phase 2 — Supabase-Backed Tests (Outline)

### Infrastructure

- Supabase CLI with `config.toml` in repo
- `supabase start` for local Postgres/Auth/Realtime/Storage
- Seed script for deterministic test users
- Docker compose service in GitHub Actions
- Playwright `storageState` for auth session reuse
- Separate `supabase` project in Playwright config

### Test Areas

- **Auth flows:** signup, login, email confirmation, OAuth redirect, session refresh
- **Sharing:** invite via email, accept invite, view-only enforcement, edit permission, exclusion toggle, leave space
- **Collaboration:** two browser contexts editing same entry, live cursor presence, concurrent paragraph insert, auto-save leader election
- **Space management:** create space, switch, delete with confirmation, archive/restore
