# API Documentation (Internal)

**Status:** Done

## Overview

Internal developer documentation covering the full data layer API, including the DataClient interface, all sub-clients, hooks, Supabase RPC functions, event system, and auth flow. Includes Mermaid diagrams for architecture, data flow, entity relationships, and the permission model.

## Location

All documentation lives in `.readme/api/`:

```
.readme/api/
  index.md              # Overview + architecture diagram
  data-client.md        # DataClient interface & sub-clients
  hooks.md              # Feature-level data hooks
  query-keys.md         # TanStack Query key strategy
  events.md             # Event system, invalidation, cross-tab sync
  rpc-functions.md      # Supabase RPC functions & migrations
  auth.md               # Authentication & authorization flow
  permissions.md        # Space sharing & permission model
  storage.md            # Dual-storage (Supabase vs Dexie) comparison
  entity-diagram.md     # Entity relationship diagram
```

## Diagrams (Mermaid)

Each document includes inline Mermaid diagrams where they add clarity:

### 1. Architecture Overview (`index.md`)
High-level system diagram showing React → Hooks → DataClient → Supabase/Dexie, with TanStack Query caching and the event/invalidation layer.

### 2. Data Flow (`index.md`)
Request lifecycle: component → hook → useQuery/useMutation → DataClient method → storage backend → response → cache update.

### 3. Event & Invalidation Flow (`events.md`)
Mutation → `emit(channel)` → TanStack Query invalidation + BroadcastChannel → other tabs.

### 4. Entity Relationships (`entity-diagram.md`)
ER diagram of all tables: spaces, objects, object_types, templates, object_relations, tags, object_tags, pins, space_shares, share_exclusions.

### 5. Auth Flow (`auth.md`)
Supabase Auth sequence: login → session → DataProvider mode selection → storage client instantiation.

### 6. Permission Model (`permissions.md`)
Decision tree: owner → shared (edit/view) → exclusions (per-share, space-wide, type-level, field-level).

### 7. Realtime Sync (`events.md`)
Postgres changes → Supabase Realtime → event mapping → cache invalidation. Plus BroadcastChannel cross-tab flow.

## Content Per Document

### `index.md`
- Tech stack summary table
- Architecture diagram (component layers)
- Data flow diagram (read + write paths)
- Links to all other docs

### `data-client.md`
- DataClient interface definition
- All 9 sub-clients with method signatures:
  - ObjectsClient (list, get, create, update, delete, restore, archive, unarchive, search, batchGetSummary, purgeExpired)
  - ObjectTypesClient (list, get, create, update, delete, archive, unarchive)
  - GlobalObjectTypesClient (list, get, create, update, delete, importToSpace)
  - TemplatesClient (list, get, create, update, delete)
  - RelationsClient (list, listAll, create, delete, deleteBySourceAndTarget, syncMentions)
  - SpacesClient (list, get, create, update, delete, archive, unarchive)
  - SharingClient (listShares, getShare, createShare, updateShare, deleteShare, listExclusions, addExclusion, removeExclusion, listSpaceExclusions, addSpaceExclusion, findUserByEmail, getSharedSpaces)
  - TagsClient (list, get, create, update, delete, getObjectTags, getObjectTagsBatch, addTagToObject, removeTagFromObject, getObjectsByTag, countObjectsByTag)
  - PinsClient (list, pin, unpin, isPinned)
- Return types: `DataResult<T>`, `DataListResult<T>`, `DataError`

### `hooks.md`
- All feature hooks grouped by domain
- Signature, parameters, return shape, and usage notes
- Module-level empty array constant pattern (anti-infinite-loop)

### `query-keys.md`
- Full key factory structure
- Space-scoping strategy
- Invalidation patterns (prefix-based via emit)

### `events.md`
- Channel list (objects, objectTypes, globalObjectTypes, templates, objectRelations, spaces, spaceShares, tags, pins)
- `emit()` / `subscribe()` API
- TanStack Query bridge (`setQueryClient`)
- BroadcastChannel cross-tab sync
- Supabase Realtime subscription mapping (table → channel → invalidation)
- Debounce behavior (100ms)

### `rpc-functions.md`
- All Supabase SQL functions: search_objects, get_graph_data, handle_new_user_space, user_has_space_access, user_can_edit_space, is_object_excluded, find_user_by_email
- Triggers: update_updated_at, handle_new_user
- Migration index (001–022)

### `auth.md`
- Auth methods: email/password, Google OAuth, GitHub OAuth
- Session management (Supabase cookie)
- DataProvider mode selection (user present → supabase, absent → local)
- Guest-to-authenticated migration flow
- API route: POST `/api/account/delete`

### `permissions.md`
- Owner vs shared user
- Permission levels: owner > edit > view
- Exclusion types: per-share object, per-share type, per-share type+field, space-wide
- RLS policy summary
- `sharedPermission` resolution (null for owners)
- `canEdit` derivation

### `storage.md`
- Side-by-side comparison: Supabase vs Dexie implementations
- Dexie schema versions (1–10) and migration notes
- Cascade delete differences (RLS/FK vs manual)
- Search differences (trigram vs client-side)
- Local defaults (space ID, type IDs)

### `entity-diagram.md`
- Full ER diagram with all tables and relationships
- Column listings for each table
- Index summary

## Non-Goals

- This is not user-facing documentation (that lives in `apps/docs/`)
- No API playground or interactive tooling
- No external/public API spec (Swashbuckler has no public API)

## Verification

- [ ] All Mermaid diagrams render correctly in GitHub markdown preview
- [ ] Every DataClient method is documented
- [ ] Every feature hook is documented
- [ ] Every RPC function is documented
- [ ] Cross-references between docs are accurate
