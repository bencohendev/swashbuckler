# Swashbuckler — Documentation Index

## Overview

A knowledge management app with block-based editing, custom types/relations, and a visual graph view.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Block Editor | Slate.js + Plate |
| Database | Supabase (PostgreSQL) |
| Local Storage | Dexie (IndexedDB) |
| Auth | Supabase Auth (Email + OAuth) |
| Validation | Zod 4 |
| Styling | Tailwind CSS |
| Graph | D3.js |
| State | Zustand |
| Hosting | Vercel |

## Project Structure

Turborepo monorepo: `apps/web/` (main app) + `apps/docs/` (Fumadocs documentation site).

```
apps/
├── web/                          # Main web app (@swashbuckler/web)
│   ├── src/
│   │   ├── app/                  # Next.js routes (thin, delegate to features)
│   │   │   ├── (auth)/           # Login, signup
│   │   │   ├── (main)/           # Sidebar + main content layout
│   │   │   └── auth/callback/    # OAuth callback
│   │   ├── features/             # Feature modules
│   │   └── shared/               # Shared components, hooks, data layer
│   ├── tests/                    # Unit, integration, e2e tests
│   └── supabase/                 # Database migrations
├── docs/                         # Documentation site (@swashbuckler/docs)
│   ├── src/app/                  # Fumadocs Next.js app
│   └── content/docs/             # MDX content
└── packages/                     # Shared packages (future)
```

## Data Layer

Dual-storage architecture with a `DataClient` interface:
- **Supabase** — authenticated users, remote PostgreSQL
- **Dexie (IndexedDB)** — guest/local mode, offline-first

## Database Migrations

```
001_extensions.sql          # uuid-ossp, pg_trgm
002_object_types.sql        # object_types + RLS
003_objects.sql             # objects + indexes + RLS
004_sharing.sql             # workspace_shares, share_exclusions + RLS
005_functions.sql           # RPC: search, graph_data, quick_search
006_triggers.sql            # updated_at, handle_new_user (seed types)
007_object_relations.sql    # relations + indexes + RLS
008_templates.sql           # dedicated templates table
009_built_in_types.sql      # well-known UUIDs for Page, Note
010_spaces.sql              # multi-space support
011_sharing.sql             # per-space sharing model
012_remove_builtins.sql     # remove built-in types, Page/Note as regular types
013_tags.sql                # tags + object_tags tables
014_pins.sql                # per-user object pins
015_space_wide_exclusions.sql # space-wide share exclusions
016_storage.sql             # uploads bucket + RLS policies
017_leave_space.sql         # leave space function
018_realtime.sql            # enable realtime publication
019_fix_shared_user_insert.sql # fix shared user insert
020_cascade_delete_types.sql   # cascade delete types
021_global_types.sql           # per-owner global type slug index
022_archive.sql                # is_archived + archived_at on objects, types, spaces
```

## Implemented Features

| Feature | Description |
|---------|-------------|
| [Auth](features/auth.md) | Authentication & authorization |
| [Objects](features/objects.md) | Entry system, types, properties |
| [Sidebar](features/sidebar.md) | Hierarchical sidebar + context menu |
| [Editor](features/editor.md) | Block editor (Plate.js) |
| [Templates](features/templates.md) | Template system + variables |
| [Sharing](features/sharing.md) | Workspace sharing & exclusions |
| [Graph](features/graph.md) | Knowledge graph visualization |
| [Search](features/search.md) | Global search (Cmd+K) |
| [Spaces](features/spaces.md) | Multi-workspace support |
| [Trash](features/trash.md) | Soft delete with 30-day retention |
| [Dashboard](features/dashboard.md) | Pinned + Recent |
| [Pins](features/favorites.md) | Pin entries for quick access |
| [Theme](features/theme.md) | Light / Dark / System |
| [Quick Capture](features/quick-capture.md) | Floating button / hotkey |
| [Emoji](features/emoji.md) | Emoji picker for types, spaces, and entries |
| [Tags](features/tags.md) | Global cross-type tagging |
| [Type Pages](features/type-pages.md) | Table view per type |
| [Account](features/account.md) | Account settings & management |
| [Image Upload](features/image-upload.md) | Image uploads for editor, covers, avatars |
| [UI Terminology](features/ui-terminology.md) | Rename "object" → "entry", "Object Type" → "Type" in UI |
| [Export](features/export.md) | JSON data export (account settings) |
| [Data Caching](features/data-caching.md) | TanStack Query migration for SWR caching |
| [Accessibility](features/accessibility.md) | Accessibility audit and remediation |
| [Realtime Sync](features/realtime.md) | Supabase Realtime + cross-tab BroadcastChannel |
| [Realtime Collaboration](features/realtime-collaboration.md) | Yjs CRDT collaborative editing for shared spaces |
| [Move docs to .readme/](features/move-docs-to-readme.md) | Move documentation from `.claude/docs/` to `.readme/` for GitHub visibility |
| [Unique Default Names](features/unique-default-names.md) | Incrementing "New Page", "New Page 2", etc. |
| [Toast Notifications](features/toast-notifications.md) | Non-blocking transient feedback (success, error, info, warning) |
| [Private Content](features/private-content.md) | Hide content within entries from shared users |
| Entry Pagination | Max 10 entries per type in sidebar with "See all" link |
| Confirm Dialogs | Radix AlertDialog replacements for `window.confirm()` |
| Show Password Toggle | Visibility toggle on password inputs (login, signup, account settings) |
| [Password Security](features/password-security.md) | Strength meter, 8-char minimum, login rate limiting |
| [Template Section in Type Settings](features/template-section-in-type-settings.md) | Inline template rename/delete in type edit form |
| Manage Templates Shortcut | "Manage Templates" option in sidebar type dropdown |
| [Board View](features/board-view.md) | Kanban board view for type pages — group entries by select field |
| [Global Types](features/global-types.md) | Reusable type blueprints importable across spaces |
| [Duplicate Space Types](features/duplicate-space-types.md) | Copy all types from one space into a new space |
| [Custom Themes](features/custom-themes.md) | User-built themes with color pickers, per-space application |
| [Type Reorder Keyboard](features/type-reorder-keyboard.md) | Up/down buttons as keyboard alternative to drag-drop in type settings |
| [Advanced Filtering](features/advanced-filtering.md) | Filter entries by all property types (date, number, text, URL) + persistent sort |
| [Documentation Site](features/docs-site.md) | Fumadocs site in Turborepo monorepo at docs.swashbuckler.quest |
| [Archive](features/archive.md) | Hide entries, types, and spaces without deleting them |
| [Delete Space](features/delete-space.md) | Permanently delete a space and all its contents |
| Vercel Analytics | Vercel Analytics integration (`@vercel/analytics`) |
| [Table Hover Menus](features/table-hover-menus.md) | Per-row/column hover handles with insert/delete dropdown menus |
| [Table Column Resize](features/table-column-resize.md) | Drag-to-resize columns in editor tables |
| [Apply Template](features/apply-template.md) | Apply an existing template to an entry retroactively |
| [Create from Template (Quick Capture)](features/create-from-template-quick-capture.md) | Template selection in quick capture dialog (Cmd+E) |
| [Loading Indicators](features/loading-indicators.md) | Navigation progress bar, Spinner/Skeleton primitives, Button loading states |
| [Social Login](features/social-login.md) | Google & GitHub OAuth sign-in via Supabase Auth |
| [API Audit (Backend)](features/api-audit-backend.md) | Audit Supabase backend APIs for correctness, security, and consistency |
| [API Audit (Frontend)](features/api-audit-frontend.md) | Audit frontend API calls for correctness, error handling, and consistency |
| [Settings Hub](features/settings-hub.md) | Split settings into Account and Space sections |
| [Mobile](features/mobile.md) | Responsive layout for mobile devices |
| [Landing Page](features/landing-page.md) | Marketing/landing page for the app |
| [Link to Docs](features/link-to-docs.md) | Help button with docs link and keyboard shortcuts reference |
| [Todo Block](features/todo-block.md) |  Checkbox/task list block type for the editor. Each todo item has a clickable checkbox that toggles checked/unchecked state, with visual strikethrough on completed items. |
| [Block Side Menu](features/block-side-menu.md) | Notion-style hover handle in editor gutter with insert, duplicate, and delete actions |
| [First-Use Tutorial](features/first-use-tutorial.md) | Onboarding walkthrough for new users |
| [API Documentation](features/api-documentation.md) | Internal API documentation with architecture diagrams |
| [Image Resize](features/image-resize.md) | Drag-handle resize for inline editor images |
| [Account-Level Themes](features/account-level-themes.md) | Dedicated settings page for custom theme creation/management, selection-only Appearance page |
| [Type Starter Kits](features/type-starter-kits.md) | Pre-built type collections (RP, recipes, note-taking, etc.) |
| [Edit Template Content](features/edit-template-content.md) | Edit full template content and variables, not just name |
| [Saved Views & Filters](features/saved-views.md) | Named saved views per type page (filters + sort + view mode) |
| [Sharing UI Redesign](features/sharing-ui-redesign.md) | Redesign sharing card/dialog, especially for desktop |
| [Fantasy Theme](features/fantasy-theme.md) | Fantasy-styled UI skin — parchment paper editor, scroll-style modals, medieval typography and ornamental accents |
| [Sci-Fi Theme](features/sci-fi-theme.md) | Sci-fi styled UI skin — cyberpunk/neon aesthetic, futuristic panels and controls |
| Archive Releases Names | Archiving a type/tag should release its slug/name for reuse (from [Database Audit](features/database-audit.md) E2) |


## Planned Features

| Feature | Description |
|---------|-------------|

## Deferred

| Feature | Description | Reason |
|---------|-------------|--------|
| Optimistic Locking | Prevent silent overwrites when two users edit the same entry's metadata in a shared space (from [Database Audit](features/database-audit.md) E1) | Low practical risk — editor content already protected by Yjs CRDT; only metadata (title, properties) during simultaneous editing is exposed. Moderate implementation cost (~15-20 files). Revisit if multi-user metadata conflicts become a real pain point. |

### Audits

| Audit | Description |
|-------|-------------|
| [Database Audit](features/database-audit.md) | Schema design, index coverage, N+1 queries, cascade completeness, migration hygiene, Dexie parity |
| [Security Audit](features/security-audit.md) | OWASP-style review: auth, input validation, XSS/CSRF, sharing boundaries, realtime security, CSP |
| [SSR vs Client Audit](features/ssr-vs-client-audit.md) | Rendering strategy, `'use client'` boundaries, SSR data fetching, hydration risks, bundle size |
| [Client API Audit](features/client-api-audit.md) | DataClient design, TanStack Query config, query keys, mutation/invalidation, error handling, waterfalls |
| [React Hooks Audit](features/react-hooks-audit.md) | useEffect correctness, memoization, stale closures, Zustand patterns, infinite loop risks, cleanup |
| [Accessibility Audit v2](features/accessibility-audit-v2.md) | Automated testing, keyboard nav, screen readers, contrast, motion, touch targets, zoom/reflow |

## Bugs

See [bugs/log.md](bugs/log.md) for all tracked bugs.

## Archive

| Document | Description |
|----------|-------------|
| [v1 Implementation Plan](archive/v1-archive.md) | Original v1 plan (SvelteKit → Next.js rewrite) |
