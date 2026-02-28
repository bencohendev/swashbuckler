# DataClient Interface

The `DataClient` is the central abstraction over both storage backends. It exposes 9 sub-clients plus an `isLocal` flag.

**Source:** `src/shared/lib/data/types.ts`

```typescript
interface DataClient {
  objects:           ObjectsClient
  objectTypes:       ObjectTypesClient
  globalObjectTypes: GlobalObjectTypesClient
  templates:         TemplatesClient
  relations:         RelationsClient
  spaces:            SpacesClient
  sharing:           SharingClient
  tags:              TagsClient
  pins:              PinsClient
  isLocal:           boolean
}
```

## Result Types

All methods return wrapped results — never throw.

```typescript
interface DataResult<T> {
  data: T | null
  error: DataError | null
}

interface DataListResult<T> {
  data: T[]          // always an array, empty on error
  error: DataError | null
}

interface DataError {
  message: string
  code?: string      // e.g. "DUPLICATE" for unique constraint violations
}
```

---

## ObjectsClient

Manages entries (the core content objects).

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(options?: ListObjectsOptions) → DataListResult<DataObjectSummary>` | List entries. Filters: parentId, typeId, isDeleted, isArchived, limit, offset |
| `get` | `(id: string) → DataResult<DataObject>` | Fetch single entry with full content |
| `create` | `(input: CreateObjectInput) → DataResult<DataObject>` | Create entry |
| `update` | `(id: string, input: UpdateObjectInput) → DataResult<DataObject>` | Update title, type_id, parent_id, icon, cover_image, properties, content |
| `delete` | `(id: string, permanent?: boolean) → DataResult<void>` | Soft delete (sets is_deleted + 30-day expiry) or permanent delete |
| `restore` | `(id: string) → DataResult<DataObject>` | Undo soft delete |
| `archive` | `(id: string) → DataResult<DataObject>` | Archive (hide without deleting) |
| `unarchive` | `(id: string) → DataResult<DataObject>` | Restore from archive |
| `search` | `(query: string, options?: SearchOptions) → DataListResult<DataObject>` | 2-pass search: title (server-side ILIKE + trigram) then content (client-side text extraction) |
| `batchGetSummary` | `(ids: string[]) → DataListResult<Pick<DataObject, 'id' \| 'title' \| 'icon' \| 'type_id'>>` | Batch fetch minimal object data (used by relations) |
| `purgeExpired` | `() → DataResult<number>` | Delete entries soft-deleted more than 30 days ago |

### Options

```typescript
interface ListObjectsOptions {
  parentId?: string | null
  typeId?: string
  isDeleted?: boolean
  isArchived?: boolean
  limit?: number
  offset?: number
}

interface SearchOptions {
  typeIds?: string[]
}
```

### Schemas

**DataObject** — full entry with content:
| Field | Type |
|-------|------|
| id | `uuid` |
| title | `string (1–255)` |
| type_id | `uuid` → object_types |
| owner_id | `uuid \| null` |
| space_id | `uuid` |
| parent_id | `uuid \| null` |
| icon | `string \| null` |
| cover_image | `url \| null` |
| properties | `Record<string, any>` |
| content | `any \| null` (Plate JSON) |
| is_deleted | `boolean` |
| deleted_at | `datetime \| null` |
| is_archived | `boolean` |
| archived_at | `datetime \| null` |
| created_at | `datetime` |
| updated_at | `datetime` |

**DataObjectSummary** — same as DataObject but without `content`.

---

## ObjectTypesClient

Manages types (schemas that define entry categories and their custom fields).

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(options?: ListObjectTypesOptions) → DataListResult<ObjectType>` | List types. Filter: isArchived |
| `get` | `(id: string) → DataResult<ObjectType>` | Fetch single type |
| `create` | `(input: CreateObjectTypeInput) → DataResult<ObjectType>` | Create type (per-space unique slug enforced) |
| `update` | `(id: string, input: UpdateObjectTypeInput) → DataResult<ObjectType>` | Update name, slug, icon, color, fields, sort_order |
| `delete` | `(id: string) → DataResult<void>` | Delete type + cascade (objects, relations, templates, tags, pins) |
| `archive` | `(id: string) → DataResult<ObjectType>` | Archive type |
| `unarchive` | `(id: string) → DataResult<ObjectType>` | Restore from archive |

### Schemas

**ObjectType:**
| Field | Type |
|-------|------|
| id | `uuid` |
| name | `string (1–100)` |
| plural_name | `string (1–100)` |
| slug | `string (1–100)` |
| icon | `string` |
| color | `string \| null` |
| fields | `FieldDefinition[]` |
| is_built_in | `boolean` |
| owner_id | `uuid \| null` |
| space_id | `uuid \| null` |
| sort_order | `int` |
| is_archived / archived_at | `boolean / datetime \| null` |
| created_at / updated_at | `datetime` |

**FieldDefinition:**
| Field | Type |
|-------|------|
| id | `uuid` |
| name | `string (1–100)` |
| type | `text \| number \| date \| checkbox \| select \| multi_select \| url` |
| required | `boolean?` |
| default_value | `any?` |
| options | `string[]?` (for select / multi_select) |
| sort_order | `int` |

---

## GlobalObjectTypesClient

Manages global type blueprints (space_id is null). Can be imported into any space.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `() → DataListResult<ObjectType>` | List all global types |
| `get` | `(id: string) → DataResult<ObjectType>` | Fetch single global type |
| `create` | `(input: CreateObjectTypeInput) → DataResult<ObjectType>` | Create global type |
| `update` | `(id: string, input: UpdateObjectTypeInput) → DataResult<ObjectType>` | Update global type |
| `delete` | `(id: string) → DataResult<void>` | Delete global type |
| `importToSpace` | `(id: string, targetSpaceId: string) → DataResult<ObjectType>` | Copy into space with new field UUIDs. Checks slug conflicts first. |

---

## TemplatesClient

Manages reusable entry templates.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(options?: ListTemplatesOptions) → DataListResult<Template>` | List templates, optionally filter by typeId |
| `get` | `(id: string) → DataResult<Template>` | Fetch single template |
| `create` | `(input: CreateTemplateInput) → DataResult<Template>` | Create template |
| `update` | `(id: string, input: UpdateTemplateInput) → DataResult<Template>` | Update template |
| `delete` | `(id: string) → DataResult<void>` | Delete template |

### Schema

**Template:**
| Field | Type |
|-------|------|
| id | `uuid` |
| name | `string (1–255)` |
| type_id | `uuid` → object_types |
| owner_id | `uuid \| null` |
| space_id | `uuid` |
| icon | `string \| null` |
| cover_image | `url \| null` |
| properties | `Record<string, any>` |
| content | `any \| null` (Plate JSON) |
| created_at / updated_at | `datetime` |

---

## RelationsClient

Manages links between entries. Two relation types: `mention` (auto-synced from editor `@` references) and `link` (manual).

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(options: ListRelationsOptions) → DataListResult<ObjectRelation>` | Relations where objectId is source OR target |
| `listAll` | `(options?: ListAllRelationsOptions) → DataListResult<ObjectRelation>` | All relations in space (used by graph) |
| `create` | `(input: CreateObjectRelationInput) → DataResult<ObjectRelation>` | Upsert on (source_id, target_id, relation_type, source_property) |
| `delete` | `(id: string) → DataResult<void>` | Delete by ID |
| `deleteBySourceAndTarget` | `(sourceId, targetId, relationType?) → DataResult<void>` | Delete by composite key |
| `syncMentions` | `(sourceId: string, mentionTargetIds: string[]) → DataResult<void>` | Diff-sync: add missing mentions, remove stale ones |

### Schema

**ObjectRelation:**
| Field | Type |
|-------|------|
| id | `uuid` |
| source_id | `uuid` → objects |
| target_id | `uuid` → objects |
| relation_type | `string` (`mention` \| `link`) |
| source_property | `string \| null` |
| context | `any \| null` |
| created_at | `datetime` |

---

## SpacesClient

Manages workspaces.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(options?: ListSpacesOptions) → DataListResult<Space>` | List spaces, filter: isArchived |
| `get` | `(id: string) → DataResult<Space>` | Fetch single space |
| `create` | `(input: { name, icon? }) → DataResult<Space>` | Create space |
| `update` | `(id, input: { name?, icon? }) → DataResult<Space>` | Update space |
| `delete` | `(id: string) → DataResult<void>` | Delete space + cascade all contents |
| `archive` | `(id: string) → DataResult<Space>` | Archive space |
| `unarchive` | `(id: string) → DataResult<Space>` | Restore from archive |

### Schema

**Space:**
| Field | Type |
|-------|------|
| id | `uuid` |
| name | `string (1–100)` |
| icon | `string` |
| owner_id | `uuid` |
| is_archived / archived_at | `boolean / datetime \| null` |
| created_at / updated_at | `datetime` |

---

## SharingClient

Manages space sharing, permission grants, and content exclusions.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listShares` | `(spaceId: string) → DataListResult<SpaceShare>` | All shares for a space |
| `getShare` | `(id: string) → DataResult<SpaceShare>` | Single share |
| `createShare` | `({ space_id, shared_with_email, permission }) → DataResult<SpaceShare>` | Share space with user (looks up by email) |
| `updateShare` | `(id, { permission }) → DataResult<SpaceShare>` | Change permission level |
| `deleteShare` | `(id: string) → DataResult<void>` | Revoke share |
| `listExclusions` | `(shareId: string) → DataListResult<ShareExclusion>` | Per-share exclusions |
| `addExclusion` | `(shareId, input) → DataResult<ShareExclusion>` | Exclude type, object, or type+field from share |
| `removeExclusion` | `(id: string) → DataResult<void>` | Remove exclusion |
| `listSpaceExclusions` | `(spaceId: string) → DataListResult<ShareExclusion>` | Space-wide exclusions (apply to all shares) |
| `addSpaceExclusion` | `(spaceId, input) → DataResult<ShareExclusion>` | Add space-wide exclusion |
| `findUserByEmail` | `(email: string) → DataResult<{ id, email }>` | Lookup user for sharing |
| `getSharedSpaces` | `() → DataListResult<SharedSpace>` | Spaces shared with current user |

### Exclusion Input

```typescript
type CreateShareExclusionInput =
  | { excluded_type_id: string }             // hide entire type
  | { excluded_object_id: string }           // hide specific entry
  | { excluded_type_id: string; excluded_field: string }  // hide field from type
```

---

## TagsClient

Manages tags and object-tag associations.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `() → DataListResult<Tag>` | All tags in current space |
| `get` | `(id: string) → DataResult<Tag>` | Single tag |
| `create` | `(input: { name, color? }) → DataResult<Tag>` | Create tag |
| `update` | `(id, input: { name?, color? }) → DataResult<Tag>` | Update tag |
| `delete` | `(id: string) → DataResult<void>` | Delete tag + cascade object_tags |
| `getObjectTags` | `(objectId: string) → DataListResult<Tag>` | Tags on an entry |
| `getObjectTagsBatch` | `(objectIds: string[]) → DataListResult<{ object_id, tags[] }>` | Batch fetch |
| `addTagToObject` | `(objectId, tagId) → DataResult<ObjectTag>` | Tag an entry (upsert) |
| `removeTagFromObject` | `(objectId, tagId) → DataResult<void>` | Remove tag from entry |
| `getObjectsByTag` | `(tagId: string) → DataListResult<DataObjectSummary>` | All entries with tag |
| `countObjectsByTag` | `(tagId: string) → DataResult<number>` | Count entries with tag |

### Schema

**Tag:**
| Field | Type |
|-------|------|
| id | `uuid` |
| space_id | `uuid` |
| name | `string (1–100)` |
| color | `string \| null` |
| created_at / updated_at | `datetime` |

---

## PinsClient

Manages per-user pinned entries.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `() → DataListResult<Pin>` | All pins for current user |
| `pin` | `(objectId: string) → DataResult<Pin>` | Pin an entry (upsert) |
| `unpin` | `(objectId: string) → DataResult<void>` | Remove pin |
| `isPinned` | `(objectId: string) → boolean` | Check if pinned |

### Schema

**Pin:**
| Field | Type |
|-------|------|
| id | `uuid` |
| user_id | `uuid \| null` |
| object_id | `uuid` → objects |
| created_at | `datetime` |
