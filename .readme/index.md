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
| [Todo Block](features/todo-block.md) | Checkbox/task list block type in the editor |


## Planned Features

| Feature | Description |
|---------|-------------|
| First use tutorial | Onboarding walkthrough for new users |
| [Block Side Menu](features/block-side-menu.md) | Notion-style block menus to insert blocks above/below — escape hatch for trapped blocks (private, code, table) |
| API documentation | API documentation with diagrams |
| Saved views and filters | Save current filter/sort configuration as named views on type pages; switch between saved views |
| Resize images in editor | Drag handles or resize controls on images in the block editor |
| Theme builder at account level | Move theme builder out of space settings into account-level settings; add a dedicated link in the account sub-header |
| Edit template content | Full template editing (content, properties, icon, cover) — not just name. Backend already supports `UpdateTemplateInput` with all fields; needs UI |
| Templates page rethink | If full template editing is added, keep the page as an editing hub. If not, consider removing it (templates are already manageable inline in type settings) |
| Type packs | Pre-built sets of types for common use cases: TTRPGs (Character, Session, Location, Item), note-taking (Meeting Notes, Journal, Reading List), recipes (Recipe, Ingredient, Meal Plan), etc. |
| Sharing card UI redesign | Revisit the sharing dialog/card UI for better usability |
| Nested entries | Drag-to-nest entries in sidebar (3 levels max). DB `parent_id` column exists; needs sidebar drag UX and hierarchical rendering |

## Bugs

See [bugs/log.md](bugs/log.md) for all tracked bugs.

## Archive

| Document | Description |
|----------|-------------|
| [v1 Implementation Plan](archive/v1-archive.md) | Original v1 plan (SvelteKit → Next.js rewrite) |
