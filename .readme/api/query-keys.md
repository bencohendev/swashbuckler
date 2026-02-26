# Query Keys

TanStack Query cache keys are managed by a centralized factory in `src/shared/lib/data/queryKeys.ts`. All hooks use this factory so invalidation is consistent.

## Factory

```typescript
const queryKeys = {
  objects: {
    all:    (spaceId?) => ['objects', spaceId],
    list:   (spaceId?, options?) => ['objects', spaceId, 'list', options],
    detail: (id) => ['objects', 'detail', id],
  },
  objectTypes: {
    all:    (spaceId?) => ['objectTypes', spaceId],
    list:   (spaceId?, options?) => ['objectTypes', spaceId, 'list', options],
    detail: (id) => ['objectTypes', 'detail', id],
  },
  globalObjectTypes: {
    all:    () => ['globalObjectTypes'],
    list:   () => ['globalObjectTypes', 'list'],
    detail: (id) => ['globalObjectTypes', 'detail', id],
  },
  tags: {
    all:            (spaceId?) => ['tags', spaceId],
    list:           (spaceId?) => ['tags', spaceId, 'list'],
    objectTags:     (objectId) => ['tags', 'objectTags', objectId],
    objectTagsBatch:(objectIds) => ['tags', 'objectTagsBatch', objectIds],
    objectsByTag:   (tagId) => ['tags', 'objectsByTag', tagId],
    countByTag:     (tagId) => ['tags', 'countByTag', tagId],
  },
  pins: {
    list: (spaceId?) => ['pins', spaceId],
  },
  templates: {
    all:  (spaceId?) => ['templates', spaceId],
    list: (spaceId?, typeId?) => ['templates', spaceId, 'list', typeId],
  },
  relations: {
    list: (objectId) => ['relations', objectId],
  },
  shares: {
    list: (spaceId) => ['shares', spaceId],
  },
}
```

## Space Scoping

Most keys include `spaceId` as the second element. This means:
- Switching spaces gives each space its own cache
- Invalidating `['objects', spaceId]` only affects that space's object queries
- The `all` key (e.g., `['objects', spaceId]`) is a prefix of `list` and `detail`, so invalidating `all` also invalidates `list`

## Invalidation Strategy

Invalidation is **prefix-based**. When `emit('objects')` fires, the event system calls:

```typescript
queryClient.invalidateQueries({ queryKey: ['objects'] })
```

This invalidates every query whose key starts with `['objects']` — all spaces, all list variants, all details. This is deliberately broad; stale-while-revalidate means the UI stays responsive while fresh data loads.

### Channel → Prefix Mapping

| Event Channel | Query Prefix |
|---------------|-------------|
| `objects` | `['objects']` |
| `objectTypes` | `['objectTypes']` |
| `globalObjectTypes` | `['globalObjectTypes']` |
| `templates` | `['templates']` |
| `objectRelations` | `['relations']` |
| `spaces` | `['spaces']` |
| `spaceShares` | `['spaceShares']` |
| `tags` | `['tags']` |
| `pins` | `['pins']` |

## Cache Configuration

| Setting | Value | Why |
|---------|-------|-----|
| staleTime | 30s | Data shown instantly, refetched in background after 30s |
| gcTime | 5min | Unused cache entries garbage-collected after 5 minutes |
| refetchOnWindowFocus | false | Realtime + BroadcastChannel handles freshness |
| retry | 1 | Single retry on failure |
