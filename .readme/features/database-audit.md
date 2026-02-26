# Database Audit

**Status:** Active

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

---

## Findings Summary

**Total findings: 48** across 9 audit areas.

| Severity | Count |
|----------|------:|
| High | 7 |
| Medium | 21 |
| Low | 12 |
| Info/OK | 8 |

---

## 1. Schema Design

### Findings

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| S1 | **Medium** | Duplicate migration prefix `021_` — `021_global_types.sql` and `021_unique_name_constraints.sql`. Both ran (alphabetical order is deterministic), but leaves a potentially stale `object_types_owner_global_slug_idx` partial index. Needs verification before dropping. | `supabase/migrations/021_*` |
| S2 | **High** | `objects.owner_id` is nullable AND the INSERT RLS policy only checks `user_can_edit_space()` with no `owner_id = auth.uid()` guard. A shared editor could insert objects with `owner_id = NULL` (undeletable) or `owner_id = <someone_else>` (impersonation). The real fix is an RLS `WITH CHECK` + `NOT NULL` constraint. | `002_objects.sql`, `011_sharing.sql` |
| S3 | **Medium** | Missing `updated_at` trigger on `spaces` table. Timestamp stays at initial insert value. Impact depends on whether any code consumes this value — TanStack Query uses time-based staleness, not row timestamps. | `010_spaces.sql` |
| S4 | **Medium** | Missing `updated_at` trigger on `space_shares` table. Permission changes don't update timestamp. | `011_sharing.sql` |
| S5 | **Medium** | `object_relations.relation_type` has no CHECK constraint. App uses `'link'` and `'mention'`; original comment also mentions `'parent'`. Verify no other values are planned before constraining. | `003_object_relations.sql` |
| S6 | **Medium** | `pins.user_id` is `NOT NULL` in DB but `nullable()` in Zod. Zod is more permissive than actual constraint. | `014_pins.sql`, `types.ts` |
| S7 | **Medium** | `object_types.owner_id` still nullable despite no ownerless types after migration 012. Requires data verification before adding NOT NULL. | `006_object_types.sql` |
| S8 | **Low** | `is_built_in` column never dropped from `object_types`. Dead since migration 012. Cosmetic. | `006_object_types.sql` |
| S9 | **Medium** | `saved_views.view_mode` has no CHECK constraint. App defines `'table' | 'list' | 'card' | 'board'` but DB accepts anything. | `023_saved_views.sql` |
| S10 | **Low** | `objects.title` max length (255) enforced only in Zod, not in DB. Only exploitable via direct SQL. | `002_objects.sql`, `types.ts` |
| S11 | **Low** | `cover_image` URL validation only in Zod, not in DB. | `002_objects.sql`, `types.ts` |
| S12 | **Low** | Color regex `^#[0-9a-fA-F]{3,8}$` allows invalid CSS hex lengths (5, 7 digits). Edge case. | `types.ts` |
| S13 | **Medium** | Tag uniqueness is case-sensitive in Supabase but case-insensitive in Dexie. Other entities got case-insensitive indexes in 021 but tags did not. | `013_tags.sql` |
| S14 | **Medium** | `OBJECT_SUMMARY_COLUMNS` in supabase.ts omits `is_archived` and `archived_at`. List queries return objects missing archive fields. Verify UI consumes these before fixing. | `supabase.ts` |
| S15 | **Low** | `saved_views.id` uses `uuid_generate_v4()` instead of `gen_random_uuid()`. Functionally equivalent but inconsistent. | `023_saved_views.sql` |
| S16 | **Low** | `spaces.icon` is nullable in DB but required `z.string()` in Zod (no `.nullable()`). Minor mismatch. | `010_spaces.sql`, `types.ts` |
| S17 | **Low** | `createObjectSchema` allows setting `is_deleted` at creation time. May be intentional for import/restore. | `types.ts` |

### Pass/Fail

- Table naming: **PASS** — consistently plural
- Column types: **PASS** — UUID/timestamptz everywhere
- Nullability: **FAIL** — S2, S6, S7
- Default values: **PASS**
- updated_at triggers: **FAIL** — S3, S4
- Zod parity: **FAIL** — S6, S13, S14

---

## 2. Index Coverage

### Findings

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| I1 | **High** | Missing composite index `objects(space_id, is_deleted)`. Nearly every objects query filters on both columns. Highest-ROI index addition. | `supabase.ts` |
| I2 | **High** | Missing composite index `objects(space_id, type_id)`. Sidebar and type-page queries filter by both. | `supabase.ts` |
| I3 | **Medium** | Missing composite `objects(space_id, updated_at DESC)` for sorted space queries. Covered by the recommended composite in I1/I2 if `updated_at` is included. | `supabase.ts` |
| I4 | **Medium** | Missing composite `object_relations(source_id, relation_type)` for `syncMentions()` on every save. | `supabase.ts` |
| I5 | **Medium** | Missing indexes on `share_exclusions(excluded_type_id)` and `(excluded_object_id)`. The `is_object_excluded()` RLS function joins on these per-row. | `015_space_wide_exclusions.sql` |
| I6 | **Medium** | Potentially stale partial index `object_types_owner_global_slug_idx` — verify whether the COALESCE-based index from `021_unique_name_constraints` subsumes it before dropping. | `021_global_types.sql` |
| I7 | **Low** | Redundant low-selectivity `object_relations_type_idx` on `relation_type` (only 2 distinct values). | `003_object_relations.sql` |
| I8 | **Low** | Full boolean index `objects_is_deleted_idx` — partial `WHERE is_deleted = true` would be more efficient. | `002_objects.sql` |

### Recommended Composite Indexes

```sql
-- Hot path: space-scoped queries with type filter and recency sort
CREATE INDEX objects_space_active_idx
  ON objects(space_id, type_id, updated_at DESC)
  WHERE is_deleted = false AND is_archived = false;

-- Mention sync on every save
CREATE INDEX object_relations_source_type_idx
  ON object_relations(source_id, relation_type);

-- is_object_excluded() performance
CREATE INDEX share_exclusions_type_id_idx
  ON share_exclusions(excluded_type_id) WHERE excluded_type_id IS NOT NULL;
CREATE INDEX share_exclusions_object_id_idx
  ON share_exclusions(excluded_object_id) WHERE excluded_object_id IS NOT NULL;

-- user_has_space_access() / user_can_edit_space() performance
CREATE INDEX space_shares_space_shared_idx
  ON space_shares(space_id, shared_with_id);
```

---

## 3. N+1 Query Detection

### Findings

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| N1 | **High** | `useTagCounts` fires N separate `count(*)` queries (one per tag). TanStack Query caches each individually, but first load and cache invalidation produce N round-trips. Should batch into single `GROUP BY` query. | `src/features/tags/hooks/useTags.ts` |
| N2 | **Medium** | `useExclusionFilter` runs 3 sequential waterfall queries (shares -> per-share exclusions -> space-wide exclusions). Not cached by TanStack Query. Q2 and Q3 could run in parallel at minimum. | `src/features/sharing/hooks/useExclusionFilter.ts` |
| N3 | **High** | `relations.listAll()` fetches all object IDs in space (query 1), then uses them in `IN(...)` for relations (query 2). Large spaces produce huge IN clauses. Should be a single JOIN or subquery. | `supabase.ts` |
| N4 | **Medium** | `is_object_excluded()` RLS function called per-row for shared-space objects. Two SECURITY DEFINER function calls with subqueries per row. Acceptable at small scale; consider inlining as `NOT EXISTS` at scale. | `011_sharing.sql`, `015_space_wide_exclusions.sql` |
| N5 | **Medium** | Sidebar fires 3 overlapping `useObjects` queries with slightly different filters. Should consolidate to one query and derive subsets client-side with `useMemo`. | `Sidebar.tsx`, `useNextTitle.ts` |
| N6 | **Medium** | `getSharedSpaces()` uses 2-query waterfall. Could use Supabase JOIN: `.select('id, permission, spaces(*)')`. | `supabase.ts` |
| N7 | **Medium** | Content search fetches up to 200 full objects (including `content` JSONB) for client-side text matching. Consider server-side `tsvector` search. | `supabase.ts` |

---

## 4. RLS Function Performance

### Findings

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| R1 | — | All SECURITY DEFINER functions have `STABLE` + `SET search_path = public`. | **PASS** |
| R2 | — | Dropped IDOR-vulnerable RPCs (024) and SVG uploads (025) confirmed correct. | **PASS** |
| R3 | **Medium** | `is_object_excluded()` per-row overhead is the main RLS performance concern. Indexes from I5 would help. Inlining as `NOT EXISTS` subquery is an option at scale. | `015_space_wide_exclusions.sql` |
| R4 | **Medium** | Missing composite index `space_shares(space_id, shared_with_id)` — used in `user_has_space_access()` and `user_can_edit_space()` per-row calls. | `011_sharing.sql` |

---

## 5. Cascade & Constraint Completeness

### Supabase Cascades

All cascade chains are **complete**:

| Delete Target | Cascades To | Status |
|---------------|-------------|--------|
| Space | objects, types, templates, tags, shares, exclusions, saved_views, (indirect: relations, object_tags, pins) | **OK** |
| Object Type | objects, templates, saved_views, share_exclusions | **OK** |
| Object | relations (source+target), object_tags, pins, share_exclusions; children get `parent_id = NULL` | **OK** |
| User (auth.users) | spaces (triggers full cascade), direct FKs on objects/types/templates/shares/pins/saved_views | **OK** |
| Tag | object_tags | **OK** |

### Dexie Cascade Gaps

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| C1 | **High** | Space delete does NOT cascade-delete `objectRelations`. Orphaned rows remain after guest-mode space deletion. | `local.ts` lines 1520-1556 |
| C2 | **High** | Space delete does NOT cascade-delete `savedViews`. Orphaned rows remain. | `local.ts` lines 1520-1556 |
| C3 | **Medium** | Object type delete does NOT cascade-delete `savedViews`. Orphaned rows remain. | `local.ts` lines 482-518 |

---

## 6. Migration Hygiene

| Area | Status |
|------|--------|
| Ordering | **PASS** — S1 is cosmetic (both ran, deterministic order) |
| Idempotency | **PASS** — `IF NOT EXISTS` / `DROP IF EXISTS` patterns used |
| Naming | **PASS** — consistent `NNN_description.sql` |
| Self-contained | **PASS** — no forward references detected |

Total migration count: 25 (001-025).

---

## 7. Realtime Subscription Efficiency

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| RT1 | **Medium** | `saved_views` not added to realtime publication. Migration 023 missed it. Changes not synced cross-client. | `023_saved_views.sql` |
| RT2 | **Low** | All postgres_changes subscriptions are unscoped (all rows, all spaces). Not a data leak (RLS enforced server-side), but causes unnecessary WAL processing. This is how Supabase Realtime is designed to work — scoping adds complexity and requires re-subscribing on space switch. | `realtime.ts` |
| RT3 | **Low** | No message size limit on Yjs broadcast payloads. Large pastes or initial sync could theoretically exceed Supabase Broadcast limit (~1MB). Unlikely with typical document sizes. | `supabase-yjs-provider.ts` |
| — | — | Single channel multiplexes all table subscriptions with 100ms debounce. Efficient. | **PASS** |
| — | — | Cleanup on unmount correct (both realtime.ts and SupabaseYjsProvider). | **PASS** |
| — | — | Collab channel correctly scoped to `collab:${spaceId}:${documentId}`. | **PASS** |

---

## 8. Dexie Schema Parity

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| C1 | **High** | Space delete missing `objectRelations` cascade (see Cascades section) | `local.ts` |
| C2 | **High** | Space delete missing `savedViews` cascade (see Cascades section) | `local.ts` |
| C3 | **Medium** | Type delete missing `savedViews` cascade (see Cascades section) | `local.ts` |
| D1 | **Medium** | `is_default: 1` instead of `true` in savedViews `.where()` query. Dexie converts booleans to 0/1 for IndexedDB key storage, so this *may* work correctly — **needs verification with a test** before changing. | `local.ts` line 1926 |
| D2 | **Medium** | Missing compound index `[object_id+tag_id]` on Dexie `objectTags`. No uniqueness enforcement at IndexedDB level (relies on runtime filter). | `local.ts` |
| D3 | **Low** | `owner_id: 'local'` violates UUID type contract in Zod schemas. Would fail validation if ever parsed through strict schema. | `local.ts` |
| — | — | All 9 Dexie tables present. `space_shares`/`share_exclusions` intentionally absent (guest mode). | **PASS** |
| — | — | `exportLocalData()` exports all tables. | **PASS** |
| — | — | Local default IDs won't collide with v4 UUIDs (version/variant bits differ). | **PASS** |

---

## 9. Data Integrity Edge Cases

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| E1 | **Medium** | No optimistic locking. All updates are last-write-wins. Two users editing the same object's metadata in a shared space (outside Yjs) silently overwrite each other. This is a **design decision** — adding version checks changes API semantics. Scope as its own feature if needed. | `supabase.ts`, `local.ts` |
| E2 | **Medium** | Unique constraints don't exclude archived rows. Archiving a type with slug `tasks` blocks creating a new one with that slug. **Needs product decision** — "archive preserves namespace" may be intentional. | `021_*.sql`, `013_tags.sql` |
| E3 | **Medium** | No size limit on `content`/`properties` JSONB. PostgreSQL allows ~1GB. Combined with N7 (content search fetching 200 full objects), this is a latent performance concern. | `002_objects.sql` |
| E4 | **Low** | Dexie compound operations (type delete, space delete, slug check + insert, default toggle) lack transactions. Race conditions possible in multi-tab, but JavaScript's single-threaded execution mitigates most risk within a single tab. | `local.ts` |
| E5 | **Low** | Type deletion cascades objects immediately, bypassing soft-delete/trash/30-day-purge flow. **Needs product decision** — could be addressed with a UI confirmation dialog rather than a DB change. | `020_cascade_delete_types.sql` |
| E6 | — | Circular relations (A->B->A) permitted. By design for wiki-style linking. | **OK** |
| E7 | — | All timestamps are `TIMESTAMPTZ`. | **PASS** |

---

## Priority Fix List

### P0 — Verified Bugs (fix now, no migration needed)

| # | Finding | Fix | Risk |
|---|---------|-----|------|
| C1/C2 | Dexie space delete doesn't cascade `objectRelations` or `savedViews` | Add cleanup calls in `local.ts` space delete method | Low — code-only change, guest mode only |
| C3 | Dexie type delete doesn't cascade `savedViews` | Add `database.savedViews.where('type_id').equals(id).delete()` in type delete method | Low |
| S14 | `OBJECT_SUMMARY_COLUMNS` missing `is_archived, archived_at` | Add to column list in `supabase.ts` — verify UI consumes these first | Low |
| D1 | `is_default: 1` vs `true` in Dexie saved views query | Write a test to verify Dexie's boolean-to-key behavior; fix if broken | Needs verification |

### P1 — RLS Hardening (next migration)

| # | Finding | Fix | Risk |
|---|---------|-----|------|
| S2 | objects INSERT allows any/null `owner_id` | Add `WITH CHECK (owner_id = auth.uid())` to INSERT policy + `ALTER COLUMN owner_id SET NOT NULL` | Medium — verify no NULL rows exist first |
| I1/I2 | Missing composite indexes on objects | `CREATE INDEX objects_space_active_idx ON objects(space_id, type_id, updated_at DESC) WHERE is_deleted = false AND is_archived = false` | Low — additive, no lock on reads |
| I5 | Missing indexes on share_exclusions | Partial indexes on `excluded_type_id` and `excluded_object_id` | Low |
| R4 | Missing composite on space_shares | `CREATE INDEX space_shares_space_shared_idx ON space_shares(space_id, shared_with_id)` | Low |
| S3/S4 | Missing updated_at triggers | Add triggers for `spaces` and `space_shares` | Low |
| I6 | Potentially stale index | Verify `object_types_owner_global_slug_idx` is redundant, drop if so | Needs verification |

### P2 — Constraint Tightening (separate migration)

| # | Finding | Fix | Risk |
|---|---------|-----|------|
| S5 | `relation_type` unconstrained | `CHECK (relation_type IN ('link', 'mention'))` — verify no other values in data first, and confirm `'parent'` is not planned | Medium — verify data |
| S9 | `view_mode` unconstrained | `CHECK (view_mode IN ('table', 'list', 'card', 'board'))` — verify against app code | Medium — verify data |
| S13 | Tags case-sensitive in Supabase | `CREATE UNIQUE INDEX tags_space_name_lower_idx ON tags(space_id, LOWER(name))` — drop old index | Medium — may reject existing case-variant duplicates |
| RT1 | `saved_views` not in realtime publication | `ALTER PUBLICATION supabase_realtime ADD TABLE saved_views` + add subscription in `realtime.ts` | Low |
| S7 | `object_types.owner_id` nullable | `ALTER COLUMN owner_id SET NOT NULL` after data verification | Medium |

### P3 — Performance (feature work, scope individually)

| # | Finding | Fix |
|---|---------|-----|
| N1 | Tag counts N+1 | Batch into single `GROUP BY tag_id` query; add `countObjectsByTags(tagIds)` method |
| N3 | relations.listAll() two-query waterfall | Rewrite as single JOIN/subquery instead of fetching IDs then filtering |
| N5 | Sidebar 3 overlapping queries | Consolidate to one `useObjects` call, derive subsets with `useMemo` |
| N2 | Exclusion filter waterfall | Run Q2/Q3 in parallel; consider single server-side query |
| N6 | getSharedSpaces waterfall | Use Supabase JOIN: `.select('id, permission, spaces(*)')` |

### Deferred — Needs Product Decision

| # | Finding | Question |
|---|---------|----------|
| E1 | No optimistic locking | Is last-write-wins acceptable for shared-space metadata edits? Scope as feature if not. |
| E2 | Archive blocks name reuse | Should archived items release their slug/name for reuse? |
| E5 | Type deletion bypasses trash | Should type deletion soft-delete its objects instead of CASCADE? Or is a confirmation dialog sufficient? |

### Deferred — Low Value

| # | Finding | Reason |
|---|---------|--------|
| ~~S8~~ | ~~`is_built_in` dead column~~ | **Fixed** — column dropped in migration 027 |
| ~~S12~~ | ~~Color regex allows 5/7 digit hex~~ | **Fixed** — regex now only allows 3/4/6/8 digits |
| RT2 | Unscoped realtime subscriptions | Supabase's intended pattern; scoping adds complexity |
| RT3 | Yjs message chunking | Theoretical limit, unlikely with typical documents |
| E4 | Dexie transaction wrapping | Single-threaded execution mitigates; multi-tab edge case |
| S10/S11 | DB-level length/URL validation | Zod handles this; only direct SQL bypasses |
| D3 | `owner_id: 'local'` not a UUID | Works in practice; only fails if validated through strict schema |

---

## Fixes Applied

### Migration 026 (`026_indexes_triggers_hardening.sql`)
- **S2**: `objects.owner_id` set NOT NULL + INSERT policy hardened with `owner_id = auth.uid()` check
- **S3/S4**: `updated_at` triggers added for `spaces` and `space_shares`
- **I1/I2/I3**: Composite index `objects_space_active_idx(space_id, type_id, updated_at DESC) WHERE is_deleted = false AND is_archived = false`
- **I4**: Composite index `object_relations_source_type_idx(source_id, relation_type)`
- **I5**: Partial indexes on `share_exclusions(excluded_type_id)` and `(excluded_object_id)`
- **R4**: Composite index `space_shares(space_id, shared_with_id)`
- **I6**: Dropped stale `object_types_owner_global_slug_idx`
- **I7**: Dropped redundant low-selectivity `object_relations_type_idx`
- **I8**: Replaced full boolean `objects_is_deleted_idx` with partial `WHERE is_deleted = true`

### Migration 027 (`027_constraints_cleanup.sql`)
- **S5**: CHECK constraint on `object_relations.relation_type` — `('link', 'mention')`
- **S9**: CHECK constraint on `saved_views.view_mode` — `('table', 'list', 'card', 'board')`
- **S13**: Case-insensitive tag uniqueness via `tags_space_name_lower_idx`
- **S7**: `object_types.owner_id` set NOT NULL
- **S8**: Dropped dead `is_built_in` column from `object_types` (+ updated RLS policy)
- **S15**: Changed `saved_views.id` default to `gen_random_uuid()`
- **RT1**: Added `saved_views` to `supabase_realtime` publication

### Code Changes
- **C1/C2**: Dexie space delete now cascades `objectRelations` and `savedViews`
- **C3**: Dexie type delete now cascades `savedViews`
- **D2**: Added `[object_id+tag_id]` compound index on Dexie `objectTags` (version 12)
- **S14**: `OBJECT_SUMMARY_COLUMNS` now includes `is_archived, archived_at`
- **N1**: `useTagCounts` rewritten to use single batched `countObjectsByTags()` query
- **N2**: `useExclusionFilter` runs per-user and space-wide queries in parallel
- **N3**: `relations.listAll()` rewritten as single JOIN query (was two-query waterfall)
- **N6**: `getSharedSpaces()` rewritten to use Supabase JOIN (was two-query waterfall)
- **RT1**: Added `saved_views` to realtime subscription channel
- **S12**: Color regex fixed to only allow valid CSS hex lengths (3, 4, 6, 8)
- **S16**: `spaces.icon` Zod schema changed to `.nullable()` to match DB
- **S8**: Removed `is_built_in` from `ObjectType` schema, all code, test fixtures

### Not Addressed

**Separate features (larger refactors):**
- **N5** — Sidebar fires 3 overlapping `useObjects` queries; should consolidate to one query and derive subsets client-side
- **N7** — Content search fetches 200 full objects for client-side matching; should use server-side `tsvector` search

**Performance at scale (acceptable now, revisit under load):**
- **N4/R3** — `is_object_excluded()` RLS function called per-row; consider inlining as `NOT EXISTS` subquery at scale
- **E3** — No size limit on `content`/`properties` JSONB columns; latent performance concern with N7

**Kept as-is (by design):**
- **S6** (pins.user_id) and **S7** (object_types.owner_id) Zod schemas: Kept nullable in Zod since local/Dexie mode creates these with null values; DB constraint handles enforcement for Supabase
- **D1** (is_default: 1 vs true): Verified Dexie handles boolean-to-key conversion correctly; no change needed
- **S17** (`createObjectSchema` allows `is_deleted` at creation): Intentional for import/restore flows

**Needs product decision:**
- **E1** — No optimistic locking; last-write-wins for shared-space metadata edits
- **E2** — Archived items block name/slug reuse
- **E5** — Type deletion cascades objects immediately, bypassing soft-delete/trash flow

**Deferred — low value:**
- **RT2** — Unscoped realtime subscriptions (Supabase's intended pattern)
- **RT3** — No Yjs broadcast message chunking (unlikely to hit limits)
- **E4** — Dexie compound operations lack transactions (single-threaded mitigates)
- **S10/S11** — DB-level length/URL validation (Zod handles; only direct SQL bypasses)
- **D3** — `owner_id: 'local'` not a valid UUID (works in practice)
