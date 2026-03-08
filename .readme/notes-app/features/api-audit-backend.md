# API Audit (Backend)

**Status:** Done

## Overview

Audit of Supabase backend APIs for correctness, security, and consistency. Covered RLS policies, cascade delete behavior, duplicate name constraints, shared user permissions, and database function safety.

## Findings & Fixes

### RLS & Permissions

| Issue | Fix | Migration |
|-------|-----|-----------|
| Object type creation failed with RLS violation | Fixed INSERT policy for object types | 008 (original fix in early commits) |
| Shared users couldn't create entries in shared spaces | Re-applied RLS INSERT policy on objects for shared users | 019_fix_shared_user_insert |
| SECURITY DEFINER functions ran without `public` in search_path | Added `SET search_path = public` and fully qualified table names (e.g. `public.spaces`) to all SECURITY DEFINER functions | Various |

### Cascade Deletes

| Issue | Fix | Migration |
|-------|-----|-----------|
| Deleting a type left orphaned objects and templates | Added `ON DELETE CASCADE` to type FKs | 020_cascade_delete_types |
| Supabase `.delete()` returned success even when 0 rows matched | Added `.select()` after delete to detect silent failures; invalidate caches after type deletion | Frontend fix |
| Dexie type deletion didn't cascade | Added cascade logic for objects, relations, tags, and pins in Dexie client | Frontend fix |

### Unique Constraints

| Issue | Fix | Migration |
|-------|-----|-----------|
| Duplicate names allowed for spaces, types, templates, and tags | Added case-insensitive unique constraints in Supabase; pre-mutation Dexie checks; surfaced `DUPLICATE` errors in UI | 021_global_types (per-owner slug index) |

### Space Management

| Issue | Fix | Migration |
|-------|-----|-----------|
| No way to leave a shared space | Added `leave_space` RPC function | 017_leave_space |
| Space-wide share exclusions not supported | Added space-wide exclusion model | 015_space_wide_exclusions |

## Regression Tests

Added 140 regression tests across 17 test files covering:
- Object CRUD and lifecycle (create, update, soft delete, restore, permanent delete, purge)
- Object type CRUD with field management
- Template CRUD and variable substitution
- Tag operations (create, rename, delete, assign, unassign)
- Pin operations (pin, unpin, list)
- Space CRUD
- Relation CRUD
- Search functionality

## Verification

- [x] RLS policies enforce correct access for owners, shared users, and guests
- [x] Type deletion cascades to objects, templates, relations, tags, and pins
- [x] Duplicate names rejected at database level with user-facing error messages
- [x] Shared users can create, edit, and delete entries in shared spaces
- [x] SECURITY DEFINER functions use explicit search_path
- [x] 140 regression tests pass
