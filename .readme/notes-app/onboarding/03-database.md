# Database Deep Dive

This document covers the full database layer: PostgreSQL schema, migrations, RLS policies, RPC functions, and the Dexie local database that mirrors the server schema for offline/guest mode.

---

## Database Overview

Swashbuckler uses two parallel database systems:

1. **PostgreSQL via Supabase** -- the primary database for authenticated users. All tables use Row-Level Security (RLS). Migrations live in `apps/web/supabase/migrations/`.
2. **Dexie (IndexedDB)** -- a local-first database for guest/offline mode. Schema defined in `apps/web/src/shared/lib/data/local.ts`.

Both implement the same `DataClient` interface (defined in `apps/web/src/shared/lib/data/types.ts`), so the application code is storage-agnostic.

### PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Trigram matching for fuzzy text search
```

`uuid-ossp` provides `uuid_generate_v4()` (though most tables now use the built-in `gen_random_uuid()`). `pg_trgm` powers the `similarity()` function and GIN trigram indexes used for search.

---

## Core Tables

### spaces

Organizational containers. Everything in the system is space-scoped.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| name | TEXT NOT NULL | Max 100 chars, unique per owner (case-insensitive) |
| icon | TEXT | Default `'📁'` |
| owner_id | UUID NOT NULL | FK `auth.users(id) ON DELETE CASCADE` |
| is_archived | BOOLEAN NOT NULL | Default `false` |
| archived_at | TIMESTAMPTZ | Set when archived |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Auto-updated via trigger |

One user can own multiple spaces. Shared spaces appear for recipients via `space_shares`. When a new user signs up, a trigger creates a default space named "My Space" with a Page type seeded inside it.

### object_types

Schema definitions that describe what kind of thing an object is (e.g., "Page", "Character", "Recipe").

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| name | TEXT NOT NULL | Max 100 chars |
| plural_name | TEXT NOT NULL | e.g., "Pages", "Characters" |
| slug | TEXT NOT NULL | Lowercase kebab-case, unique per space |
| icon | TEXT NOT NULL | Default `'file'` (Lucide icon name) |
| color | TEXT | Hex color string, nullable |
| fields | JSONB NOT NULL | Default `'[]'` -- array of field definitions |
| owner_id | UUID NOT NULL | FK `auth.users(id) ON DELETE CASCADE` |
| space_id | UUID | FK `spaces(id) ON DELETE CASCADE`, nullable for global types |
| sort_order | INT NOT NULL | Default `0` |
| is_archived | BOOLEAN NOT NULL | Default `false` |
| archived_at | TIMESTAMPTZ | Set when archived |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Auto-updated via trigger |

The `fields` column is a JSONB array where each element is a `FieldDefinition`:

```typescript
{
  id: string        // UUID
  name: string      // Display name (1-100 chars)
  type: 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'multi_select' | 'url'
  required?: boolean
  default_value?: any
  options?: string[] // For select/multi_select types
  sort_order: number
}
```

Unique constraint on slugs uses a COALESCE index:

```sql
-- Space-scoped types: unique (space_id, slug) per space (case-insensitive)
CREATE UNIQUE INDEX object_types_space_slug_idx
  ON object_types(COALESCE(space_id, '00000000-0000-0000-0000-000000000000'), LOWER(slug));
```

There are no built-in types. Page and Note are regular per-space, user-owned types created when a space is set up.

### objects

The core data entries -- every page, note, character sheet, recipe, or whatever types the user defines.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| title | TEXT NOT NULL | Max 255 chars (CHECK constraint) |
| type_id | UUID NOT NULL | FK `object_types(id) ON DELETE CASCADE` |
| owner_id | UUID NOT NULL | FK `auth.users(id) ON DELETE CASCADE` |
| space_id | UUID NOT NULL | FK `spaces(id) ON DELETE CASCADE` |
| parent_id | UUID | Self-referential FK `objects(id) ON DELETE SET NULL` |
| icon | TEXT | Lucide icon name or emoji |
| cover_image | TEXT | URL, max 2048 chars |
| properties | JSONB NOT NULL | Default `'{}'` -- `Record<fieldId, value>` |
| content | JSONB | Plate.js editor state (array of Slate nodes) |
| sort_order | INT NOT NULL | Default `0` |
| is_deleted | BOOLEAN NOT NULL | Default `false` |
| deleted_at | TIMESTAMPTZ | Soft delete timestamp (90-day TTL purge) |
| is_archived | BOOLEAN NOT NULL | Default `false` |
| archived_at | TIMESTAMPTZ | Set when archived |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Auto-updated via trigger |

Key details:
- **Soft delete**: `is_deleted` + `deleted_at` rather than physical deletion. Objects in the trash are purged after 90 days.
- **properties**: A `Record<fieldId, value>` that maps to the `fields` array on the object's type. If a type defines a "Status" field with id `abc-123`, the object's properties might be `{"abc-123": "In Progress"}`.
- **content**: The Plate.js editor state -- an array of Slate nodes representing the rich-text document body.
- **parent_id**: Enables hierarchical nesting. Deleting a parent sets children's `parent_id` to NULL (does not cascade delete).

### object_relations

Links between objects, used for backlinks, graph visualization, and the LinkedObjects component.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| source_id | UUID NOT NULL | FK `objects(id) ON DELETE CASCADE` |
| target_id | UUID NOT NULL | FK `objects(id) ON DELETE CASCADE` |
| relation_type | TEXT NOT NULL | `'link'` or `'mention'` (CHECK constraint) |
| source_property | TEXT | Which property created this relation |
| context | JSONB | Additional context (e.g., block_id for inline mentions) |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |

Constraints:
- `UNIQUE(source_id, target_id, relation_type, source_property)` -- no duplicate relations
- `CHECK (source_id != target_id)` -- no self-references
- `CHECK (relation_type IN ('link', 'mention'))` -- enforced at DB level

Relation types:
- **mention**: Auto-synced from editor content on every save. The `extractMentionIds()` function walks the Plate content tree, and `syncMentions()` diffs existing mention relations vs current content.
- **link**: Manually created via the UI.

### templates

Reusable content templates for creating new objects with pre-filled content.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| name | TEXT NOT NULL | Unique per (type_id, space_id), case-insensitive |
| type_id | UUID NOT NULL | FK `object_types(id) ON DELETE CASCADE` |
| owner_id | UUID | FK `auth.users(id) ON DELETE CASCADE` |
| space_id | UUID NOT NULL | FK `spaces(id) ON DELETE CASCADE` |
| icon | TEXT | |
| cover_image | TEXT | |
| properties | JSONB NOT NULL | Default `'{}'` |
| content | JSONB | Plate.js editor state |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Auto-updated via trigger |

Templates were originally stored as `is_template = true` rows in the objects table. Migration 009 extracted them into a separate table.

### tags

Labels for categorizing objects within a space.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| space_id | UUID NOT NULL | FK `spaces(id) ON DELETE CASCADE` |
| name | TEXT NOT NULL | Unique per space (case-insensitive) |
| color | TEXT | Hex color string |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Auto-updated via trigger |

### object_tags

Junction table for the many-to-many relationship between objects and tags.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| object_id | UUID NOT NULL | FK `objects(id) ON DELETE CASCADE` |
| tag_id | UUID NOT NULL | FK `tags(id) ON DELETE CASCADE` |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |

Constraint: `UNIQUE(object_id, tag_id)`.

### pins

Bookmarked objects for quick access, scoped per user.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| user_id | UUID NOT NULL | FK `auth.users(id) ON DELETE CASCADE` |
| object_id | UUID NOT NULL | FK `objects(id) ON DELETE CASCADE` |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |

Constraint: `UNIQUE(user_id, object_id)`.

### space_shares

Multi-user access control. Allows a space owner to share their space with other users.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| space_id | UUID NOT NULL | FK `spaces(id) ON DELETE CASCADE` |
| owner_id | UUID NOT NULL | FK `auth.users(id) ON DELETE CASCADE` |
| shared_with_id | UUID NOT NULL | FK `auth.users(id) ON DELETE CASCADE` |
| shared_with_email | TEXT NOT NULL | Denormalized for display |
| permission | TEXT NOT NULL | `'view'` or `'edit'` (CHECK constraint) |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Auto-updated via trigger |

Constraints:
- `UNIQUE(space_id, shared_with_id)` -- one share per user per space
- `CHECK (owner_id != shared_with_id)` -- cannot share with yourself

### share_exclusions

Fine-grained access control within shared spaces. Can hide specific types, individual objects, or particular fields.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| space_share_id | UUID | FK `space_shares(id) ON DELETE CASCADE`, nullable |
| space_id | UUID | FK `spaces(id) ON DELETE CASCADE`, nullable |
| excluded_type_id | UUID | FK `object_types(id) ON DELETE CASCADE` |
| excluded_object_id | UUID | FK `objects(id) ON DELETE CASCADE` |
| excluded_field | TEXT | Field name to hide |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |

Two scoping modes (exactly one must be set):
- **Per-share** (`space_share_id` is set, `space_id` is NULL): Exclusion applies only to one specific shared user.
- **Space-wide** (`space_id` is set, `space_share_id` is NULL): Exclusion applies to all shared users of that space.

Three exclusion kinds (exactly one pattern):
- Type-only: `excluded_type_id` set, others NULL -- hides all objects of that type
- Object-only: `excluded_object_id` set, others NULL -- hides one specific object
- Type+field: `excluded_type_id` + `excluded_field` set -- hides a field across a type

### saved_views

Persisted filter/sort configurations for type listings.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| space_id | UUID NOT NULL | FK `spaces(id) ON DELETE CASCADE` |
| type_id | UUID NOT NULL | FK `object_types(id) ON DELETE CASCADE` |
| name | TEXT NOT NULL | |
| filters | JSONB NOT NULL | Default filter structure with search, select, checkbox, tag, date, number, text filters |
| sort | JSONB NOT NULL | Default `{"field":"updated_at","direction":"desc"}` |
| view_mode | TEXT NOT NULL | `'table'`, `'list'`, `'card'`, or `'board'` (CHECK constraint) |
| board_group_field_id | UUID | Field ID used for board columns |
| is_default | BOOLEAN NOT NULL | Default `false`. Unique per (type_id, owner_id) when true |
| owner_id | UUID NOT NULL | FK `auth.users(id) ON DELETE CASCADE` |
| created_at | TIMESTAMPTZ NOT NULL | Default `now()` |
| updated_at | TIMESTAMPTZ NOT NULL | Auto-updated via trigger |

---

## Entity Relationship Diagram

```
                                    auth.users
                                    ----------
                                    id (PK)
                                        |
            +---------------------------+---------------------------+
            |               |           |           |               |
            v               v           v           v               v
        spaces          pins      space_shares  saved_views    object_types
        ------          ----      ------------  -----------    ------------
        id (PK)         id (PK)   id (PK)       id (PK)        id (PK)
        name            user_id   space_id ---+  space_id       name
        icon            object_id owner_id    |  type_id ----+  slug
        owner_id ------+         shared_with  |  name        |  fields
        is_archived     |        permission   |  filters     |  owner_id
        created_at      |        email        |  sort        |  space_id ---+
        updated_at      |                     |  view_mode   |  sort_order  |
            |           |           |         |  owner_id    |  is_archived |
            |           |           v         |              |              |
            |           |  share_exclusions   |              |              |
            |           |  ----------------   |              |              |
            |           |  id (PK)            |              |              |
            |           |  space_share_id     |              |              |
            |           |  space_id           |              |              |
            |           |  excluded_type_id --+----->--------+              |
            |           |  excluded_object_id |                             |
            |           |  excluded_field     |                             |
            |           |                     |                             |
            +--------+--+---------------------+-----------------------------+
                     |                        |
                     v                        |
                  objects                     |
                  -------                     |
                  id (PK)                     |
                  title                       |
                  type_id ---------> object_types
                  owner_id --------> auth.users
                  space_id --------> spaces
                  parent_id -------> objects (self)
                  icon
                  cover_image
                  properties
                  content
                  sort_order
                  is_deleted
                  is_archived
                  created_at
                  updated_at
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
  object_relations  object_tags  templates
  ----------------  -----------  ---------
  id (PK)           id (PK)      id (PK)
  source_id -+      object_id    name
  target_id -+      tag_id ----> tags   type_id -----> object_types
  relation_type                  space_id ----> spaces
  source_property                owner_id
  context                        properties
                                 content
```

### Cardinality Summary

| Relationship | Cardinality |
|-------------|-------------|
| `auth.users` -> `spaces` | 1:N (one user owns many spaces) |
| `spaces` -> `objects` | 1:N (one space contains many objects) |
| `spaces` -> `object_types` | 1:N (one space has many types) |
| `spaces` -> `templates` | 1:N |
| `spaces` -> `tags` | 1:N |
| `spaces` -> `space_shares` | 1:N (one space shared with many users) |
| `spaces` -> `saved_views` | 1:N |
| `object_types` -> `objects` | 1:N (one type has many objects) |
| `object_types` -> `templates` | 1:N |
| `object_types` -> `saved_views` | 1:N |
| `objects` -> `objects` | 1:N (parent-child hierarchy) |
| `objects` <-> `objects` via `object_relations` | M:N |
| `objects` <-> `tags` via `object_tags` | M:N |
| `auth.users` -> `pins` | 1:N |
| `objects` -> `pins` | 1:N |
| `space_shares` -> `share_exclusions` | 1:N |

---

## RLS Policy Design

Every table has RLS enabled. The policies follow a consistent pattern.

### Owner-Based Access

For tables with an `owner_id` column (objects, object_types, templates, spaces), the base pattern is:

```sql
-- Read: own data + shared space data
FOR SELECT USING (
  auth.uid() = owner_id
  OR user_has_space_access(auth.uid(), space_id)
)

-- Write: own data in editable spaces
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  AND user_can_edit_space(auth.uid(), space_id)
)

-- Delete: owner only (not shared users)
FOR DELETE USING (auth.uid() = owner_id)
```

### Space-Scoped Access

For tables without their own `owner_id` (tags, object_tags), policies check space membership via the parent object or space:

```sql
-- tags: space access check
FOR SELECT USING (user_has_space_access(auth.uid(), space_id))
FOR INSERT WITH CHECK (user_can_edit_space(auth.uid(), space_id))
```

### Helper Functions

The sharing model relies on three SECURITY DEFINER helper functions:

```sql
-- Can the user see this space at all? (owner OR shared recipient)
user_has_space_access(p_user_id UUID, p_space_id UUID) -> BOOLEAN

-- Can the user write to this space? (owner OR edit-permission share)
user_can_edit_space(p_user_id UUID, p_space_id UUID) -> BOOLEAN

-- Is this object hidden from the user via an exclusion?
is_object_excluded(p_user_id UUID, p_object_id UUID) -> BOOLEAN
```

Objects get an additional exclusion check in their SELECT policy:

```sql
CREATE POLICY "Users can read accessible objects" ON objects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR (
      user_has_space_access(auth.uid(), space_id)
      AND NOT is_object_excluded(auth.uid(), id)
    )
  );
```

### SECURITY DEFINER Functions

Functions that bypass RLS must follow two rules:

1. **Set `search_path`**: `SECURITY DEFINER SET search_path = public` -- auth triggers run in a context where `public` is not in the search path.
2. **Fully qualify table names**: Use `public.spaces`, `public.objects`, etc. inside the function body.

Failure to do either causes silent failures where the function cannot find the tables.

### Pins and Saved Views

These tables use simpler per-user policies:

```sql
-- pins: user_id = auth.uid()
-- saved_views: owner_id = auth.uid()
```

### Storage Policies

The `uploads` bucket uses folder-based ownership. Files live under `{user_id}/filename`, and policies enforce that users can only write to their own folder:

```sql
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
```

The bucket is public for reads (anyone can view uploaded images).

---

## Migration History

All migrations are in `apps/web/supabase/migrations/`. Here is the full chronological evolution.

### 001_extensions.sql -- PostgreSQL Extensions

Enables `uuid-ossp` for UUID generation and `pg_trgm` for trigram-based fuzzy text search.

### 002_objects.sql -- Initial Objects Table

Creates the `objects` table with a string `type` column (`'page' | 'note'`), basic RLS policies (owner-only), and trigram index on title.

### 003_object_relations.sql -- Object Relations

Creates `object_relations` for graph view and bidirectional links. Includes uniqueness constraint and self-reference prevention.

### 004_sharing.sql -- Sharing Model v1 (Workspace-Level)

Creates `workspace_shares` and `share_exclusions` tables for workspace-level sharing. This was later replaced entirely by space-level sharing in migration 011.

### 005_functions.sql -- RPC Functions and Triggers

Creates `update_updated_at()` trigger function, `search_objects()` for full-text search with trigram matching, and `get_graph_data()` for graph visualization. Both search functions were later dropped in migration 024 as a security fix (IDOR vulnerability from client-controllable `user_id` parameter).

### 006_object_types.sql -- Object Types Table

The big schema upgrade. Creates `object_types` table with JSONB `fields` column. Adds `type_id` UUID FK to objects, migrates existing string `type` values to UUID references, drops the old `type` column. Seeds global built-in Page and Note types with well-known UUIDs.

### 007_update_functions.sql -- Update RPC Functions

Updates `search_objects()` and `get_graph_data()` to use the new `type_id` column instead of the dropped `type` string column.

### 008_plural_name.sql -- Plural Names

Adds `plural_name` column to `object_types` for proper pluralization in the UI ("3 Pages" not "3 Page").

### 009_templates.sql -- Templates Table

Extracts templates from the objects table into a dedicated `templates` table. Migrates existing `is_template = true` objects, then drops the `is_template` column.

### 010_spaces.sql -- Multi-Space Support

The largest migration. Creates the `spaces` table and adds `space_id` FK to objects, object_types, and templates. Backfills existing data by creating a default "My Space" for each user. Makes `space_id` NOT NULL on objects and templates (nullable on object_types for built-in types). Creates the `handle_new_user_space()` trigger to auto-create a space on user signup.

### 011_sharing.sql -- Sharing Model v2 (Per-Space)

Drops the old workspace-level sharing tables from migration 004. Creates `space_shares` and new `share_exclusions` with space-scoped sharing. Introduces the three SECURITY DEFINER helper functions (`user_has_space_access`, `user_can_edit_space`, `is_object_excluded`). Rewrites all RLS policies on objects, object_types, templates, and object_relations to support shared access with exclusion checks.

### 012_remove_built_in_types.sql -- Remove Built-In Types

Converts global built-in Page and Note types into regular per-space, user-owned types. For each existing space, creates user-owned copies and remaps all FK references. Deletes the global built-in rows. Removes `is_built_in` from RLS policies. Updates the new-user trigger to seed only a Page type (no Note) in the new space.

### 013_tags.sql -- Tags

Creates `tags` and `object_tags` tables with space-scoped RLS policies. Tags are unique per space by name.

### 014_pins.sql -- Pins

Creates `pins` table for per-user bookmarks. Simple user-scoped RLS.

### 015_space_wide_exclusions.sql -- Space-Wide Exclusions

Extends `share_exclusions` to support space-wide exclusions (apply to all shared users) in addition to per-share exclusions. Makes `space_share_id` nullable and adds `space_id` column. Updates `is_object_excluded()` function to check both scopes.

### 016_storage.sql -- File Uploads

Creates the `uploads` storage bucket (public read, 3 MB limit, image MIME types only). Sets up folder-based ownership policies.

### 017_leave_space.sql -- Leave Space

Updates the DELETE policy on `space_shares` so shared recipients can delete their own share record (leave a space), not just owners.

### 018_realtime.sql -- Realtime

Adds all data tables to the `supabase_realtime` publication for Supabase Realtime subscriptions.

### 019_fix_shared_user_insert.sql -- Shared User Insert Fix

Re-applies `user_can_edit_space()` and the objects INSERT policy to fix a bug where shared users with edit permission could not create objects.

### 020_cascade_delete_types.sql -- Cascade Delete Types

Adds `ON DELETE CASCADE` to `objects.type_id` and `templates.type_id` FKs. Deleting a type now cascades to all its objects and templates.

### 021_global_types.sql -- Global Types Index

Splits the unique index on `object_types` into two partial indexes: one for space-scoped types `(space_id, slug)` and one for global types `(owner_id, slug)`. The global types index was later dropped in migration 026 because the COALESCE-based index from 021_unique_name_constraints superseded it.

### 021_unique_name_constraints.sql -- Unique Name Constraints

Note: there are two files with the `021` prefix (a duplicate). This one enforces case-insensitive uniqueness for spaces (per owner), object type slugs (per space), and template names (per type+space). Deduplicates existing data before adding indexes.

### 022_archive.sql -- Archive Support

Adds `is_archived` and `archived_at` columns to objects, object_types, and spaces. Creates partial indexes for filtering archived items.

### 023_saved_views.sql -- Saved Views

Creates the `saved_views` table for persisted filter/sort/view-mode configurations. Supports table, list, card, and board view modes. Only one default view allowed per (type, owner).

### 024_drop_unused_rpcs.sql -- Security Cleanup

Drops `search_objects()` and `get_graph_data()` functions. These were SECURITY DEFINER functions that accepted a client-controllable `user_id` parameter, creating an IDOR vulnerability. The application now uses RLS-protected direct table queries instead.

### 025_remove_svg_uploads.sql -- SVG Security

Removes `image/svg+xml` from allowed MIME types in the uploads bucket. SVG files can contain embedded scripts and event handlers.

### 026_indexes_triggers_hardening.sql -- Database Audit P1

A batch of security and performance fixes:
- Makes `objects.owner_id` NOT NULL and hardens the INSERT policy to require `owner_id = auth.uid()`
- Adds `updated_at` triggers on `spaces` and `space_shares`
- Creates composite index `objects(space_id, type_id, updated_at DESC) WHERE is_deleted = false AND is_archived = false` for the hot path
- Creates composite index on `object_relations(source_id, relation_type)` for `syncMentions()`
- Adds partial indexes on `share_exclusions` for `is_object_excluded()`
- Adds composite index on `space_shares(space_id, shared_with_id)` for helper functions
- Drops stale/redundant indexes from earlier migrations
- Replaces full boolean index on `is_deleted` with a partial index

### 027_constraints_cleanup.sql -- Database Audit P2

More audit fixes:
- CHECK constraint on `object_relations.relation_type` (only `'link'` or `'mention'`)
- CHECK constraint on `saved_views.view_mode` (only `'table'`, `'list'`, `'card'`, `'board'`)
- Case-insensitive tag uniqueness (deduplicates existing tags)
- Makes `object_types.owner_id` NOT NULL (all types have owners since migration 012)
- Drops dead `is_built_in` column from `object_types`
- Changes `saved_views` PK default to `gen_random_uuid()` for consistency
- Adds `saved_views` to realtime publication

### 028_value_constraints.sql -- Value Constraints

Adds DB-level CHECK constraints that match Zod validation:
- `objects.title` max 255 characters
- `objects.cover_image` max 2048 characters (or NULL)

### 029_object_sort_order.sql -- Object Sort Order

Adds `sort_order INT NOT NULL DEFAULT 0` to objects for manual entry ordering within a type. Creates index on `(type_id, sort_order ASC)`.

### 030_fix_new_user_trigger.sql -- Fix New User Trigger

Updates `handle_new_user_space()` to remove reference to the dropped `is_built_in` column. The trigger now inserts `(name, plural_name, slug, icon, fields, owner_id, space_id, sort_order)` without `is_built_in`.

---

## RPC Functions

After migration 024 dropped the original search/graph functions, the remaining server-side functions are:

### Trigger Functions

**`update_updated_at()`** -- Generic trigger that sets `NEW.updated_at = now()`. Used on objects, object_types, templates, tags, spaces, space_shares, and saved_views.

**`handle_new_user_space()`** -- Fires `AFTER INSERT ON auth.users`. Seeds a default "My Space" and a "Page" object type for every new user.

```sql
CREATE OR REPLACE FUNCTION handle_new_user_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_space_id UUID;
BEGIN
  INSERT INTO public.spaces (name, owner_id)
    VALUES ('My Space', NEW.id) RETURNING id INTO new_space_id;
  INSERT INTO public.object_types (name, plural_name, slug, icon, fields, owner_id, space_id, sort_order)
    VALUES ('Page', 'Pages', 'page', 'file-text', '[]', NEW.id, new_space_id, 0);
  RETURN NEW;
END;
$$;
```

### Security Helper Functions

**`user_has_space_access(p_user_id, p_space_id)`** -- Returns true if the user owns the space or has a share record for it.

**`user_can_edit_space(p_user_id, p_space_id)`** -- Returns true if the user owns the space or has a share with `permission = 'edit'`.

**`is_object_excluded(p_user_id, p_object_id)`** -- Returns true if the object is hidden from the user via a per-share or space-wide exclusion.

**`find_user_by_email(p_email)`** -- Looks up a user by email in `auth.users`. Used when creating shares by email address.

---

## Dexie (Local Database)

The local database uses [Dexie.js](https://dexie.org/), a wrapper around IndexedDB. It provides guest mode (no account needed) and offline capability.

### Location

```
apps/web/src/shared/lib/data/local.ts
```

### Schema (Version 14, current)

```typescript
{
  objects:         'id, title, type_id, parent_id, is_deleted, is_archived, updated_at, space_id, sort_order',
  objectTypes:     'id, name, slug, owner_id, sort_order, is_archived, space_id',
  templates:       'id, name, type_id, owner_id, updated_at, space_id',
  objectRelations: 'id, source_id, target_id, relation_type, created_at',
  spaces:          'id, name, owner_id, created_at',
  tags:            'id, name, space_id',
  objectTags:      'id, object_id, tag_id, [object_id+tag_id]',
  pins:            'id, object_id',
  savedViews:      'id, type_id, space_id, owner_id, is_default',
}
```

The Dexie store definitions list indexed fields (not all columns). Dexie stores any additional properties on the objects even if they are not indexed. The `[object_id+tag_id]` syntax creates a compound index for uniqueness enforcement.

### Constants

```typescript
const LOCAL_DEFAULT_SPACE_ID = '00000000-0000-0000-0000-000000000099'
const LOCAL_OWNER_ID = '00000000-0000-0000-0000-00000000006c'
const LOCAL_DEFAULT_PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'
```

### Version History (14 versions)

| Version | What Changed |
|---------|-------------|
| 1 | Initial: `objects` table only, with string `type` field |
| 2 | Add `objectTypes` table, migrate `type` string to `type_id` UUID FK, seed legacy built-in types |
| 3 | Add `plural_name` to object types |
| 4 | Extract templates from objects into `templates` table, remove `is_template` field |
| 5 | Add `objectRelations` table |
| 6 | Add `spaces` table, backfill `space_id` on objects/types/templates, create default local space |
| 7 | Convert built-in types to regular space-scoped types, delete Note type if unused |
| 8 | Add `tags` and `objectTags` tables |
| 9 | Add `pins` table |
| 10 | Add `is_archived` / `archived_at` to objects, types, and spaces |
| 11 | Add `savedViews` table |
| 12 | Add compound index `[object_id+tag_id]` on objectTags for uniqueness |
| 13 | Migrate `owner_id` from `'local'` string to `LOCAL_OWNER_ID` UUID constant |
| 14 | Add `sort_order` to objects for manual ordering |

### Seeding

On a fresh database (no prior data), the local client seeds:
- One space ("My Space") with `LOCAL_DEFAULT_SPACE_ID`
- One Page type with `LOCAL_DEFAULT_PAGE_TYPE_ID` in that space

Only the Page type is seeded -- no Note type for new databases (matching the Supabase behavior since migration 012).

### Local-to-Supabase Migration

When a guest user creates an account, data is migrated from Dexie to Supabase. The migration maps type IDs by slug (not by UUID), since local and remote type IDs differ. The `exportLocalData()` function returns all local data for migration:

```typescript
exportLocalData() -> { objects, objectTypes, templates, objectRelations, spaces }
```

---

## Gotchas

1. **Unique index on object_types is `COALESCE(space_id, ...), LOWER(slug)`** -- not just `slug`. The same slug can exist in different spaces. The `COALESCE` handles NULL `space_id` for global types.

2. **`BUILT_IN_TYPE_IDS` constant still exists in `types.ts`** -- but it is only used for Dexie v2 migration backward compatibility. There are no built-in types in the current schema.

3. **`fields` on object_types is JSONB, not a separate table** -- changes to field definitions are atomic (the entire array is replaced). This simplifies writes but means you cannot query individual fields via SQL.

4. **Cascade deletes from type deletion** -- Deleting an `object_type` cascades to: all `objects` of that type (which cascades to `object_relations`, `object_tags`, `pins`), all `templates` of that type, and all `saved_views` for that type. This is intentional but can be surprising.

5. **SECURITY DEFINER functions need `SET search_path = public`** -- Without this, functions cannot find tables when called from auth triggers. Always fully qualify table names (e.g., `public.spaces`).

6. **Migrations must be manually applied to remote Supabase** -- There is no auto-deployment pipeline. Run migrations manually via the Supabase dashboard or CLI.

7. **Zod 4 requires RFC4122-compliant UUIDs in tests** -- Synthetic UUIDs like `00000000-0000-0000-0000-000000000001` are valid RFC4122, but random-looking strings are not. Use `crypto.randomUUID()` or the constants defined in the codebase.

8. **Two duplicate `021` migration prefixes** -- `021_global_types.sql` and `021_unique_name_constraints.sql` both exist. The global types index from the first was later dropped in migration 026. Be aware of this when reading the migration history.

9. **Soft delete vs archive** -- Objects support both `is_deleted` (trash, 90-day TTL) and `is_archived` (hidden but preserved). These are independent flags.

10. **`parent_id` uses `ON DELETE SET NULL`** -- Deleting a parent object does NOT delete its children. They become top-level objects instead.

---

## Exercises

1. **Read migration 010** (`apps/web/supabase/migrations/010_spaces.sql`) and trace how `space_id` was added to existing tables. Understand the backfill strategy: how it creates a default space per user and assigns all existing data to it. Why is `space_id` NOT NULL on objects but nullable on object_types?

2. **Trace the search path** -- The original `search_objects` RPC (created in 005, updated in 007, dropped in 024) was replaced by direct table queries with RLS. Find the current search implementation in the data client layer (`apps/web/src/shared/lib/data/supabase.ts`) and trace it from the SQL query through the DataClient method to the React hook.

3. **Compare Dexie and Supabase schemas** -- Open `apps/web/src/shared/lib/data/local.ts` and compare the Dexie v14 schema to the Supabase tables. What columns exist in Supabase that Dexie does not index? What tables exist in Supabase that Dexie does not have (and why)?

4. **Map the cascade chain** -- Starting from `object_types`, trace every cascade delete path. If you delete a type, what other records are deleted? Draw the full chain. Then do the same starting from `spaces`. Which table has the largest blast radius?
