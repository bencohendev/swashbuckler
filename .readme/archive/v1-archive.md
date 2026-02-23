# Swashbuckler v1 - Implementation Plan

## Overview

Building a knowledge management app with block-based editing, object types/relations, and a visual graph view. Starting fresh with Next.js 14, replacing the existing SvelteKit codebase.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Block Editor | Slate.js + Plate |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + OAuth) |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Styling | Tailwind CSS |
| Graph | D3.js |
| State | Zustand |
| Hosting | Vercel |

---

## Finalized Feature Decisions

| Area | Decision |
|------|----------|
| **Auth** | Email/password + Google + GitHub OAuth |
| **Sidebar** | Notion-style hierarchical tree |
| **Page Nesting** | 3 levels max |
| **Object Types** | Fully customizable by users |
| **Relations** | Bi-directional, user chooses constraint per property |
| **List Views** | Table + Grid |
| **Code Highlighting** | Full stack (JS, TS, HTML, CSS, JSON, Python, SQL, Go, Rust) |
| **Inline Formatting** | Bold, italic, code, link, strikethrough, underline, highlight + **Spoiler** |
| **Spoiler Reveal** | Click to reveal |
| **Images** | Basic (upload, display, delete) |
| **Linking** | `[[` only, search grouped by type |
| **Inline Create** | Via `/` menu + `[[` "Create new" option |
| **Collaboration** | Deferred to post-MVP |
| **Sharing** | Full model in MVP (workspace + exclusions) |
| **Permissions** | View / Edit (excluded content completely hidden) |
| **Exclusion Levels** | Object types, object instances, and fields (per type) |
| **Graph** | Basic force-directed, exploration, view-only |
| **Dashboard** | Favorites + Recent |
| **Quick Capture** | Yes, floating button/hotkey |
| **Mobile** | Responsive web |
| **Theme** | Light / Dark / System detect |
| **Favorites** | Star individual objects |
| **Trash** | 30-day retention |
| **Search** | Full-text including content |
| **Templates** | MVP - simple (no variables, no bundles) |
| **Export/Import** | Post-MVP (JSON + Markdown) |

---

## Database Schema

### Core Tables

```sql
-- Object Types (Page, Task, Note, Person, Project + custom)
CREATE TABLE object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_plural TEXT,
  icon TEXT DEFAULT '📄',
  color TEXT DEFAULT 'gray',
  property_schema JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  layout TEXT DEFAULT 'document', -- document, list, board
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Objects (instances)
CREATE TABLE objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE RESTRICT,
  parent_id UUID REFERENCES objects(id) ON DELETE SET NULL, -- For 3-level nesting
  properties JSONB NOT NULL DEFAULT '{}',
  content JSONB,  -- Slate.js block content
  is_template BOOLEAN DEFAULT false, -- Templates are objects marked as templates
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ, -- For 30-day retention
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Object Relations (for graph + bi-directional links)
CREATE TABLE object_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'linked_to', -- linked_to, mentions, child_of
  source_property_id TEXT,  -- which property created this
  context JSONB,  -- {block_id: "xxx"} for inline mentions
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id, relation_type, source_property_id),
  CHECK (source_id != target_id)
);

-- Workspace Sharing
CREATE TABLE workspace_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view', -- view, edit
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);

-- Share Exclusions (types, objects, or fields to hide)
CREATE TABLE share_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_share_id UUID NOT NULL REFERENCES workspace_shares(id) ON DELETE CASCADE,
  excluded_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE,
  excluded_object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  excluded_field_name TEXT, -- e.g., 'phone', 'salary' (applies to type)
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    -- Exclude entire type
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field_name IS NULL) OR
    -- Exclude specific object
    (excluded_type_id IS NULL AND excluded_object_id IS NOT NULL AND excluded_field_name IS NULL) OR
    -- Exclude field on a type (applies to all objects of that type)
    (excluded_type_id IS NOT NULL AND excluded_object_id IS NULL AND excluded_field_name IS NOT NULL)
  )
);
```

### Property Types (stored in JSONB)
| Type | Storage Format |
|------|----------------|
| text | `{type: "text", value: "..."}` |
| number | `{type: "number", value: 99.99, format: "currency\|percent"}` |
| date | `{type: "date", value: "ISO8601", include_time: bool}` |
| checkbox | `{type: "checkbox", value: true}` |
| select | `{type: "select", value: "option_id"}` |
| multi_select | `{type: "multi_select", value: ["opt1", "opt2"]}` |
| relation | `{type: "relation", value: ["obj_id"], target_type_id?: "type_id"}` |
| file | `{type: "file", value: [{id, name, url, mime_type, size}]}` |
| url | `{type: "url", value: "https://..."}` |
| email | `{type: "email", value: "user@example.com"}` |
| phone | `{type: "phone", value: "+1234567890"}` |

### Default Object Types (seeded on user creation)
1. **Page** - Basic document (icon: 📄, layout: document)
2. **Task** - status, priority, due_date, assignee (icon: ☑️, layout: list)
3. **Note** - Quick notes with tags (icon: 📝, layout: document)
4. **Person** - name, email, phone, company (icon: 👤, layout: list)
5. **Project** - name, description, status, dates (icon: 📁, layout: board)

---

## Project Structure

```
src/
├── app/                      # Next.js routes (thin, delegate to features)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (main)/
│   │   ├── layout.tsx              # Sidebar + main content
│   │   ├── page.tsx                # Dashboard (Favorites + Recent)
│   │   ├── objects/
│   │   │   ├── page.tsx            # Object list (Table/Grid)
│   │   │   └── [id]/page.tsx       # Object editor
│   │   ├── graph/page.tsx          # Knowledge graph
│   │   ├── trash/page.tsx          # Deleted objects (30-day)
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── types/page.tsx      # Manage object types
│   │       └── sharing/page.tsx    # Workspace sharing
│   ├── api/
│   │   ├── objects/
│   │   │   ├── route.ts            # CRUD
│   │   │   ├── [id]/route.ts
│   │   │   └── search/route.ts
│   │   ├── types/route.ts
│   │   ├── relations/route.ts
│   │   ├── sharing/route.ts
│   │   ├── graph/route.ts
│   │   └── upload/route.ts
│   ├── auth/callback/route.ts      # OAuth callback
│   ├── layout.tsx
│   └── globals.css
│
├── features/
│   ├── auth/
│   │   ├── components/       # LoginForm, SignupForm, OAuthButtons
│   │   ├── lib/
│   │   └── types.ts
│   │
│   ├── editor/
│   │   ├── components/       # Editor, elements, toolbar, SlashMenu
│   │   ├── plugins/          # spoiler-plugin, etc.
│   │   ├── hooks/            # useAutoSave
│   │   ├── lib/              # plate-config, auto-save
│   │   ├── store.ts          # editorStore
│   │   └── types.ts
│   │
│   ├── objects/
│   │   ├── components/       # ObjectList, ObjectGrid, PropertyEditor
│   │   ├── hooks/            # useObject
│   │   ├── lib/
│   │   └── types.ts
│   │
│   ├── graph/
│   │   ├── components/       # KnowledgeGraph, ForceSimulation, FilterPanel
│   │   ├── hooks/            # useGraph
│   │   ├── lib/              # force-layout
│   │   └── types.ts
│   │
│   ├── sharing/
│   │   ├── components/       # ShareModal, ExclusionManager
│   │   ├── hooks/            # useSharing
│   │   ├── lib/              # permission checking
│   │   └── types.ts
│   │
│   ├── templates/
│   │   ├── components/       # TemplatePicker, SaveAsTemplate
│   │   └── lib/
│   │
│   └── sidebar/
│       ├── components/       # Sidebar, TreeNode
│       ├── hooks/
│       └── store.ts          # sidebarStore
│
├── shared/
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   └── layout/           # Header, ThemeProvider, QuickCapture
│   ├── lib/
│   │   └── supabase/         # client, server, middleware
│   ├── hooks/                # truly shared hooks
│   ├── stores/               # global stores (theme)
│   └── types/
│       └── database.ts       # generated Supabase types
│
└── config/                   # app-wide config if needed
```

**Key principles:**
- Stores live with their feature (sidebarStore in sidebar/, editorStore in editor/)
- `shared/` is only for truly cross-cutting code (Supabase, UI primitives, database types)
- Routes in `app/` stay thin - import and compose from features
- Each feature is self-contained

---

## Implementation Phases

### PHASE 1: Project Foundation
**Goal**: Next.js project with Supabase auth working

1. Initialize Next.js 14 with TypeScript, Tailwind, App Router
2. Set up Supabase project (include setup guide)
3. Configure Supabase clients (browser + server)
4. Implement auth:
   - Email/password signup/login
   - Google OAuth
   - GitHub OAuth
   - Magic link (optional)
5. Set up shadcn/ui components
6. Create basic layout with placeholder sidebar
7. Run database migrations (extensions, tables, RLS, triggers)
8. Test: signup creates user + 5 default object types

**Deliverables**:
- Auth working (email + OAuth)
- Protected routes
- Database schema deployed

---

### PHASE 2: Object System + Sidebar
**Goal**: CRUD for objects with hierarchical sidebar

1. Generate TypeScript types from Supabase
2. API routes: objects CRUD, types CRUD, search
3. Implement Notion-style sidebar:
   - Hierarchical tree (3 levels max)
   - Expand/collapse
   - Drag to reorder (optional for MVP)
4. Object list views: Table + Grid
5. Property editor supporting all 11 types
6. Type management (create custom types, edit schemas)
7. Favorites: star toggle, favorites section in sidebar
8. Trash: soft delete, 30-day retention, restore/permanent delete

**Deliverables**:
- Create/edit/delete objects
- All property types work
- Hierarchical sidebar
- Table + Grid views
- Favorites and Trash

---

### PHASE 3: Block Editor
**Goal**: Plate editor with all block types

1. Install Plate packages
2. Configure plugins (14 total):
   - NodeIdPlugin, ParagraphPlugin, HeadingPlugin, BlockquotePlugin
   - IndentPlugin, ListPlugin, TogglePlugin
   - CodeBlockPlugin (with lowlight for syntax)
   - CalloutPlugin, TablePlugin, ImagePlugin
   - LinkPlugin, SlashPlugin, MentionPlugin
   - DndPlugin, AutoformatPlugin
3. Create block element components
4. Implement custom SpoilerPlugin (click-to-reveal)
5. Implement SlashMenu with categories:
   - Basic blocks
   - Lists
   - Media
   - Advanced
   - **Create New...** (opens type selector → modal)
6. Implement [[MentionInput]]:
   - Search grouped by type
   - "Create new" option at bottom
   - Opens CreateObjectModal, inserts link on save
7. Auto-save with debounce (1000ms)
8. Image upload to Supabase Storage

**Deliverables**:
- All block types working
- Slash menu with create option
- [[mentions]] with inline creation
- Spoiler text (click to reveal)
- Auto-save
- Image upload

---

### PHASE 4: Templates System
**Goal**: Simple templates (no variables, no bundles)

1. Templates are objects with `is_template: true`
2. "Save as Template" action on any object
3. Template picker in "New" dropdown:
   - Group templates by object type
   - "Blank" option for each type
   - User's custom templates
4. Creating from template copies properties + content
5. Template management in settings

**Deliverables**:
- Save object as template
- Create from template
- Manage templates

---

### PHASE 5: Sharing System
**Goal**: Workspace sharing with exclusions at 3 levels

1. Database tables: workspace_shares, share_exclusions
2. Share modal: invite by email, set permission (View/Edit)
3. Exclusion manager:
   - Exclude entire object types
   - Exclude specific objects
   - **Exclude fields per type** (e.g., hide "phone" on all Person objects)
4. Permission checking middleware
5. Hidden content:
   - Excluded objects don't appear
   - Excluded fields don't appear on objects
   - [[mentions]] to excluded objects are invisible
6. Shared view: see others' workspaces you have access to

**Deliverables**:
- Share workspace
- Exclude types/objects/fields
- View/Edit permissions work
- All excluded content completely invisible

---

### PHASE 6: Graph View
**Goal**: Basic force-directed exploration graph

1. Graph API: fetch nodes + edges
2. D3 force simulation
3. Render nodes (colored by type, sized by connections)
4. Render edges (curved links)
5. Interactions:
   - Click: select node
   - Double-click: navigate to object
   - Zoom/pan
6. Filter panel: filter by type
7. Search with highlighting

**Deliverables**:
- Graph shows all objects
- Relations as edges
- Click to navigate
- Type filtering

---

### PHASE 7: Polish
**Goal**: Production-ready app

1. Dashboard: Favorites + Recent objects
2. Quick Capture: floating button + hotkey
3. Theme: Light/Dark/System with toggle
4. Full-text search (including content)
5. Keyboard shortcuts
6. Responsive design for mobile
7. Loading states and error handling
8. Deploy to Vercel

**Deliverables**:
- Dashboard working
- Quick capture accessible
- Theme switching
- Responsive
- Deployed

---

## Key Implementation Details

### Spoiler Plugin (Phase 3)
```typescript
// Custom Plate mark plugin
const SpoilerPlugin = createPluginFactory({
  key: 'spoiler',
  isLeaf: true,
  component: SpoilerMark, // Renders as black bar, reveals on click
});
```

### [[Mention]] with Create (Phase 3)
```typescript
// MentionInput.tsx
const results = searchResults.length > 0
  ? [...groupedByType(searchResults), { type: 'create', label: `Create "${query}"...` }]
  : [{ type: 'create', label: `Create "${query}"...` }];
```

### Sharing Permission Check (Phase 5)
```typescript
// lib/utils/sharing.ts
async function canAccessObject(userId: string, objectId: string): Promise<boolean> {
  // 1. Is user the owner?
  // 2. Is workspace shared with user?
  // 3. Is object type excluded?
  // 4. Is specific object excluded?
  // Returns true only if accessible
}

async function getVisibleFields(userId: string, objectTypeId: string): Promise<string[]> {
  // Returns list of field names that are NOT excluded
  // Used to filter properties before returning to shared user
}
```

### Hierarchical Sidebar (Phase 2)
```typescript
// Max 3 levels: parent_id references
// Level 1: parent_id IS NULL
// Level 2: parent_id = Level1.id
// Level 3: parent_id = Level2.id
// Prevent Level 4 in UI
```

---

## Migration Order

```
001_extensions.sql          # uuid-ossp, pg_trgm
002_object_types.sql        # object_types + RLS
003_objects.sql             # objects + indexes + RLS
004_object_relations.sql    # relations + indexes + RLS
005_sharing.sql             # workspace_shares, share_exclusions + RLS
006_functions.sql           # RPC: search, graph_data, quick_search
007_triggers.sql            # updated_at, handle_new_user (seed types)
```

---

## Verification Plan

### Auth
- [ ] Email signup creates user + 5 default object types
- [ ] Google OAuth login works
- [ ] GitHub OAuth login works
- [ ] Protected routes redirect to /login
- [ ] Logout clears session

### Objects & Sidebar
- [ ] Create object with any type
- [ ] Edit all 11 property types
- [ ] 3-level nesting works in sidebar
- [ ] Cannot create Level 4
- [ ] Star/unstar favorites
- [ ] Delete moves to trash
- [ ] Trash shows 30-day items
- [ ] Restore from trash works
- [ ] Permanent delete works

### Editor
- [ ] All block types render
- [ ] Slash menu inserts blocks
- [ ] Slash menu "Create New..." opens modal
- [ ] [[mention]] shows grouped results
- [ ] [[mention]] "Create new" opens modal
- [ ] Created object links inline
- [ ] Spoiler hides text, click reveals
- [ ] Auto-save after 1s idle
- [ ] Image upload works

### Templates
- [ ] Save object as template
- [ ] Template appears in New dropdown
- [ ] Create from template copies content
- [ ] Delete template works

### Sharing
- [ ] Share workspace with email
- [ ] Recipient sees shared workspace
- [ ] View permission: can read, cannot edit
- [ ] Edit permission: can edit
- [ ] Exclude type: all objects of type hidden
- [ ] Exclude object: specific object hidden
- [ ] Exclude field: field doesn't appear on shared objects
- [ ] [[mentions]] to excluded objects are invisible

### Graph
- [ ] All objects appear as nodes
- [ ] Relations appear as edges
- [ ] Double-click navigates to object
- [ ] Type filter works
- [ ] Zoom/pan works

### Polish
- [ ] Dashboard shows Favorites + Recent
- [ ] Quick capture creates note
- [ ] Theme toggle: Light/Dark/System
- [ ] Search finds content in body
- [ ] Mobile layout is usable

---

## Post-MVP Features (Deferred)

1. **Real-time collaboration** - Block-level locking
2. **Export/Import** - JSON + Markdown export, markdown import
3. **Template variables** - {{date}}, {{user}}, custom prompts
4. **Template bundles** - Create multiple linked objects
5. **Advanced graph layouts** - Hierarchical, radial, clustered
6. **Board view** - Kanban for status-based objects
7. **Comments** - Inline commenting
8. **Version history** - Track changes over time
