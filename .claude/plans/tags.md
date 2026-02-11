# Global Tags

**Status: Not started**

## Overview

Cross-type tagging system with a shared tag pool per space. Any object can have multiple tags regardless of its type. Tags have a name and optional color.

## Decisions

| Area | Decision |
|------|----------|
| Scope | Global per space, not per type |
| Storage | Dedicated `tags` + `object_tags` tables (not a property field) |
| Cascade | ON DELETE CASCADE for both tag and object deletion |
| UI location | Tag picker in ObjectEditor, below PropertyFields |

## Database — `supabase/migrations/012_tags.sql`

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, name)
);
CREATE INDEX tags_space_id_idx ON tags(space_id);
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE object_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(object_id, tag_id)
);
CREATE INDEX object_tags_object_id_idx ON object_tags(object_id);
CREATE INDEX object_tags_tag_id_idx ON object_tags(tag_id);
ALTER TABLE object_tags ENABLE ROW LEVEL SECURITY;
```

### RLS policies (reuse `user_has_space_access()` / `user_can_edit_space()` from migration 011)
- `tags` SELECT: `user_has_space_access(auth.uid(), space_id)`
- `tags` INSERT/UPDATE/DELETE: `user_can_edit_space(auth.uid(), space_id)`
- `object_tags` SELECT: join to objects, check `user_has_space_access`
- `object_tags` INSERT/DELETE: join to objects, check `user_can_edit_space`

## Dexie — `src/shared/lib/data/local.ts`

- Add `tags` and `objectTags` entity tables to `SwashbucklerDB`
- Version 7 — `tags: 'id, name, space_id'`, `objectTags: 'id, object_id, tag_id'`
- Update cascade deletion in `createObjectsClient` (permanent delete) and `createLocalSpacesClient`
- Update `exportLocalData()` and `clearLocalData()`

## Data layer — `src/shared/lib/data/types.ts`

New schemas: `tagSchema`, `createTagSchema`, `updateTagSchema`, `objectTagSchema`

```ts
interface TagsClient {
  list(): Promise<DataListResult<Tag>>
  get(id: string): Promise<DataResult<Tag>>
  create(input: CreateTagInput): Promise<DataResult<Tag>>
  update(id: string, input: UpdateTagInput): Promise<DataResult<Tag>>
  delete(id: string): Promise<DataResult<void>>
  getObjectTags(objectId: string): Promise<DataListResult<Tag>>
  addTagToObject(objectId: string, tagId: string): Promise<DataResult<ObjectTag>>
  removeTagFromObject(objectId: string, tagId: string): Promise<DataResult<void>>
  getTagsForObjects(objectIds: string[]): Promise<DataResult<Map<string, Tag[]>>>
}
```

Add `tags: TagsClient` to `DataClient` interface.

## Implementations — `supabase.ts` + `local.ts`

**Supabase** (`createTagsClient`):
- `list()` — `SELECT * FROM tags WHERE space_id = ?`
- `getObjectTags(objectId)` — `SELECT tag_id, tags(*) FROM object_tags WHERE object_id = ?`
- `addTagToObject` — upsert into `object_tags`
- `getTagsForObjects(ids)` — `SELECT object_id, tags(*) FROM object_tags WHERE object_id IN (ids)`, group into Map

**Local** (`createLocalTagsClient`):
- Same logic with Dexie filter/bulkDelete, manual cascade

## Events — `src/shared/lib/data/events.ts`
- Add `'tags'` to `EventChannel` union

## Hooks — `src/features/tags/hooks/useTags.ts`
- `useTags()` — list all tags in space, CRUD, subscribes to `'tags'` channel
- `useObjectTags(objectId)` — tags for specific object, `addTag`/`removeTag`, subscribes to `'tags'`

## Components — `src/features/tags/components/`

**`TagBadge.tsx`** — colored pill with tag name, optional `onRemove` X button

**`TagPicker.tsx`** — shown in ObjectEditor below PropertyFields
- Current tags as `TagBadge` pills with remove
- "+" button opens popover with search + tag list
- "Create [query]" option when no exact match
- Uses `useObjectTags(objectId)` + `useTags()`

## Integration
- `src/features/objects/components/ObjectEditor.tsx` — add `<TagPicker objectId={id} />`
- `src/shared/lib/data/DataProvider.tsx` — update `migrateToSupabase` for tags + objectTags

## Verification

- [ ] Create tags in a space
- [ ] Assign tags to objects of different types
- [ ] Tags appear in editor and persist across reload
- [ ] Remove tags from objects
- [ ] Delete a tag removes it from all objects
- [ ] Permanently deleting an object removes its tag assignments
- [ ] Local/guest mode works identically
- [ ] `npm run build` passes
