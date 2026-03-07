# Feature Hooks

All data-fetching hooks are in `src/features/{domain}/hooks/`. They wrap TanStack Query and the DataClient, providing a React-friendly API to components.

**Source files:** See individual paths below.

## Common Patterns

### Empty Array Constants

Every list hook declares a module-level empty array constant:

```typescript
const EMPTY_OBJECTS: DataObjectSummary[] = []
```

This prevents infinite re-render loops — inline `[]` creates a new reference every render, which triggers `useEffect` dependencies. These module-level constants are referentially stable.

### Space Scoping

All hooks call `useSpaceId()` and include the space ID in their query key so caches are isolated per space.

### Mutation → Emit

After every successful mutation, hooks call `emit(channel)` which invalidates TanStack Query caches and broadcasts to other tabs via BroadcastChannel.

### keepPreviousData

List hooks use `keepPreviousData` as a placeholder so the UI doesn't flash empty while refetching.

---

## useObjects / useObject

**Source:** `src/features/objects/hooks/useObjects.ts`

### useObjects

```typescript
function useObjects(options?: UseObjectsOptions): UseObjectsReturn
```

**Options:**

| Field | Type | Description |
|-------|------|-------------|
| enabled | `boolean?` | Enable/disable query |
| parentId | `string?` | Filter by parent |
| typeId | `string?` | Filter by type |
| isDeleted | `boolean?` | Filter deleted entries |
| isArchived | `boolean?` | Filter archived entries |
| limit | `number?` | Pagination limit |
| offset | `number?` | Pagination offset |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| objects | `DataObjectSummary[]` | Entry list (no content) |
| isLoading | `boolean` | Query loading state |
| error | `string \| null` | Error message |
| refetch | `() → Promise<void>` | Manual refetch |
| create | `(input) → Promise<DataObject \| null>` | Create entry, emits `objects` |
| update | `(id, input) → Promise<DataObject \| null>` | Update entry, emits `objects` |
| remove | `(id, permanent?) → Promise<void>` | Delete entry, emits `objects` |
| restore | `(id) → Promise<DataObject \| null>` | Restore from trash, emits `objects` |
| archive | `(id) → Promise<DataObject \| null>` | Archive entry |
| unarchive | `(id) → Promise<DataObject \| null>` | Unarchive entry |

**Query key:** `queryKeys.objects.list(spaceId, options)`

### useObject

```typescript
function useObject(id: string | null)
```

**Returns:**

| Field | Type |
|-------|------|
| object | `DataObject \| null` |
| isLoading | `boolean` |
| error | `string \| null` |
| refetch | `() → Promise<void>` |
| update | `(input) → Promise<DataObject \| null>` |
| remove | `(permanent?) → Promise<void>` |
| archive | `() → Promise<DataObject \| null>` |

**Query key:** `queryKeys.objects.detail(id)`

Performs optimistic cache update on `update()` via `queryClient.setQueryData()`.

---

## useObjectTypes / useObjectType

**Source:** `src/features/object-types/hooks/useObjectTypes.ts`

### useObjectTypes

```typescript
function useObjectTypes(options?: { isArchived?: boolean }): UseObjectTypesReturn
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| types | `ObjectType[]` | Type list |
| isLoading | `boolean` | |
| error | `string \| null` | |
| refetch | `() → Promise<void>` | |
| create | `(input) → Promise<{ data, error? }>` | Returns error string on duplicate slug |
| update | `(id, input) → Promise<{ data, error? }>` | Returns error string on duplicate slug |
| remove | `(id) → Promise<string \| null>` | Cascades. Emits `objectTypes`, `objects`, `templates` |
| archive | `(id) → Promise<string \| null>` | |
| unarchive | `(id) → Promise<string \| null>` | |

**Query key:** `queryKeys.objectTypes.list(spaceId, options)`

### useObjectType

```typescript
function useObjectType(id: string | null)
```

**Returns:** `{ objectType, isLoading, error, refetch }`

**Query key:** `queryKeys.objectTypes.detail(id)`

### useObjectTypeMap

```typescript
function useObjectTypeMap()
```

**Returns:** `{ typeMap: Map<string, ObjectType>, types: ObjectType[], isLoading: boolean }`

Convenience hook that builds a lookup Map from the types list.

---

## useTemplates

**Source:** `src/features/templates/hooks/useTemplates.ts`

```typescript
function useTemplates(options?: { typeId?: string; enabled?: boolean }): UseTemplatesReturn
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| templates | `Template[]` | Template list |
| isLoading | `boolean` | |
| error | `string \| null` | |
| refetch | `() → Promise<void>` | |
| createFromTemplate | `(templateId, title?, parentId?) → Promise<DataObject \| null>` | Create entry from template |
| createFromTemplateWithVariables | `(templateId, customValues, context, title?, parentId?) → Promise<DataObject \| null>` | Create with variable resolution |
| getTemplateVariables | `(templateId) → Promise<TemplateVariableInfo \| null>` | Extract `\{\{variables\}\}` from template |
| saveObjectAsTemplate | `(object, name?) → Promise<{ data, error? }>` | Save entry as new template |
| deleteTemplate | `(id) → Promise<void>` | |
| renameTemplate | `(id, name) → Promise<void>` | |

**Query key:** `queryKeys.templates.list(spaceId, typeId)`

**TemplateVariableInfo:** `{ template: Template, customVariables: string[], hasVariables: boolean }`

---

## useTags / useObjectTags / useObjectTagsBatch / useTagCounts

**Source:** `src/features/tags/hooks/useTags.ts`

### useTags

```typescript
function useTags(): UseTagsReturn
```

**Returns:**

| Field | Type |
|-------|------|
| tags | `Tag[]` |
| isLoading | `boolean` |
| error | `string \| null` |
| refetch | `() → Promise<void>` |
| create | `(input) → Promise<Tag \| null>` |
| update | `(id, input) → Promise<Tag \| null>` |
| remove | `(id) → Promise<void>` |

**Query key:** `queryKeys.tags.list(spaceId)`

### useObjectTags

```typescript
function useObjectTags(objectId: string): UseObjectTagsReturn
```

**Returns:** `{ tags: Tag[], isLoading, addTag: (tagId) → Promise<void>, removeTag: (tagId) → Promise<void> }`

**Query key:** `queryKeys.tags.objectTags(objectId)`

### useObjectTagsBatch

```typescript
function useObjectTagsBatch(objectIds: string[]): { tagsByObject, isLoading }
```

**Returns:** `{ tagsByObject: Record<string, Tag[]>, isLoading: boolean }`

**Query key:** `queryKeys.tags.objectTagsBatch(objectIds)`

### useTagCounts

```typescript
function useTagCounts(tags: Tag[]): Map<string, number>
```

Uses `useQueries()` (plural) for parallel count queries per tag.

**Query key (each):** `queryKeys.tags.countByTag(tagId)`

---

## usePins

**Source:** `src/features/pins/hooks/usePins.ts`

```typescript
function usePins(): UsePinsReturn
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| pinnedIds | `Set<string>` | Set of pinned object IDs |
| isLoading | `boolean` | |
| pin | `(objectId) → Promise<void>` | Pin entry |
| unpin | `(objectId) → Promise<void>` | Unpin entry |
| toggle | `(objectId) → Promise<void>` | Toggle pin state |

**Query key:** `queryKeys.pins.list(spaceId)`

Data is fetched as `Pin[]` then transformed to `Set<string>` of object IDs via `useMemo`.

---

## useObjectRelations

**Source:** `src/features/relations/hooks/useObjectRelations.ts`

```typescript
function useObjectRelations(objectId: string | null): UseObjectRelationsReturn
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| relations | `EnrichedRelation[]` | Relations with linked object data |
| isLoading | `boolean` | |
| error | `string \| null` | |
| refetch | `() → Promise<void>` | |
| createLink | `(targetId) → Promise<ObjectRelation \| null>` | Create manual link |
| removeLink | `(relationId) → Promise<void>` | Remove link |

**EnrichedRelation:** Extends `ObjectRelation` with `linkedObject: Pick<DataObject, 'id' | 'title' | 'icon' | 'type_id'> | null`

**Query key:** `queryKeys.relations.list(objectId)`

**Enrichment pipeline:**
1. Fetch raw relations for the object
2. Deduplicate by target ID (prefer `link` over `mention`)
3. Check TanStack cache for object data
4. Batch-fetch uncached objects via `batchGetSummary()`
5. Attach `linkedObject` to each relation

---

## useGlobalSearch

**Source:** `src/features/search/hooks/useGlobalSearch.ts`

```typescript
function useGlobalSearch(): UseGlobalSearchReturn
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| query | `string` | Current search query |
| setQuery | `(query) → void` | Update query |
| typeIds | `string[]` | Type filter |
| setTypeIds | `(typeIds) → void` | Update type filter |
| results | `DataObject[]` | Search results |
| tagResults | `Tag[]` | Matching tags |
| isLoading | `boolean` | |

Does **not** use TanStack Query — manages state with `useState` and debounced `useEffect` (300ms). Tag filtering is client-side via `useMemo`.

---

## useGraphData

**Source:** `src/features/graph/hooks/useGraphData.ts`

```typescript
function useGraphData()
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| graphData | `GraphData` | `{ nodes, edges }` for D3 |
| types | `ObjectType[]` | All types |
| typeMap | `Record<string, ObjectType>` | Type lookup |
| isLoading | `boolean` | Aggregated loading state |

**Composes:**
- `useObjects()` for entries
- `useObjectTypeMap()` for types
- `useExclusionFilter()` for sharing exclusions
- Custom `useQuery(['relations', 'all', spaceId])` for all relations in space
- `buildGraphData()` via `useMemo` transforms to D3-ready nodes/edges

---

## Provider Hooks

These hooks are exported from the data providers, not from feature modules.

**Source:** `src/shared/lib/data/DataProvider.tsx`

| Hook | Returns | Description |
|------|---------|-------------|
| `useDataClient()` | `DataClient` | Active data client instance |
| `useStorageMode()` | `'supabase' \| 'local'` | Current storage mode |
| `useAuth()` | `{ user, isLoading, isGuest }` | Auth state |
| `useSpaceId()` | `string \| null` | Current space ID |
| `useMigrateData()` | `() → Promise<void>` | Trigger local → Supabase migration |

**Source:** `src/shared/lib/data/SpaceProvider.tsx`

| Hook | Returns | Description |
|------|---------|-------------|
| `useCurrentSpace()` | `{ space, spaces, switchSpace, leaveSpace, isLoading, sharedPermission }` | Current space + actions |
| `useSpaces()` | `{ spaces, allSpaces, create, update, remove, archiveSpace, unarchiveSpace }` | Space CRUD |
