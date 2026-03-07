# 02 -- The Data Layer

The data layer is the most important architectural piece in Swashbuckler. Every feature reads and writes through it. Understanding this layer well is a prerequisite for productive work on the codebase.

The core idea: a single `DataClient` interface sits between all UI code and all storage backends. Today there are two backends -- Supabase (for authenticated users) and Dexie/IndexedDB (for guests). The UI never cares which one is active.

---

## Table of Contents

- [The DataClient Interface](#the-dataclient-interface)
- [The Two Implementations](#the-two-implementations)
- [DataProvider -- How Storage Mode is Chosen](#dataprovider----how-storage-mode-is-chosen)
- [TanStack Query Integration](#tanstack-query-integration)
- [The Hook Pattern](#the-hook-pattern)
- [The Event System](#the-event-system)
- [The Mutation Action Wrapper](#the-mutation-action-wrapper)
- [Complete Read/Write Walkthrough](#complete-readwrite-walkthrough)
- [Error Handling](#error-handling)
- [Cross-Tab and Cross-User Sync](#cross-tab-and-cross-user-sync)
- [Key Files Reference](#key-files-reference)
- [Gotchas](#gotchas)
- [Exercises](#exercises)

---

## The DataClient Interface

File: `apps/web/src/shared/lib/data/types.ts`

`DataClient` is the top-level interface every hook and component uses to talk to storage. It exposes ten sub-clients and one runtime flag:

```typescript
export interface DataClient {
  objects: ObjectsClient
  objectTypes: ObjectTypesClient
  globalObjectTypes: GlobalObjectTypesClient
  templates: TemplatesClient
  relations: RelationsClient
  spaces: SpacesClient
  sharing: SharingClient
  tags: TagsClient
  pins: PinsClient
  savedViews: SavedViewsClient
  isLocal: boolean
}
```

### Sub-Client Summary

| Sub-Client | Purpose |
|---|---|
| `objects` | CRUD for data objects (pages, notes, etc.). Includes search, soft delete, archive, batch summary, and expired-trash purge. |
| `objectTypes` | CRUD for space-scoped object types. Includes archive/unarchive. |
| `globalObjectTypes` | CRUD for global (cross-space) object types. Has `importToSpace()` to copy a global type into a specific space. |
| `templates` | CRUD for templates, scoped by type. |
| `relations` | Object-to-object relations. Supports `link` and `mention` types. Has `syncMentions()` for editor content sync. |
| `spaces` | CRUD for spaces. Includes archive/unarchive. |
| `sharing` | Space sharing -- create/update/delete shares, manage exclusions (hide types, objects, or fields from collaborators), find users by email, list shared spaces. |
| `tags` | Tag management, object-tag associations, batch queries, count queries. |
| `pins` | Pin/unpin objects. Pins are user-scoped. |
| `savedViews` | Saved filter/sort/view-mode configurations for type pages. |

### Return Types

Every method returns one of two result types:

```typescript
export interface DataResult<T> {
  data: T | null
  error: DataError | null
}

export interface DataListResult<T> {
  data: T[]
  error: DataError | null
}

export interface DataError {
  message: string
  code?: string
}
```

This is a discriminated result pattern -- not exceptions. Callers check `result.error` before using `result.data`. The hooks layer (covered below) converts errors into thrown exceptions for TanStack Query, or into toast notifications for mutations.

### The `isLocal` Flag

`DataClient.isLocal` is a boolean that tells you which implementation is active. Some UI code uses this for conditional behavior (e.g., showing a "Sign in to sync" banner).

---

## The Two Implementations

### Supabase (`supabase.ts`) -- Authenticated Users

File: `apps/web/src/shared/lib/data/supabase.ts`

Created via `createSupabaseDataClient(supabase, spaceId, userId)`. Uses the `@supabase/supabase-js` client to make PostgREST queries. Key characteristics:

- **Space-scoped**: Most queries filter by the `spaceId` parameter passed at construction time. This means the client is rebuilt when the user switches spaces.
- **RLS-enforced**: Row Level Security on Supabase ensures users can only see their own data (and data shared with them). The client does not need to add `owner_id` filters -- RLS handles it.
- **User ID injected**: The `userId` is passed so the client can set `owner_id` on creates where needed.
- `isLocal` is `false`.

### Dexie/IndexedDB (`local.ts`) -- Guest Users

File: `apps/web/src/shared/lib/data/local.ts`

Created via `createLocalDataClient(spaceId)`. Uses Dexie.js to talk to the browser's IndexedDB. Key characteristics:

- **Fully offline**: No network calls. Everything is local to the browser.
- **Own migration system**: Dexie has its own schema versioning (currently at version 14 with tables for objects, objectTypes, templates, objectRelations, spaces, tags, objectTags, pins, savedViews). These are separate from the Supabase migrations.
- **Default local space**: Uses the ID `00000000-0000-0000-0000-000000000099` as a default space for local data.
- **No sharing**: The sharing sub-client returns empty results / no-ops. Sharing only works with Supabase.
- `isLocal` is `true`.

### How to Think About It

The two implementations are functionally equivalent for core CRUD operations. The Supabase client adds real multi-user features (sharing, realtime sync, RLS). The Dexie client is the zero-friction guest experience. When a guest signs up, `migrateToSupabase()` moves their local data to the cloud (covered below).

---

## DataProvider -- How Storage Mode is Chosen

File: `apps/web/src/shared/lib/data/DataProvider.tsx`

`DataProvider` is a React context provider that creates the correct `DataClient` and exposes it to the entire component tree. Here is what happens when it mounts:

### 1. Storage Mode Decision

```typescript
const storageMode: StorageMode = user ? 'supabase' : 'local'
```

The `user` prop (a Supabase `User | null`) is the single input. If there is a user, we use Supabase. If not, we use local.

### 2. Data Client Construction

```typescript
const dataClient = useMemo(() => {
  const effectiveSpaceId = spaceId ?? undefined
  if (user) {
    return createSupabaseDataClient(supabase, effectiveSpaceId, user.id)
  }
  return createLocalDataClient(effectiveSpaceId)
}, [user, supabase, spaceId])
```

The client is `useMemo`-d and recreated whenever `user` or `spaceId` changes. When the user switches spaces, a new client is created, and all existing TanStack Query caches become stale (because they were keyed to the old space ID).

### 3. Realtime Subscription

```typescript
useEffect(() => {
  if (!user) return
  return subscribeToRealtimeChanges(supabase)
}, [user, supabase])
```

For authenticated users, this subscribes to Supabase Realtime (postgres_changes) for cross-user sync. The subscription is cleaned up on unmount. More on this in [Cross-Tab and Cross-User Sync](#cross-tab-and-cross-user-sync).

### 4. Expired Trash Purge

```typescript
useEffect(() => {
  if (isAuthLoading) return
  dataClient.objects.purgeExpired().then(result => {
    if (result.error) {
      console.error('Failed to purge expired trash items:', result.error.message)
    }
  })
}, [dataClient, isAuthLoading])
```

On mount (after auth resolves), the provider purges any objects that have been in the trash past their retention period.

### 5. The Migration Path

`DataProvider` exposes a `migrateToSupabase()` function (via context) that moves all local Dexie data into the user's Supabase account. The algorithm:

1. Export all local data via `exportLocalData()` (returns `{ objects, objectTypes, templates, objectRelations, spaces }`).
2. Map local type IDs to Supabase type IDs by slug. If a type with the same slug already exists in Supabase, reuse its ID. Otherwise, create it.
3. Create all objects in Supabase, mapping `type_id` to the new IDs.
4. Create all templates, again remapping `type_id`.
5. Create all relations, remapping both `source_id` and `target_id` via the object ID map.
6. Call `clearLocalData()` to wipe Dexie.

This runs once when a guest signs up or logs in for the first time.

### Context Consumers

`DataProvider` exports several hooks for accessing its context:

| Hook | Returns |
|---|---|
| `useDataClient()` | The active `DataClient` instance |
| `useStorageMode()` | `'supabase'` or `'local'` |
| `useAuth()` | `{ user, isLoading, isGuest }` |
| `useSpaceId()` | Current space ID or `null` |
| `useMigrateData()` | The `migrateToSupabase` function |

---

## TanStack Query Integration

TanStack Query is the caching and data-fetching layer. It sits between the hooks (which components call) and the data client (which talks to storage).

### Configuration

Set up in `apps/web/src/app/providers.tsx`:

```typescript
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 seconds
      gcTime: 5 * 60_000,       // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof DataLayerError && !error.retryable) return false
        return failureCount < 1
      },
    },
  },
}))
```

Key decisions:

- **`staleTime: 30s`**: Data is considered fresh for 30 seconds. During this window, TanStack Query returns cached data without hitting the backend.
- **`gcTime: 5min`**: Unused cache entries are garbage-collected after 5 minutes.
- **`refetchOnWindowFocus: false`**: Disabled because we have our own invalidation system (events + realtime).
- **Custom retry**: Non-retryable errors (unique violations, FK violations, permission denied, auth failures) skip retry entirely. Everything else gets one retry.

### Query Key Factory

File: `apps/web/src/shared/lib/data/queryKeys.ts`

All query keys are generated by a factory object. This ensures consistent key structure and makes invalidation predictable.

```typescript
export const queryKeys = {
  objects: {
    all:     (spaceId?: string) => ['objects', spaceId] as const,
    list:    (spaceId?: string, options?: ListObjectsOptions) =>
               ['objects', spaceId, 'list', options] as const,
    content: (spaceId?: string, options?: ListObjectsOptions) =>
               ['objects', spaceId, 'content', options] as const,
    detail:  (id: string) => ['objects', 'detail', id] as const,
  },
  objectTypes: {
    all:    (spaceId?: string) => ['objectTypes', spaceId] as const,
    list:   (spaceId?: string, options?: ListObjectTypesOptions) =>
              ['objectTypes', spaceId, 'list', options] as const,
    detail: (id: string) => ['objectTypes', 'detail', id] as const,
  },
  globalObjectTypes: {
    all:    () => ['globalObjectTypes'] as const,
    list:   () => ['globalObjectTypes', 'list'] as const,
    detail: (id: string) => ['globalObjectTypes', 'detail', id] as const,
  },
  tags: {
    all:             (spaceId?: string) => ['tags', spaceId] as const,
    list:            (spaceId?: string) => ['tags', spaceId, 'list'] as const,
    objectTags:      (objectId: string) => ['tags', 'objectTags', objectId] as const,
    objectTagsBatch: (objectIds: string[]) => ['tags', 'objectTagsBatch', objectIds] as const,
    objectsByTag:    (tagId: string) => ['tags', 'objectsByTag', tagId] as const,
    countByTag:      (tagId: string) => ['tags', 'countByTag', tagId] as const,
    countsByTags:    (tagIds: string[]) => ['tags', 'countsByTags', tagIds] as const,
  },
  pins: {
    list: (spaceId?: string) => ['pins', spaceId] as const,
  },
  templates: {
    all:    (spaceId?: string) => ['templates', spaceId] as const,
    list:   (spaceId?: string, typeId?: string) =>
              ['templates', spaceId, 'list', typeId] as const,
    detail: (id: string) => ['templates', 'detail', id] as const,
  },
  relations: {
    all:  (spaceId?: string) => ['relations', 'all', spaceId] as const,
    list: (objectId: string) => ['relations', objectId] as const,
  },
  shares: {
    list: (spaceId: string) => ['shares', spaceId] as const,
  },
  savedViews: {
    all:  (spaceId?: string) => ['savedViews', spaceId] as const,
    list: (spaceId?: string, typeId?: string) =>
            ['savedViews', spaceId, 'list', typeId] as const,
  },
}
```

**Why `spaceId` is in most keys**: Data is space-scoped. When the user switches spaces, the data client is rebuilt (new `spaceId`), and all queries with the old `spaceId` in their key are effectively orphaned. New queries with the new `spaceId` start fresh. This is correct -- you do not want stale data from Space A showing up in Space B.

**Hierarchical invalidation**: TanStack Query supports prefix-based invalidation. Calling `invalidateQueries({ queryKey: ['objects'] })` invalidates every query whose key starts with `['objects']` -- all list queries, all detail queries, all spaces. This is exactly what the event system does after a mutation.

---

## The Hook Pattern

Every feature exposes hooks that wrap TanStack Query. The hooks are the public API that components consume. You should almost never call `dataClient` directly from a component.

### Read Pattern

Here is the `useObjectTypes` hook (simplified for clarity):

```typescript
// File: apps/web/src/features/object-types/hooks/useObjectTypes.ts

const EMPTY_TYPES: ObjectType[] = []

export function useObjectTypes(options: UseObjectTypesOptions = {}): UseObjectTypesReturn {
  const dataClient = useDataClient()
  const queryClient = useQueryClient()
  const spaceId = useSpaceId()

  const queryOptions = useMemo<ListObjectTypesOptions>(() => ({
    isArchived: options.isArchived,
  }), [options.isArchived])

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objectTypes.list(spaceId ?? undefined, queryOptions),
    queryFn: async () => {
      const result = await dataClient.objectTypes.list(queryOptions)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    placeholderData: keepPreviousData,
  })

  // ... mutations omitted ...

  return {
    types: data ?? EMPTY_TYPES,
    isLoading,
    error: queryError?.message ?? null,
    // ... mutations ...
  }
}
```

Key things to notice:

1. **`queryKey`** uses the factory, including `spaceId` and `queryOptions`.
2. **`queryFn`** calls the data client, checks for errors, and throws if there is one (TanStack Query expects thrown errors for error states).
3. **`placeholderData: keepPreviousData`** prevents flickers when options change -- it shows the old data until the new data arrives.
4. **Return value** provides `data`, `isLoading`, `error`, and mutation functions.

### CRITICAL: Module-Level Empty Array Constants

This is the single most important gotcha in the codebase. Look at line 1:

```typescript
const EMPTY_TYPES: ObjectType[] = []
```

And its usage in the return:

```typescript
return {
  types: data ?? EMPTY_TYPES,
  // ...
}
```

**Why this matters**: If you write `data ?? []` instead, you create a new array reference on every render. If a consumer puts that array in a `useEffect` dependency list, it triggers every render, causing infinite loops. The module-level constant is the same reference every time.

```typescript
// CORRECT -- stable reference
const EMPTY_TYPES: ObjectType[] = []
return { types: data ?? EMPTY_TYPES }

// WRONG -- new array every render, causes infinite loops
return { types: data ?? [] }
```

Every list hook in the codebase follows this pattern. Do the same in any new hooks you write.

### Write Pattern

Mutations are wrapped with `useMutationAction` (covered in the next section). Here is how `useObjectTypes` sets up the create mutation:

```typescript
const createFn = useCallback(
  (input: CreateObjectTypeInput) => dataClient.objectTypes.create(input),
  [dataClient],
)
const create = useMutationAction(createFn, {
  actionLabel: 'Create type',
  emitChannels: ['objectTypes'],
})
```

The `useCallback` wraps the raw data client call. Then `useMutationAction` adds error toasting and event emission. The returned `create` function can be called directly from components.

### Single-Item Pattern

For fetching a single item by ID (e.g., `useObjectType(id)`), the pattern uses `enabled: !!id` to skip the query when no ID is provided:

```typescript
export function useObjectType(id: string | null) {
  const { data: objectType, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.objectTypes.detail(id!),
    queryFn: async () => {
      const result = await dataClient.objectTypes.get(id!)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!id,
    placeholderData: () => {
      // Try to find the item in existing list caches
      const lists = queryClient.getQueriesData<ObjectType[]>({
        queryKey: queryKeys.objectTypes.all(spaceId ?? undefined),
      })
      for (const [, items] of lists) {
        const match = items?.find(t => t.id === id)
        if (match) return match
      }
      return undefined
    },
  })
  // ...
}
```

The `placeholderData` callback is a nice optimization: before making a network request for a single item, it checks whether that item already exists in any list query cache. If it does, it shows that data immediately while the detail query fetches fresh data in the background.

---

## The Event System

File: `apps/web/src/shared/lib/data/events.ts`

The event system is the glue between mutations and cache invalidation. It has two jobs: invalidate TanStack Query caches and notify other browser tabs.

### Channels

```typescript
export type EventChannel =
  | 'objects'
  | 'objectTypes'
  | 'globalObjectTypes'
  | 'templates'
  | 'objectRelations'
  | 'spaces'
  | 'spaceShares'
  | 'tags'
  | 'pins'
  | 'savedViews'
```

Each channel maps to a query key prefix:

```typescript
const channelToQueryPrefix: Record<EventChannel, string[]> = {
  objects:           ['objects'],
  objectTypes:       ['objectTypes'],
  globalObjectTypes: ['globalObjectTypes'],
  templates:         ['templates'],
  objectRelations:   ['relations'],
  spaces:            ['spaces'],
  spaceShares:       ['shares'],
  tags:              ['tags'],
  pins:              ['pins'],
  savedViews:        ['savedViews'],
}
```

Note that the channel names and query key prefixes are not always the same (e.g., `'objectRelations'` channel maps to `['relations']` query key prefix, and `'spaceShares'` maps to `['shares']`).

### `emit(channel)`

This is the function mutations call after a successful write:

```typescript
export function emit(channel: EventChannel): void {
  invalidateChannel(channel)
  bc?.postMessage(channel)
}
```

It does two things:

1. **Invalidates queries**: Looks up the query key prefix for the channel and calls `queryClient.invalidateQueries({ queryKey: [prefix] })`. This marks all matching queries as stale and triggers refetches for any that are currently mounted.
2. **Broadcasts to other tabs**: Posts the channel name to a `BroadcastChannel` named `'swashbuckler-events'`. Other tabs receive this message and run `invalidateChannel` themselves.

### `subscribe(channel, listener)`

A legacy listener system. Some older code still uses direct subscriptions instead of TanStack Query. The `invalidateChannel` function calls both legacy listeners and query invalidation.

### `setQueryClient(client)`

Called once at startup (in `providers.tsx`) to wire the query client reference into the event system. Without this, `emit` cannot invalidate queries.

```typescript
// In providers.tsx
useEffect(() => {
  setQueryClient(queryClient)
}, [queryClient])
```

### BroadcastChannel Guard

BroadcastChannel is not available in SSR contexts. The module guards against this:

```typescript
const bc = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('swashbuckler-events')
  : null
```

---

## The Mutation Action Wrapper

File: `apps/web/src/shared/hooks/useMutationAction.ts`

Every write operation in the codebase goes through `useMutationAction` or `useVoidMutationAction`. These wrappers standardize error handling, success callbacks, and event emission.

### `useMutationAction<Args, T>`

```typescript
export function useMutationAction<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<DataResult<T>>,
  options: MutationActionOptions<T>,
): (...args: Args) => Promise<T | null>
```

Takes:
- `fn`: An async function that returns `DataResult<T>` (the raw data client call, typically wrapped in `useCallback`).
- `options.actionLabel`: Human-readable label for the error toast title (e.g., `"Create object"`).
- `options.emitChannels`: Array of event channels to emit on success.
- `options.onSuccess`: Optional callback fired after a successful mutation.

Returns: A function with the same signature as `fn`, but returning `T | null` (null on failure).

Behavior:
1. Calls `fn(...args)`.
2. If `result.error`: shows a destructive toast with the action label and error message. Returns `null`.
3. If success: calls `onSuccess(result.data)`, then emits all specified channels (which triggers query invalidation + cross-tab broadcast). Returns `result.data`.

### `useVoidMutationAction<Args>`

Same as above but for `DataResult<void>` mutations (like delete). Returns `boolean` (true on success, false on failure).

### Stable Callbacks via Refs

Both wrappers use `useRef` to keep `emitChannels` and `onSuccess` callbacks stable:

```typescript
const emitChannelsRef = useRef(emitChannels)
const onSuccessRef = useRef(onSuccess)
useEffect(() => { emitChannelsRef.current = emitChannels }, [emitChannels])
useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
```

This prevents stale closures -- the `useCallback` that wraps the mutation only depends on `[fn, actionLabel]`, but it always reads the latest `emitChannels` and `onSuccess` via refs.

---

## Complete Read/Write Walkthrough

### Reading Objects

Let's trace what happens when a component calls `useObjects()` and renders a list:

1. **Component renders**, calling `useObjects({ typeId: 'abc' })`.
2. The hook calls `useDataClient()` to get the active `DataClient` and `useSpaceId()` to get the current space.
3. It passes `queryKey: queryKeys.objects.list(spaceId, { typeId: 'abc' })` to `useQuery`. This produces a key like `['objects', 'space-123', 'list', { typeId: 'abc' }]`.
4. **TanStack Query checks its cache**:
   - If a cached entry exists and is less than 30 seconds old (`staleTime`), it returns the cached data immediately. No network call.
   - If the cache is stale or missing, it calls the `queryFn`.
5. The `queryFn` calls `dataClient.objects.list({ typeId: 'abc' })`.
6. **If Supabase**: This translates to a PostgREST query like `supabase.from('objects').select('...').eq('space_id', spaceId).eq('type_id', 'abc')...`.
   **If Dexie**: This translates to `db.objects.where({ space_id: spaceId, type_id: 'abc' })...`.
7. The result comes back as `DataListResult<DataObjectSummary>`. If there is an error, the `queryFn` throws it (TanStack Query catches it).
8. The hook returns `{ objects: data ?? EMPTY_OBJECTS, isLoading, error }`.
9. The component renders the objects.

### Creating an Object

Let's trace what happens when a user clicks "New Page":

1. **Component calls `create(input)`** from the `useObjects()` hook.
2. `create` is the function returned by `useMutationAction`. It calls the wrapped `createFn`.
3. `createFn` calls `dataClient.objects.create(input)`.
4. **If Supabase**: This inserts a row into the `objects` table via PostgREST. RLS checks that the user owns the space.
   **If Dexie**: This adds a record to the `objects` table in IndexedDB.
5. The data client returns `DataResult<DataObject>`.
6. **If error**: `useMutationAction` shows a toast notification: title "Create object", description is the error message. Returns `null`.
7. **If success**: `useMutationAction` calls `onSuccess` (if provided), then iterates `emitChannels: ['objects']` and calls `emit('objects')` for each.
8. `emit('objects')` does two things:
   - Calls `queryClient.invalidateQueries({ queryKey: ['objects'] })`. This marks every query whose key starts with `['objects']` as stale. Any mounted query refetches.
   - Posts `'objects'` to the BroadcastChannel. Other tabs of the same app receive this and also invalidate their `['objects']` queries.
9. **If Supabase Realtime is active**: Other users who are subscribed to postgres_changes on the `objects` table receive a notification. Their `handleChange('objects')` fires, which calls `emit('objects')`, which invalidates their caches too.
10. The list component re-renders with the new object.

---

## Error Handling

File: `apps/web/src/shared/lib/data/errors.ts`

### `DataLayerError`

```typescript
export class DataLayerError extends Error {
  readonly code: string | undefined
  readonly retryable: boolean
  readonly isAuth: boolean

  constructor(dataError: DataError) {
    super(dataError.message)
    this.name = 'DataLayerError'
    this.code = dataError.code
    this.isAuth = isAuthError(dataError)
    this.retryable = !this.isAuth && !PERMANENT_CODES.has(dataError.code ?? '')
  }
}
```

Three flags:
- **`code`**: The raw Postgres or PostgREST error code.
- **`retryable`**: `false` for permanent errors (no point retrying). `true` for transient errors (network issues, timeouts).
- **`isAuth`**: `true` for authentication failures (expired JWT, invalid refresh token, etc.).

### Non-Retryable Error Codes

| Code | Meaning |
|---|---|
| `23505` | Unique violation (Postgres) |
| `23503` | Foreign key violation (Postgres) |
| `42501` | Insufficient privilege (Postgres) |
| `42P01` | Undefined table (Postgres) |
| `PGRST116` | Row not found (PostgREST) |
| `PGRST204` | Column not found (PostgREST) |
| `23514` | Check violation (Postgres) |

### Auth Error Detection

Auth errors are detected by pattern-matching on the error message:

```typescript
const AUTH_PATTERNS = [
  'JWT expired',
  'invalid claim',
  'not authenticated',
  'Invalid Refresh Token',
  'Auth session missing',
]
```

### Session Guard

File: `apps/web/src/shared/hooks/useSessionGuard.ts`

`useSessionGuard()` subscribes to the TanStack Query cache. When any query errors with an auth error, it redirects to `/login?expired=true`. This is a global catch-all -- you do not need to handle auth errors in individual hooks.

```typescript
export function useSessionGuard() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    const cache = queryClient.getQueryCache()
    const unsubscribe = cache.subscribe((event) => {
      if (hasRedirected.current) return
      if (event.type !== 'updated' || event.action.type !== 'error') return
      const error = event.action.error
      if (error instanceof Error && isAuthError(error)) {
        hasRedirected.current = true
        router.push('/login?expired=true')
      }
    })
    return unsubscribe
  }, [queryClient, router])
}
```

The `hasRedirected` ref prevents multiple redirects if several queries fail simultaneously.

### How Retry Integrates

The TanStack Query client uses `DataLayerError.retryable` in its retry function:

```typescript
retry: (failureCount, error) => {
  if (error instanceof DataLayerError && !error.retryable) return false
  return failureCount < 1
}
```

This means: if the error is a `DataLayerError` and it is not retryable, do not retry at all. Otherwise, retry once. Transient network errors get one automatic retry. Permanent errors (unique violation, permission denied, etc.) fail immediately.

---

## Cross-Tab and Cross-User Sync

The app has three levels of synchronization, each handled by a different mechanism:

### 1. Same Tab (Same User)

**Mechanism**: `emit()` --> `invalidateQueries()`

After a mutation, `emit(channel)` is called. This immediately invalidates matching TanStack Query caches in the current tab. Mounted queries refetch.

### 2. Other Tabs (Same User)

**Mechanism**: `BroadcastChannel` --> `invalidateChannel()`

`emit()` also posts the channel to a `BroadcastChannel` named `'swashbuckler-events'`. Other tabs of the app listen for these messages:

```typescript
bc?.addEventListener('message', (event) => {
  const channel = event.data as EventChannel
  invalidateChannel(channel)
})
```

When they receive a message, they invalidate the matching queries in their own TanStack Query cache. This means: if you create an object in Tab A, Tab B will see it appear within seconds.

### 3. Other Users (Supabase Realtime)

**Mechanism**: Supabase postgres_changes --> `emit()` --> `invalidateQueries()`

File: `apps/web/src/shared/lib/data/realtime.ts`

For authenticated users, `subscribeToRealtimeChanges()` opens a Supabase Realtime channel that listens for changes on all relevant tables:

```typescript
const realtimeChannel = supabase
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'objects' },
    () => handleChange('objects'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'object_types' },
    () => handleChange('object_types'))
  // ... all other tables ...
  .subscribe()
```

When another user modifies data, Supabase sends a notification. The `handleChange` function maps the table name to an event channel and calls `emit()`, which invalidates the local cache. The same debounce mechanism (100ms) batches rapid changes:

```typescript
const DEBOUNCE_MS = 100

function handleChange(table: string) {
  const channel = TABLE_TO_CHANNEL[table]
  if (!channel) return
  pending.add(channel)
  if (!timer) {
    timer = setTimeout(flush, DEBOUNCE_MS)
  }
}
```

The table-to-channel mapping handles cases where Postgres table names differ from event channels (e.g., `object_tags` --> `'tags'`).

### 4. Realtime Collaboration (Yjs)

Document-level collaboration (multiple users editing the same page simultaneously) uses an entirely separate system: Yjs CRDTs over Supabase Broadcast channels. This is not part of the data layer covered here -- see the collaboration onboarding doc for details.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `apps/web/src/shared/lib/data/types.ts` | All Zod schemas, TypeScript types, sub-client interfaces, and the `DataClient` interface |
| `apps/web/src/shared/lib/data/DataProvider.tsx` | React context provider; creates the correct data client; exposes `useDataClient()`, `useStorageMode()`, `useAuth()`, `useSpaceId()`, `useMigrateData()` |
| `apps/web/src/shared/lib/data/supabase.ts` | Supabase implementation of `DataClient` |
| `apps/web/src/shared/lib/data/local.ts` | Dexie/IndexedDB implementation of `DataClient` |
| `apps/web/src/shared/lib/data/queryKeys.ts` | TanStack Query key factory |
| `apps/web/src/shared/lib/data/events.ts` | Event system (`emit`, `subscribe`, BroadcastChannel, query invalidation bridge) |
| `apps/web/src/shared/lib/data/errors.ts` | `DataLayerError` class, permanent error codes, auth error detection |
| `apps/web/src/shared/lib/data/realtime.ts` | Supabase Realtime subscription for cross-user sync |
| `apps/web/src/shared/hooks/useMutationAction.ts` | `useMutationAction` and `useVoidMutationAction` wrappers |
| `apps/web/src/shared/hooks/useSessionGuard.ts` | Global auth error watcher; redirects to `/login?expired=true` |
| `apps/web/src/app/providers.tsx` | Top-level provider tree; creates `QueryClient`, wires `setQueryClient`, sets up `SpaceProvider` and `DataProvider` |
| `apps/web/src/features/objects/hooks/useObjects.ts` | Hook for objects CRUD -- canonical example of the hook pattern |
| `apps/web/src/features/object-types/hooks/useObjectTypes.ts` | Hook for object types CRUD -- another canonical example |

---

## Gotchas

### 1. Empty Array Constants Must Be Module-Level

```typescript
// At the top of the file, outside any function:
const EMPTY_ITEMS: Item[] = []

// In the hook return:
return { items: data ?? EMPTY_ITEMS }
```

Never use `data ?? []`. The inline empty array creates a new reference on every render. If a consumer puts the result in a `useEffect` dependency list, it triggers on every render, creating infinite loops. This has caused production bugs.

### 2. DataClient is Recreated When `spaceId` Changes

When the user switches spaces, `DataProvider` creates a new `DataClient` via `useMemo`. This means all existing queries are now using a stale client reference. The queries will still work (they capture the client at mount time), but new queries use the new client. The space ID in query keys ensures old and new queries do not collide.

### 3. Local Migration Maps Type IDs by Slug

`migrateToSupabase()` matches local types to Supabase types by `slug`. If the slugs match, the existing Supabase type ID is used. If they do not match, a new type is created. This means: if a user renames a type's slug locally before migrating, they will get a duplicate type in Supabase.

### 4. BroadcastChannel Not Available in SSR

The event system guards against SSR with `typeof BroadcastChannel !== 'undefined'`. If you add code that uses `BroadcastChannel` elsewhere, do the same check.

### 5. Query Key Hierarchy Matters for Invalidation

`invalidateQueries({ queryKey: ['objects'] })` invalidates ALL object queries -- every list, every detail, every space's objects. This is intentional for `emit('objects')` because a mutation could affect any list. But if you need to invalidate a specific query only, use a more specific key:

```typescript
// Invalidates everything:
queryClient.invalidateQueries({ queryKey: ['objects'] })

// Invalidates only one space's lists:
queryClient.invalidateQueries({ queryKey: queryKeys.objects.all(spaceId) })

// Invalidates only one object's detail:
queryClient.invalidateQueries({ queryKey: queryKeys.objects.detail(objectId) })
```

### 6. Event Channel Names and Query Key Prefixes Differ

The `objectRelations` event channel maps to the `relations` query key prefix. The `spaceShares` channel maps to `shares`. If you add a new event channel, make sure the `channelToQueryPrefix` mapping is correct or your invalidations will silently do nothing.

### 7. `useMutationAction` Callbacks Are Read via Refs

The `onSuccess` and `emitChannels` options you pass to `useMutationAction` are stored in refs and read at call time, not at hook creation time. This means you can safely pass closures that capture changing state without worrying about stale values. But it also means you should not rely on the identity of these callbacks for any comparison logic.

---

## Exercises

1. **Add a new sub-client to `DataClient`** (e.g., `bookmarks`). Trace every file that needs changes: the interface in `types.ts`, both implementations (`supabase.ts` and `local.ts`), the query key factory in `queryKeys.ts`, the event channel in `events.ts`, the channel-to-prefix mapping, and the realtime table subscription. How many files need to change?

2. **Follow an `emit('objects')` call** through `events.ts`. Starting from the `emit` function, trace which lines execute. What query keys get invalidated? What happens in other browser tabs? What happens if `queryClientRef` is null?

3. **Read `useMutationAction`** in `apps/web/src/shared/hooks/useMutationAction.ts`. Explain why `emitChannels` and `onSuccess` are stored in refs instead of being captured directly in the `useCallback` closure. What bug would occur without the refs?

4. **Read `queryKeys.ts`** and explain why `spaceId` is included in most key factories but not in `globalObjectTypes`. What would happen if `spaceId` were omitted from the `objects.list` key? What would happen if it were added to `globalObjectTypes.list`?
