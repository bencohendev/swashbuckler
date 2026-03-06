# Regression Testing

**Status:** Done

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

### Phase 2 (Automated — Supabase-Backed)

- **Infrastructure:** Supabase CLI `config.toml`, global setup/teardown, auth fixtures
- **Global setup** (`tests/e2e/global-setup.ts`) — creates test users via Admin API, seeds space share + objects, saves `storageState` per user
- **Auth fixtures** (`tests/e2e/auth-helpers.ts`) — single-user and two-user Playwright fixtures, graceful skip when Supabase not running
- **9 e2e test files** covering 43 tests in `tests/e2e/supabase/` (+ 2 setup tests):
  - Auth login (6 tests) — valid/invalid login, rate limiting, fresh browser session, form fields
  - Auth signup (4 tests) — form fields, password validation, mismatch, confirmation UI
  - Auth password reset (3 tests) — forgot-password form, form fields, reset form with session
  - Auth middleware (5 tests) — route protection for auth pages + guest mode entry
  - Auth logout (3 tests) — sign out, session cleared, login page shown (isolated sessions)
  - Spaces (6 tests) — display, create, switch, rename, archive, can't delete last
  - Sharing (8 tests) — open dialog, invite, permission update, revoke, shared user sees space/objects, leave
  - Sharing exclusions (4 tests) — exclusion panel, settings page, share dialog links, share count
  - Collaboration (4 tests) — A→B sync, B→A sync, presence avatars, simultaneous editing
- **CSP update** — `localhost:54321` added to `connect-src` in dev mode
- **CI integration** — Supabase CLI setup, `supabase start`, credential extraction, `--project=supabase` run, cleanup

## Test Files

### Phase 1 — Guest Mode

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

### Phase 2 — Supabase-Backed

| File | Tests | Area |
|------|-------|------|
| `supabase/auth-login.test.ts` | 6 | Auth |
| `supabase/auth-signup.test.ts` | 4 | Auth |
| `supabase/auth-password-reset.test.ts` | 3 | Auth |
| `supabase/auth-middleware.test.ts` | 5 | Auth |
| `supabase/auth-logout.test.ts` | 3 | Auth |
| `supabase/spaces.test.ts` | 6 | Spaces |
| `supabase/sharing.test.ts` | 8 | Sharing |
| `supabase/sharing-exclusions.test.ts` | 4 | Sharing |
| `supabase/collaboration.test.ts` | 4 | Realtime |

## CI Integration

- Runs on PRs only (`if: github.event_name == 'pull_request'`)
- Depends on lint + test jobs
- Single browser (Chromium) for speed
- **Phase 1:** `--project=chromium` (guest mode, no Supabase needed)
- **Phase 2:** Supabase CLI installed, `supabase start`, credentials extracted via `supabase status`, `--project=supabase`, `supabase stop` in cleanup
- Uploads `playwright-report/` and `test-results/` as artifacts on failure
- Build job uses `if: always()` so it isn't blocked when e2e is skipped on pushes

---

## Manual Regression Checklist

### Authentication (18 items)

- [x] Login with email/password works *(automated: auth-login.test.ts)*
- [ ] Login with Google OAuth works
- [ ] Login with GitHub OAuth works
- [x] Signup creates account *(automated: auth-signup.test.ts)*
- [x] Password strength meter / validation displays correctly *(automated: auth-signup.test.ts)*
- [x] Invalid credentials show error message *(automated: auth-login.test.ts)*
- [x] Logout clears session, guest cookie, query cache, and redirects to login *(automated: auth-logout.test.ts)*
- [ ] Session persists across page reload
- [ ] Guest mode activates on first visit without auth
- [x] Visiting /dashboard without session or guest cookie redirects to /login *(automated: auth-middleware.test.ts)*
- [x] Visiting /reset-password directly (no session) shows "Invalid or expired link" *(automated: auth-password-reset.test.ts)*
- [x] Expired password reset link shows error on /forgot-password *(automated: auth-password-reset.test.ts)*
- [x] Denying OAuth consent shows message on /login *(automated: auth-login.test.ts)*
- [ ] Network failure during login shows "Unable to connect" error
- [ ] Network failure during signup shows error (not frozen spinner)
- [x] Authenticated user visiting /forgot-password redirects to /dashboard *(automated: auth-middleware.test.ts)*
- [ ] Session expiry during use redirects to /login with "session expired" message
- [x] Signup confirmation state shows "Resend confirmation email" button *(automated: auth-signup.test.ts)*

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

## Phase 2 — Supabase-Backed Tests (Implementation Details)

### Infrastructure

- `supabase/config.toml` — local Supabase CLI config (email confirmations disabled, studio disabled, realtime enabled)
- `supabase/seed.sql` — placeholder (data created programmatically)
- `tests/e2e/global-setup.ts` — creates users via Admin API, seeds space share + objects, saves test data JSON
- `tests/e2e/supabase-login.setup.ts` — Playwright setup project that logs in via browser and saves `storageState` per user
- `tests/e2e/global-teardown.ts` — cleans up `tests/.auth/` directory
- `tests/e2e/auth-helpers.ts` — `test` fixture (single user), `twoUserTest` fixture (two contexts), `switchToSpace`, `openShareDialog`, `waitForCollabReady` helpers
- `next.config.ts` — CSP includes `localhost:54321` in non-production
- `.env.local.example` — `SUPABASE_SERVICE_ROLE_KEY` placeholder added
- `.gitignore` — `tests/.auth/` excluded from git
- `playwright.config.ts` — loads `.env.local` via `process.loadEnvFile()`; three Supabase projects: `supabase-setup` → `supabase` → `supabase-logout` (chained via dependencies); production build webServer (`next build && next start`)
- Graceful degradation — all Supabase tests skip silently when local Supabase isn't running

### Key Design Decisions

- **Logout tests run last and sequentially** — Supabase's `signOut()` defaults to `scope: 'global'` which revokes ALL server-side refresh tokens. Logout tests use isolated `supabase-logout` project with fresh login sessions and `fullyParallel: false` to prevent concurrent logins for the same user (which causes session conflicts).
- **Production build for tests** — `next build && next start` instead of `next dev` handles parallel test load much better and matches production behavior.
- **User A's space renamed** — Global setup renames User A's auto-created space to "User A Space" to avoid duplicate "My Space" names (both users get auto-created spaces).
- **Archive test space pre-seeded** — Global setup creates a second space ("Archive Test Space") for deterministic archive/switch tests. UI-based space creation is flaky due to `loadSpaces()` timing and space name uniqueness constraints (including archived spaces).
- **Login cookie timing** — After `signInWithPassword`, the auth cookie may not be ready for the first SSR render (router.push fires before the cookie setter completes). `loginFresh` retries with a page reload if guest mode is detected.
- **Zustand store timing** — `useTutorial` reads localStorage at module creation time. Tests use `context.addInitScript()` (not `page.evaluate()`) to set localStorage before any page JS runs.
- **Radix dropdown retry** — `switchToSpace` helper waits for menu close animation and retries clicks up to 5 times to handle Radix dropdown missed clicks during React re-renders.
- **Radix AlertDialog** — Archive/leave confirmations use `role="alertdialog"`, not `role="dialog"`. Tests use `getByRole('alertdialog')` accordingly.
- **Collaboration sync timeouts** — Realtime tests use 30s assertion timeouts and wait for "Synced" status indicator before typing, accommodating Supabase Broadcast latency.

### Test Users

- **User A** (owner): `user-a@test.localhost` / `TestPassword1!` — owns the test space
- **User B** (shared): `user-b@test.localhost` / `TestPassword2!` — has edit access to User A's space

### OAuth

Skipped — can't test real Google/GitHub OAuth locally. Error paths (`?error=oauth_denied`, etc.) covered in `auth-login.test.ts` via query params.
