# Supabase RPC Functions & Triggers

All server-side functions and triggers defined in Supabase migrations.

**Source:** `apps/web/supabase/migrations/`

## Functions

### search_objects

```sql
search_objects(search_query TEXT, user_id UUID, result_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, title TEXT, type TEXT, icon TEXT, is_template BOOLEAN, updated_at TIMESTAMPTZ, similarity REAL)
```

**Security:** SECURITY DEFINER
**Migration:** 005

Full-text title search using pg_trgm similarity matching. Returns non-deleted objects owned by the user, sorted by similarity score then recency.

### get_graph_data

```sql
get_graph_data(user_id UUID)
RETURNS JSON
```

**Security:** SECURITY DEFINER
**Migration:** 005

Returns JSON with `{ nodes[], edges[] }` — all non-deleted objects and their relations for the graph view.

### user_has_space_access

```sql
user_has_space_access(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN
```

**Security:** SECURITY DEFINER SET search_path = public
**Volatility:** STABLE
**Migration:** 011

Returns true if user owns the space OR has a `space_shares` record. Used in RLS policies for SELECT access.

### user_can_edit_space

```sql
user_can_edit_space(p_user_id UUID, p_space_id UUID)
RETURNS BOOLEAN
```

**Security:** SECURITY DEFINER SET search_path = public
**Volatility:** STABLE
**Migration:** 011

Returns true if user owns the space OR has `permission = 'edit'` via `space_shares`. Used in RLS policies for INSERT/UPDATE.

### is_object_excluded

```sql
is_object_excluded(p_user_id UUID, p_object_id UUID)
RETURNS BOOLEAN
```

**Security:** SECURITY DEFINER SET search_path = public
**Volatility:** STABLE
**Migrations:** 011, 015 (updated for space-wide exclusions)

Two-tier exclusion check:
1. **Per-share:** exclusion linked via `space_share_id` to the user's share
2. **Space-wide:** exclusion linked via `space_id` (applies to all non-owner shared users)

Checks both `excluded_type_id` (type-level) and `excluded_object_id` (entry-level).

### find_user_by_email

```sql
find_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT)
```

**Security:** SECURITY DEFINER SET search_path = public, auth
**Volatility:** STABLE
**Migration:** 011

Looks up a user by email in `auth.users`. Used by the sharing flow to resolve email → user ID.

### handle_new_user_space

```sql
handle_new_user_space()
RETURNS TRIGGER
```

**Security:** SECURITY DEFINER SET search_path = public
**Trigger:** AFTER INSERT ON auth.users
**Migrations:** 010, 012 (updated)

Auto-creates a "My Space" and seeds a Page type for new users. Runs as part of the Supabase Auth signup flow.

### update_updated_at

```sql
update_updated_at()
RETURNS TRIGGER
```

**Migration:** 005

Sets `updated_at = now()` on row update. Attached as BEFORE UPDATE trigger on `objects` and `object_types`.

## Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| objects_updated_at | objects | BEFORE UPDATE | update_updated_at() |
| object_types_updated_at | object_types | BEFORE UPDATE | update_updated_at() |
| on_auth_user_created | auth.users | AFTER INSERT | handle_new_user_space() |

## RLS Policy Summary

### Spaces

| Operation | Rule |
|-----------|------|
| SELECT | Owner OR has space_shares record |
| INSERT | Owner (auth.uid() = owner_id) |
| UPDATE | Owner |
| DELETE | Owner |

### Objects

| Operation | Rule |
|-----------|------|
| SELECT | Owner OR (has space access AND not excluded) |
| INSERT | Can edit space (owner OR edit permission) |
| UPDATE | Can edit space |
| DELETE | Owner only |

### Object Types

| Operation | Rule |
|-----------|------|
| SELECT | Owner OR (space_id IS NOT NULL AND has space access) |
| INSERT | Owner |
| UPDATE | Owner |
| DELETE | Owner |

### Templates

| Operation | Rule |
|-----------|------|
| SELECT | Owner OR has space access |
| INSERT | Owner |
| UPDATE | Owner |
| DELETE | Owner |

### Object Relations

| Operation | Rule |
|-----------|------|
| SELECT | Source/target owned by user OR shared without exclusion |
| INSERT | Source object in editable space |
| DELETE | Source object owner |

### Space Shares

| Operation | Rule |
|-----------|------|
| SELECT | Owner OR shared_with_id |
| INSERT | Owner |
| UPDATE | Owner |
| DELETE | Owner OR shared_with_id (recipients can leave) |

### Share Exclusions

| Operation | Rule |
|-----------|------|
| SELECT | Per-share: owner/recipient. Space-wide: space owner or any shared user |
| INSERT | Per-share: share owner. Space-wide: space owner |
| DELETE | Per-share: share owner. Space-wide: space owner |

## Migration Index

| # | File | Purpose |
|---|------|---------|
| 001 | extensions.sql | uuid-ossp, unaccent, pg_trgm |
| 002 | object_types.sql | object_types table + RLS |
| 003 | objects.sql | objects table + indexes + RLS |
| 004 | sharing.sql | workspace_shares, share_exclusions + RLS |
| 005 | functions.sql | search_objects, get_graph_data, update_updated_at |
| 006 | triggers.sql | updated_at triggers, handle_new_user |
| 007 | object_relations.sql | object_relations + indexes + RLS |
| 008 | templates.sql | templates table |
| 009 | built_in_types.sql | well-known UUIDs for Page, Note |
| 010 | spaces.sql | spaces table + handle_new_user_space trigger |
| 011 | sharing.sql | per-space sharing model, RPC functions, updated RLS |
| 012 | remove_builtins.sql | Page/Note as regular per-space types |
| 013 | tags.sql | tags + object_tags tables |
| 014 | pins.sql | per-user pins table |
| 015 | space_wide_exclusions.sql | space-wide exclusions, updated is_object_excluded |
| 016 | storage.sql | uploads bucket + RLS policies |
| 017 | leave_space.sql | recipients can delete their own shares |
| 018 | realtime.sql | enable realtime publication |
| 019 | fix_shared_user_insert.sql | fix INSERT RLS for shared users |
| 020 | cascade_delete_types.sql | ON DELETE CASCADE for type FKs |
| 021 | global_types.sql | per-owner global type slug index |
| 022 | archive.sql | is_archived + archived_at on objects, types, spaces |

## API Routes

### POST /api/account/delete

**Source:** `src/app/api/account/delete/route.ts`

Deletes the authenticated user's account:
1. Validates session via `supabase.auth.getUser()`
2. Uses admin client (service role key) to call `auth.admin.deleteUser(userId)`
3. Database cascades handle cleanup (ON DELETE CASCADE on FKs)

Returns `{ success: true }` or `{ error: string }`.
