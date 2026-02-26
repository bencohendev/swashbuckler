# Database Audit

**Status:** Not started

## Overview

Review of database schema design, query performance, migration hygiene, and Supabase/Dexie parity. Focuses on structural correctness, index coverage, and operational efficiency rather than RLS policy logic (covered in the Backend API Audit).

## Scope

### In Scope
- Schema design (normalization, naming, types, nullability)
- Index coverage and query performance
- N+1 query detection in data hooks
- RLS function performance (SECURITY DEFINER overhead)
- Foreign key cascades and constraint completeness
- Migration file hygiene and ordering
- Realtime subscription efficiency
- Dexie schema parity with Supabase
- Data integrity edge cases (orphaned records, dangling references)

### Out of Scope
- RLS policy correctness / permission logic (covered in [API Audit — Backend](api-audit-backend.md))
- Frontend data fetching patterns (covered in [Client API Audit](client-api-audit.md))

## Audit Areas

### 1. Schema Design Review

**Checks:**
- Table naming conventions (consistent plural/singular)
- Column types appropriate (UUID vs text, timestamptz vs timestamp)
- Nullability correct (required fields NOT NULL, optional fields nullable)
- Default values present where needed (created_at, updated_at, UUIDs)
- `updated_at` triggers on all mutable tables
- No redundant columns or denormalization without justification

**Key Files:**
- `supabase/migrations/001-022` — all migration files
- `src/shared/lib/data/types.ts` — Zod schemas (should mirror DB)

**Pass Criteria:**
- Consistent naming across all 22 migrations
- No unintentional nullability gaps
- Zod schemas match DB column constraints

### 2. Index Coverage

**Checks:**
- Foreign key columns indexed (space_id, owner_id, type_id, etc.)
- Composite indexes for common query patterns (e.g., space_id + type_id)
- Text search indexes (pg_trgm on object name)
- Unique indexes where needed (slug + space, tag name + space)
- No redundant or unused indexes
- Index types appropriate (btree vs gin vs gist)

**Key Files:**
- `supabase/migrations/003_objects.sql` — object indexes
- `supabase/migrations/007_object_relations.sql` — relation indexes
- `supabase/migrations/013_tags.sql` — tag indexes
- `supabase/migrations/021_global_types.sql` — type slug index

**Pass Criteria:**
- All FK columns have indexes
- Common query patterns (list by space, filter by type) use indexes
- No sequential scans on large tables for standard operations

### 3. N+1 Query Detection

**Checks:**
- Data hooks that fetch lists then individual items
- Sidebar rendering (types → objects per type)
- Type pages (objects + their relations + tags)
- Graph data (objects + relations in single query vs multiple)
- Dashboard (pinned + recent — separate queries or batched)
- Template listing with variable resolution

**Key Files:**
- `src/shared/lib/data/supabase.ts` — Supabase query functions
- `src/shared/lib/data/local.ts` — Dexie query functions
- `src/features/*/hooks/` — data fetching hooks

**Pass Criteria:**
- No N+1 patterns in standard views (sidebar, type page, dashboard)
- Batch queries or joins used where multiple related entities needed

### 4. RLS Function Performance

**Checks:**
- SECURITY DEFINER function count and complexity
- Functions avoid unnecessary table scans
- `search_path` set correctly on all functions
- Functions use appropriate parameter types (avoid implicit casts)
- Volatile vs stable vs immutable correctly annotated
- Function-based RLS policies don't cause per-row overhead

**Key Files:**
- `supabase/migrations/005_functions.sql` — RPC functions
- `supabase/migrations/017_leave_space.sql` — leave_space function
- All migrations with `CREATE POLICY` statements

**Pass Criteria:**
- RLS helper functions marked `STABLE` where possible
- No full table scans in policy evaluations
- `search_path` explicitly set on all SECURITY DEFINER functions

### 5. Cascade & Constraint Completeness

**Checks:**
- All FK relationships have appropriate ON DELETE behavior
- Cascade chains don't leave orphans (type → objects → relations → tags)
- Space deletion cascades correctly to all child entities
- User deletion / account cleanup handled
- Check constraints on enum-like columns (relation_type, etc.)
- Unique constraints cover all business rules

**Key Files:**
- `supabase/migrations/020_cascade_delete_types.sql`
- `supabase/migrations/022_archive.sql`
- All migrations with `REFERENCES` clauses

**Pass Criteria:**
- Deleting a space removes all types, objects, relations, tags, pins, shares
- Deleting a type removes all objects, templates, relations
- No orphaned records possible through any delete path

### 6. Migration Hygiene

**Checks:**
- Migrations are idempotent (safe to re-run or skip)
- No data loss in migration steps
- Migrations ordered correctly (no forward references)
- Rollback path exists (or documented as irreversible)
- No migrations modify existing data without a backup strategy
- Column additions use appropriate defaults for existing rows

**Key Files:**
- `supabase/migrations/001-022` — all files

**Pass Criteria:**
- Each migration is self-contained
- No migration depends on runtime data that may not exist
- Naming convention consistent (NNN_description.sql)

### 7. Realtime Subscription Efficiency

**Checks:**
- Realtime publication covers only needed tables
- Channel names are specific (not wildcard subscriptions)
- Subscription cleanup on component unmount
- No redundant subscriptions (same data watched multiple ways)
- Broadcast message size reasonable

**Key Files:**
- `supabase/migrations/018_realtime.sql` — publication config
- `src/features/editor/lib/SupabaseYjsProvider.ts` — realtime provider
- `src/shared/lib/data/supabase.ts` — any `.on()` subscriptions

**Pass Criteria:**
- Only tables requiring realtime are published
- Subscriptions scoped to specific records where possible
- Provider cleanup prevents zombie connections

### 8. Dexie Schema Parity

**Checks:**
- Dexie table definitions match Supabase schema
- Indexes in Dexie cover the same query patterns as Supabase
- Dexie version migrations handle all schema changes
- Local default IDs (space, user) don't collide with Supabase UUIDs
- Cascade logic in Dexie matches Supabase FK cascades
- Data export format (`exportLocalData()`) captures all tables

**Key Files:**
- `src/shared/lib/data/local.ts` — Dexie schema and operations
- `src/shared/lib/data/types.ts` — shared types
- `src/features/export/` — export logic

**Pass Criteria:**
- Feature parity: anything stored in Supabase is also stored in Dexie
- Cascade deletes in Dexie match Supabase behavior
- Export captures complete local state

### 9. Data Integrity Edge Cases

**Checks:**
- Concurrent modification handling (last-write-wins vs conflict detection)
- Archive/soft-delete interaction with unique constraints
- Circular relation prevention (object A → B → A)
- Maximum content size handling (Plate JSON in `content` column)
- Timezone handling consistency (all timestamptz)
- UUID generation consistency (v4 everywhere)

**Key Files:**
- `src/shared/lib/data/` — both data clients
- `supabase/migrations/022_archive.sql` — archive schema

**Pass Criteria:**
- No constraint violations possible through normal app usage
- Archived items don't block new items with same names
- Content size limits documented or enforced

## Methodology

1. Schema review: read all 22 migrations sequentially, build mental model
2. Index analysis: compare query patterns in data hooks against available indexes
3. N+1 detection: trace data flow from UI components through hooks to queries
4. Parity check: side-by-side comparison of Supabase and Dexie schemas
5. Edge case testing: attempt boundary conditions (max content, rapid mutations)

## Deliverables

- Schema diagram (or text description) of current state
- Findings table with severity and affected migrations
- Fix PRs for missing indexes, cascade gaps, constraint issues
- Recommendations for performance improvements
- Updated spec with final results
