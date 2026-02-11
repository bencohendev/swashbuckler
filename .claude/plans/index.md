# Swashbuckler — Planning Index

## Overview

A knowledge management app with block-based editing, object types/relations, and a visual graph view.

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
│   │   └── settings/         # Types, templates, sharing
│   └── auth/callback/        # OAuth callback
├── features/
│   ├── auth/
│   ├── editor/
│   ├── graph/
│   ├── object-types/
│   ├── objects/
│   ├── search/
│   ├── sharing/
│   ├── sidebar/
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
012_tags.sql                # tags + object_tags tables (planned)
013_realtime.sql            # enable realtime publication (planned)
```

## Feature Plans

| Feature | Plan | Status |
|---------|------|--------|
| [Auth](auth.md) | Authentication & authorization | Done |
| [Objects](objects.md) | Object system, types, properties | Done |
| [Sidebar](sidebar.md) | Hierarchical sidebar + context menu | Partial |
| [Editor](editor.md) | Block editor (Plate.js) | Done |
| [Templates](templates.md) | Template system | Done |
| [Sharing](sharing.md) | Workspace sharing & exclusions | Done |
| [Graph](graph.md) | Knowledge graph visualization | Done |
| [Search](search.md) | Global search (Cmd+K) | Done |
| [Spaces](spaces.md) | Multi-workspace support | Done |
| [Trash](trash.md) | Soft delete with 30-day retention | Done |
| [Dashboard](dashboard.md) | Favorites + Recent | Partial |
| [Favorites](favorites.md) | Star individual objects | Not started |
| [Theme](theme.md) | Light / Dark / System | Partial |
| [Quick Capture](quick-capture.md) | Floating button / hotkey | Not started |
| [Emoji](emoji.md) | Emoji picker for type & space icons | Not started |
| [Tags](tags.md) | Global cross-type tagging | Not started |
| [Type Pages](type-pages.md) | Table view per object type | Not started |
| [Realtime](realtime.md) | Supabase Realtime + cross-tab sync | Not started |

## Post-MVP Features (Deferred)

1. Real-time collaboration — block-level locking (collaborative editing)
2. Export/Import — JSON + Markdown
3. Template variables — {{date}}, {{user}}, custom prompts
4. Template bundles — create multiple linked objects
5. Advanced graph layouts — hierarchical, radial, clustered
6. Calendar view — for date-based objects
7. Board view — Kanban for status-based objects
8. Comments — inline commenting
9. Version history — track changes over time
10. API access — public API for integrations
