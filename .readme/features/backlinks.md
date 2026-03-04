# Backlinks

**Status:** Not started

## Summary

Add a backlinks section to the object editor that displays incoming relations (objects that link to or mention the current object). Backlink visibility is configurable per-type via a toggle in type settings.

## Current State

- `LinkedObjects` component only shows **outgoing** relations (where `source_id === objectId`)
- No incoming relation queries exist
- No per-type configuration for link/backlink visibility
- `object_relations` table already stores bidirectional data — backlinks can be derived by querying `target_id === objectId`

## Proposed Design

### Schema Change

Add `show_backlinks` boolean to `object_types`:

```sql
ALTER TABLE object_types ADD COLUMN show_backlinks BOOLEAN NOT NULL DEFAULT true;
```

Default `true` — backlinks are shown unless explicitly disabled.

### Data Layer

Add a `listBacklinks(objectId)` method to `RelationsClient` that queries relations where `target_id === objectId`, enriched with source object metadata (title, icon, type). Mirror the existing `listBySource` pattern but reverse the direction.

Query key: `objectRelations.backlinks(objectId)`.

### UI

#### Backlinks Section (ObjectEditor)

A collapsible "Backlinks" section rendered below the existing `LinkedObjects` component. Shows:

- Count badge in the section header
- List of objects that link to/mention the current object
- Each item: icon, title (clickable link), relation type badge (mention vs link)
- Read-only — users cannot remove backlinks (they're owned by the source object)

#### Type Settings Toggle

Add a "Show backlinks" checkbox to the type edit form (`ObjectTypeForm`). When disabled, the backlinks section is hidden for all objects of that type.

### Behavior

- Backlinks update in real-time via the existing `objectRelations` event channel
- The toggle is per-type, not per-object — all objects of a type share the setting
- Deduplication: if the same object has both a `mention` and `link` relation, show one entry with both badges
- Performance: backlink queries are indexed via `target_id` on `object_relations`

## Files to Change

- `supabase/migrations/` — new migration for `show_backlinks` column
- `src/shared/lib/data/types.ts` — add `show_backlinks` to `ObjectType` schema
- `src/shared/lib/data/supabase.ts` — `listBacklinks` implementation
- `src/shared/lib/data/local.ts` — Dexie `listBacklinks` implementation
- `src/shared/lib/data/queryKeys.ts` — backlinks query key
- `src/features/relations/hooks/useBacklinks.ts` — new hook
- `src/features/relations/components/BacklinksSection.tsx` — new component
- `src/features/objects/components/ObjectEditor.tsx` — render BacklinksSection
- `src/features/object-types/components/ObjectTypeForm.tsx` — show_backlinks toggle

## Open Questions

- Should backlinks be visible to shared users with read-only access? (Probably yes — they're read-only by nature)
- Should the graph view also respect `show_backlinks`? (Probably not — graph shows all relations regardless)
