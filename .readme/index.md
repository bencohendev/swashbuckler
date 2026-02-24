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

```
src/
├── app/                      # Next.js routes (thin, delegate to features)
│   ├── (auth)/               # Login, signup
│   ├── (main)/               # Sidebar + main content layout
│   │   ├── objects/          # Object list and editor
│   │   ├── graph/            # Knowledge graph
│   │   ├── trash/            # Deleted objects
│   │   ├── tags/[name]/      # Tag pages
│   │   ├── types/[slug]/     # Type table pages
│   │   └── settings/         # Types, templates, sharing
│   └── auth/callback/        # OAuth callback
├── features/
│   ├── auth/
│   ├── collaboration/
│   ├── editor/
│   ├── graph/
│   ├── object-types/
│   ├── objects/
│   ├── pins/
│   ├── search/
│   ├── account/
│   ├── sharing/
│   ├── tags/
│   ├── sidebar/
│   ├── table-view/
│   └── templates/
└── shared/
    ├── components/ui/        # shadcn components
    └── lib/data/             # DataClient interface (Supabase + Dexie)
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
| Confirm Dialogs | Radix AlertDialog replacements for `window.confirm()` |
| Show Password Toggle | Visibility toggle on password inputs (login, signup, account settings) |
| [Password Security](features/password-security.md) | Strength meter, 8-char minimum, login rate limiting |
| [Template Section in Type Settings](features/template-section-in-type-settings.md) | Inline template rename/delete in type edit form |

## Planned Features

| Feature | Description |
|---------|-------------|
| [Custom Themes](features/custom-themes.md) | User-built themes with color pickers |
| [Mobile](features/mobile.md) | Responsive layout for mobile devices |
| [Documentation Site](features/docs-site.md) | Fumadocs site in Turborepo monorepo at docs.swashbuckler.quest |
| Board view | Kanban for status-based entries |
| First use tutorial | Onboarding walkthrough for new users |
| Graph keyboard navigation | Tab/arrow-key navigation through graph nodes |
| Type reorder keyboard support | Up/down buttons as keyboard alternative to drag-drop |
| [Social Login](features/social-login.md) | Google & GitHub OAuth sign-in via Supabase Auth |
| Manage templates shortcut | Add "Manage Templates" option to the template menu dropdown |
| [Global Types](features/global-types.md) | Create types outside of spaces and assign them into spaces |
| [Duplicate Space Types](features/duplicate-space-types.md) | Copy all types from one space into a new space |

## Bugs

See [bugs/log.md](bugs/log.md) for all tracked bugs.

## Archive

| Document | Description |
|----------|-------------|
| [v1 Implementation Plan](archive/v1-archive.md) | Original v1 plan (SvelteKit → Next.js rewrite) |
