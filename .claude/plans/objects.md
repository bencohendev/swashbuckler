# Objects

**Status: Done**

## Overview

Core entry system with customizable types, properties, and CRUD operations. Entries are instances of user-defined types with flexible JSONB properties and Plate.js content. (UI shows "entry/entries"; internal code still uses "object".)

## Decisions

| Area | Decision |
|------|----------|
| Type system | Fully customizable by users |
| Type identity | UUID FK to `object_types` table (not string enum) |
| Default types | Page seeded per-space on account creation (no built-in types) |
| Properties | JSONB schema on object_types, JSONB values on objects |
| Nesting | 3 levels max via `parent_id` |
| Relations | Bi-directional via `object_relations` table |
| Relation types | `mention` (auto-synced from editor) and `link` (manual via UI) |

## Database Schema

```sql
CREATE TABLE object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plural_name TEXT,
  icon TEXT DEFAULT '📄',
  color TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_built_in BOOLEAN DEFAULT false, -- legacy column, always false
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Unique slug per space
CREATE UNIQUE INDEX object_types_space_slug_idx
  ON object_types(COALESCE(space_id, '00000000-0000-0000-0000-000000000000'), slug);

CREATE TABLE objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES object_types(id),
  space_id UUID NOT NULL REFERENCES spaces(id),
  parent_id UUID REFERENCES objects(id) ON DELETE SET NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  content JSONB, -- Plate.js block content
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE object_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, -- 'mention' or 'link'
  source_property TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id, relation_type, source_property),
  CHECK (source_id != target_id)
);
```

## Property Types

| Type | Storage Format |
|------|----------------|
| text | `{type: "text", value: "..."}` |
| number | `{type: "number", value: 99.99}` |
| date | `{type: "date", value: "ISO8601"}` |
| checkbox | `{type: "checkbox", value: true}` |
| select | `{type: "select", value: "option_id"}` |
| multi_select | `{type: "multi_select", value: ["opt1"]}` |
| relation | `{type: "relation", value: ["obj_id"]}` |
| url | `{type: "url", value: "https://..."}` |
| email | `{type: "email", value: "user@example.com"}` |
| phone | `{type: "phone", value: "+1234567890"}` |

## Default Types (seeded on account/space creation)

1. **Page** — basic document (icon: file-text)

All types are regular user-owned, per-space records. There are no global built-in types — Page is seeded as a normal type that can be renamed, edited, or deleted. Migration 012 converted existing built-in Page/Note types to per-space user-owned copies.

## Implementation

- `src/features/objects/` — ObjectEditor, PropertyFields, hooks
- `src/features/object-types/` — type management, creation, custom fields
- `src/shared/lib/data/types.ts` — `DataClient` interface
- `src/shared/lib/data/supabase.ts` + `local.ts` — dual storage implementations

## Linking / Relations

- `extractMentionIds()` walks Plate content tree for mention nodes
- `syncMentions()` diffs existing mention relations vs current content on save
- `LinkedObjects` component renders below editor in ObjectEditor
- `MentionInputElement` has search dropdown triggered by `@`
- Backlinks deferred to future iteration

## Verification

- [x] Create entry with any type
- [x] Edit property types
- [x] 3-level nesting works
- [x] Delete moves to trash
- [x] Object relations (mention + link) work
- [x] Custom types with plural names
- [x] All types fully editable and deletable (no built-in restrictions)
