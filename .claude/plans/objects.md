# Objects

**Status: Done**

## Overview

Core object system with customizable types, properties, and CRUD operations. Objects are instances of user-defined types with flexible JSONB properties and Plate.js content.

## Decisions

| Area | Decision |
|------|----------|
| Type system | Fully customizable by users |
| Type identity | UUID FK to `object_types` table (not string enum) |
| Built-in types | Well-known UUIDs: Page=`...001`, Note=`...002` |
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
  color TEXT DEFAULT 'gray',
  property_schema JSONB NOT NULL DEFAULT '{}',
  is_built_in BOOLEAN DEFAULT false,
  space_id UUID REFERENCES spaces(id), -- nullable for built-ins
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

## Default Object Types (seeded on user creation)

1. **Page** — basic document (icon: 📄)
2. **Note** — quick notes (icon: 📝)

## Implementation

- `src/features/objects/` — ObjectEditor, PropertyFields, hooks
- `src/features/object-types/` — type management, creation, custom fields
- `src/shared/lib/data/types.ts` — `DataClient` interface, `BUILT_IN_TYPE_IDS`
- `src/shared/lib/data/supabase.ts` + `local.ts` — dual storage implementations

## Linking / Relations

- `extractMentionIds()` walks Plate content tree for mention nodes
- `syncMentions()` diffs existing mention relations vs current content on save
- `LinkedObjects` component renders below editor in ObjectEditor
- `MentionInputElement` has search dropdown triggered by `@`
- Backlinks deferred to future iteration

## Verification

- [x] Create object with any type
- [x] Edit property types
- [x] 3-level nesting works
- [x] Delete moves to trash
- [x] Object relations (mention + link) work
- [x] Custom object types with plural names
