# State Management

This document covers how state is managed across the Swashbuckler application. The codebase uses four distinct approaches, each chosen for a specific category of state. Understanding which tool to reach for -- and why -- is essential for working in this codebase without introducing bugs.

---

## State Management Philosophy

The guiding principle: **use the simplest approach for each type of state. Don't put everything in one place.**

| Approach | Purpose | Examples |
|---|---|---|
| TanStack Query | Server state (data from Supabase/Dexie) | Objects, object types, templates, tags |
| React Context | Dependency injection (data client, space, auth) | DataProvider, SpaceProvider |
| Zustand | Client-side global state (UI state spanning components) | Editor dirty state, modal open/close, sidebar |
| localStorage | Persistence across sessions | Current space ID, view mode preferences, custom themes |

These layers are complementary. Server data flows through TanStack Query. Configuration and identity flow through React Context. UI state lives in Zustand. Simple cross-session persistence uses localStorage.

---

## TanStack Query -- Server State

This is the primary state management for anything that lives in the database. It is not traditional state management -- it is a **cache with automatic refetching**.

### Query Keys

Every database entity has a query key factory in `apps/web/src/shared/lib/data/queryKeys.ts`:

```ts
export const queryKeys = {
  objects: {
    all: (spaceId?: string) => ['objects', spaceId] as const,
    list: (spaceId?: string, options?: ListObjectsOptions) => ['objects', spaceId, 'list', options] as const,
    content: (spaceId?: string, options?: ListObjectsOptions) => ['objects', spaceId, 'content', options] as const,
    detail: (id: string) => ['objects', 'detail', id] as const,
  },
  objectTypes: {
    all: (spaceId?: string) => ['objectTypes', spaceId] as const,
    list: (spaceId?: string, options?: ListObjectTypesOptions) => ['objectTypes', spaceId, 'list', options] as const,
    detail: (id: string) => ['objectTypes', 'detail', id] as const,
  },
  tags: {
    all: (spaceId?: string) => ['tags', spaceId] as const,
    list: (spaceId?: string) => ['tags', spaceId, 'list'] as const,
    objectTags: (objectId: string) => ['tags', 'objectTags', objectId] as const,
    // ... more granular keys
  },
  templates: { /* ... */ },
  relations: { /* ... */ },
  shares: { /* ... */ },
  savedViews: { /* ... */ },
  pins: { /* ... */ },
}
```

Keys follow a hierarchical structure. Invalidating `['objects']` invalidates all object queries. Invalidating `['objects', 'detail', id]` invalidates only a single object.

### Cache Configuration

The global QueryClient is configured in `apps/web/src/app/providers.tsx`:

```ts
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // Data is fresh for 30 seconds
      gcTime: 5 * 60_000,     // Garbage collect after 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof DataLayerError && !error.retryable) return false
        return failureCount < 1
      },
    },
  },
}))
```

- **staleTime: 30s** -- Queries won't refetch if data is less than 30 seconds old.
- **gcTime: 5min** -- Unused cache entries are garbage collected after 5 minutes.
- **refetchOnWindowFocus: false** -- Disabled because the app uses its own event-based invalidation.
- **retry: 1 attempt** -- Non-retryable DataLayerErrors fail immediately.

### Invalidation via the Event System

The app does not call `queryClient.invalidateQueries()` directly from components. Instead, mutations call `emit(channel)` which triggers invalidation through an event bridge.

The bridge lives in `apps/web/src/shared/lib/data/events.ts`:

```ts
export type EventChannel =
  | 'objects' | 'objectTypes' | 'globalObjectTypes'
  | 'templates' | 'objectRelations' | 'spaces'
  | 'spaceShares' | 'tags' | 'pins' | 'savedViews'

export function emit(channel: EventChannel): void {
  // 1. Notify in-tab subscribers (legacy listeners)
  invalidateChannel(channel)
  // 2. Broadcast to other browser tabs
  bc?.postMessage(channel)
}
```

When `emit('objects')` is called:
1. All `subscribe('objects', fn)` listeners fire (used by SpaceProvider and other imperative listeners).
2. `queryClient.invalidateQueries({ queryKey: ['objects'] })` runs, refetching all object queries.
3. A `BroadcastChannel` message is sent to other tabs, which run the same invalidation.

The QueryClient reference is wired up in `providers.tsx` on mount:

```ts
useEffect(() => {
  setQueryClient(queryClient)
}, [queryClient])
```

### When to Use TanStack Query

Any data that lives in the database. If it comes from `DataClient`, it goes through TanStack Query. You should never store fetched server data in Zustand or React state -- let TanStack Query own it.

---

## React Context -- Dependency Injection

React Context is used for wiring up dependencies that many components need, not for frequently-changing state. The values in these contexts change rarely -- on login/logout, space switch, or initial load.

### Provider Hierarchy

The provider tree is assembled in `apps/web/src/app/providers.tsx`:

```
ThemeProvider (next-themes)
  QueryClientProvider (TanStack Query)
    SpaceProvider (space selection, CRUD)
      CustomThemeApplier
      DataProviderWithSpace (data client, auth, space-scoped queries)
        {children}
        TutorialController
    Toaster
```

The ordering matters. `SpaceProvider` wraps `DataProvider` because `DataProvider` needs the current `spaceId` to scope its data client. An inner component `DataProviderWithSpace` reads from `useCurrentSpace()` and passes the space ID down.

### DataContext (DataProvider.tsx)

File: `apps/web/src/shared/lib/data/DataProvider.tsx`

Provides the core data layer to the entire app:

```ts
interface DataContextValue {
  dataClient: DataClient      // Active DataClient implementation
  storageMode: StorageMode    // 'supabase' or 'local'
  user: User | null           // Supabase User or null for guest
  isLoading: boolean          // Auth loading state
  spaceId: string | null      // Current space ID
  migrateToSupabase: () => Promise<void>  // Local-to-cloud migration
}
```

Exposed hooks:
- `useDataClient()` -- returns the active `DataClient` (Supabase or Dexie, scoped to current space)
- `useStorageMode()` -- returns `'supabase'` or `'local'`
- `useAuth()` -- returns `{ user, isLoading, isGuest }`
- `useSpaceId()` -- returns the current space ID
- `useMigrateData()` -- returns the migration function

The `DataClient` is recreated via `useMemo` whenever `user` or `spaceId` changes. For authenticated users it creates a Supabase-backed client; for guests, a Dexie-backed client.

### SpaceContext (SpaceProvider.tsx)

File: `apps/web/src/shared/lib/data/SpaceProvider.tsx`

Manages space selection, listing, and CRUD. Exposes two separate contexts:

**SpaceContext** (current space state):
- `useCurrentSpace()` -- returns `{ space, spaces, switchSpace, leaveSpace, isLoading, sharedPermission }`

**SpacesContext** (space CRUD operations):
- `useSpaces()` -- returns `{ spaces, allSpaces, create, update, remove, archiveSpace, unarchiveSpace }`

Space selection is persisted to localStorage under `swashbuckler:currentSpaceId`. On load, the provider restores the last-selected space or falls back to the first active space.

### Why Context for This

- These values change rarely (space switch, login/logout).
- They need to be deeply available -- every data hook needs `dataClient`.
- They are not server state -- they are configuration and identity.

---

## Zustand -- Client-Side Global State

Zustand is used for UI state that multiple components need but that is not server data. Each store is small and focused on a single concern.

### Shared Stores

These live in `apps/web/src/shared/stores/`:

#### `navigation.ts` -- Navigation Loading State

```ts
interface NavigationStore {
  isNavigating: boolean
  setNavigating: (v: boolean) => void
}

export const useNavigation = create<NavigationStore>((set) => ({
  isNavigating: false,
  setNavigating: (v) => set({ isNavigating: v }),
}))
```

Controls the navigation progress bar. The `setNavigating` function must be called with `true` at navigation start and `false` at navigation end. If the cleanup is missed, the progress bar sticks.

#### `objectModal.ts` -- Object Editor Modal

```ts
interface ObjectModalState {
  objectId: string | null
  autoFocus: boolean
  onClose: (() => void) | null
  open: (id: string, opts?: { autoFocus?: boolean; onClose?: () => void }) => void
  close: () => void
}
```

Any component can open the object editor modal -- sidebar links, search results, dashboard cards, type page rows. The `onClose` callback is fired after the modal closes, allowing the caller to react (e.g., refocusing a trigger element).

#### `recentAccess.ts` -- Recently Accessed Objects

```ts
interface RecentAccessState {
  spaceId: string | null
  entries: RecentEntry[]              // { id, accessedAt }
  init: (spaceId: string) => void     // Load entries for a space
  trackAccess: (objectId: string) => void
  removeEntry: (objectId: string) => void
  getRecentIds: (limit: number) => string[]
}
```

Tracks which objects the user has viewed, scoped per space. Entries are persisted to localStorage under `swashbuckler:recentAccess:{spaceId}`. The store deduplicates entries and caps at 50 items. When `trackAccess` is called, the object is moved to the front of the list.

#### `sidebar.ts` -- Sidebar Collapse State

```ts
interface SidebarState {
  collapsed: boolean                  // Desktop sidebar collapsed
  toggle: () => void
  mobileOpen: boolean                 // Mobile sidebar open
  setMobileOpen: (open: boolean) => void
  pendingPath: string | null          // Navigate after mobile close
  setPendingPath: (path: string | null) => void
}
```

Persists the desktop collapsed state to localStorage under `swashbuckler:sidebarCollapsed`. Also manages mobile sidebar open/close and a `pendingPath` for navigation that should happen after the mobile sidebar animation completes.

### Feature Stores

#### `features/editor/store.ts` -- Editor Dirty/Saving State

```ts
interface EditorState {
  content: EditorContent
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  isCollaborative: boolean

  setContent: (content: EditorContent) => void
  markDirty: () => void
  markClean: () => void
  setSaving: (isSaving: boolean) => void
  setLastSaved: (date: Date) => void
  setCollaborative: (isCollaborative: boolean) => void
  reset: () => void
}
```

This is a **single global store** that assumes one active editor at a time. It tracks whether the editor content has changed (`isDirty`), whether a save is in flight (`isSaving`), and the last save timestamp. The `setLastSaved` action clears both `isDirty` and `isSaving` in one update. The `reset` action is called when navigating to a different object.

If multi-editor support is ever needed, this would need to become a per-instance store or context.

#### `features/theme-builder/stores/customTheme.ts` -- Custom Theme Definitions

```ts
interface CustomThemeState {
  themes: CustomTheme[]
  spaceThemes: Record<string, SpaceThemeAssignment>
  lastCustomThemeIds: Record<string, string>

  addTheme: (name, base, coreColors) => CustomTheme
  updateTheme: (id, name, base, coreColors) => void
  deleteTheme: (id) => void
  setSpaceTheme: (spaceId, assignment) => void
  togglePreset: (spaceId, presetId) => void
  clearSpaceTheme: (spaceId) => void
}
```

Manages custom theme CRUD and per-space theme assignments. All data is persisted to localStorage -- custom themes are a **client-only feature** and do not sync across devices. The store uses three localStorage keys:
- `swashbuckler:customThemes` -- array of custom theme definitions
- `swashbuckler:spaceThemes` -- mapping of space ID to theme assignment
- `swashbuckler:lastCustomThemeIds` -- remembers last custom theme per space for toggling

Includes migration logic for the old `swashbuckler:activeCustomTheme` key.

#### `features/table-view/stores/` -- View Configuration Stores

Four stores manage how type pages display their data:

**`viewMode.ts`** -- View mode per type slug (table/list/card/board):
```ts
export const useViewModeStore = create<ViewModeState>(...)
// localStorage key: swashbuckler:typeViewMode
// Defaults to 'table', or 'card' on mobile if no explicit choice
```

Also exports a `useViewMode(slug)` hook that handles mobile-responsive defaults.

**`filterConfig.ts`** -- Filter expressions per type slug:
```ts
export const useFilterConfigStore = create<FilterConfigState>(...)
// localStorage key: swashbuckler:filterExpression:v2
```

Exports `usePersistedFilters(slug)` for convenient per-type access.

**`sortConfig.ts`** -- Sort configuration per type slug:
```ts
export const useSortConfigStore = create<SortConfigState>(...)
// localStorage key: swashbuckler:typeSortConfig
```

Exports `useSortConfig(slug)` for convenient per-type access.

**`boardGrouping.ts`** -- Board view grouping field per type slug:
```ts
export const useBoardGroupingStore = create<BoardGroupingState>(...)
// localStorage key: swashbuckler:boardGroupField
```

Exports `useBoardGrouping(slug)` for convenient per-type access.

All four stores follow the same pattern: a `Record<string, T>` keyed by type slug, with getter/setter functions and localStorage persistence.

### Why Zustand for This

- These are pure client-side UI concerns.
- They don't belong in the database.
- Multiple unrelated components need them.
- React Context would cause unnecessary re-renders for every subscriber. Zustand uses selectors, so only the components that read the specific slice that changed will re-render.

---

## localStorage -- Cross-Session Persistence

Simple key-value pairs that survive page refresh. Most are read once at store initialization and then managed in-memory by Zustand.

| Key | Purpose | Read By |
|---|---|---|
| `swashbuckler:currentSpaceId` | Persisted space selection | SpaceProvider |
| `swashbuckler:customThemes` | Custom theme definitions | `useCustomThemeStore` |
| `swashbuckler:spaceThemes` | Space-to-theme assignment | `useCustomThemeStore` |
| `swashbuckler:lastCustomThemeIds` | Last custom theme per space | `useCustomThemeStore` |
| `swashbuckler:recentAccess:{spaceId}` | Recently accessed object IDs (per space) | `useRecentAccess` |
| `swashbuckler:sidebarCollapsed` | Sidebar collapsed state | `useSidebar` |
| `swashbuckler:typeViewMode` | View mode per type slug | `useViewModeStore` |
| `swashbuckler:filterExpression:v2` | Filter config per type slug | `useFilterConfigStore` |
| `swashbuckler:typeSortConfig` | Sort config per type slug | `useSortConfigStore` |
| `swashbuckler:boardGroupField` | Board grouping field per type slug | `useBoardGroupingStore` |

The pattern for localStorage usage in this codebase is consistent: read once at store creation (via a `readInitial()` function that handles SSR guards and parse errors), then write on every state change. Stores never read from localStorage during renders -- they only write to it.

---

## How They Interact

Here is the flow for a common scenario -- opening an object from the sidebar:

1. **User clicks an object link in the sidebar.**
2. **Zustand** (`objectModal.ts`): `open(objectId)` sets `objectId` and `isOpen: true`. The modal component re-renders.
3. **Zustand** (`recentAccess.ts`): `trackAccess(objectId)` pushes the ID to the front of the recent list and persists to localStorage.
4. **React Context**: Inside the modal, `useDataClient()` provides the data client scoped to the current space.
5. **TanStack Query**: `useQuery({ queryKey: queryKeys.objects.detail(id), queryFn: ... })` fetches the object data from the cache or the database.
6. **Zustand** (`editor/store.ts`): `reset()` clears dirty state for the new object.
7. **User edits content.**
8. **Zustand** (`editor/store.ts`): `setContent(newContent)` sets `isDirty: true`.
9. **Auto-save triggers** (after debounce).
10. **Zustand** (`editor/store.ts`): `setSaving(true)`.
11. **DataClient** mutation saves to Supabase/Dexie.
12. **Event system**: `emit('objects')` fires, which invalidates all `['objects', ...]` TanStack Query keys and broadcasts to other tabs.
13. **Zustand** (`editor/store.ts`): `setLastSaved(new Date())` clears `isDirty` and `isSaving`.

---

## Patterns and Anti-Patterns

### Do

- **Use TanStack Query for all server data.** If it comes from `DataClient`, it belongs in a query.
- **Use Zustand for cross-component UI state.** Modal open/close, navigation progress, editor dirty state.
- **Use React Context for dependency injection only.** Data client, auth, space -- things that rarely change and are needed everywhere.
- **Use localStorage for simple persistence.** Read once at init, write on change.
- **Keep Zustand stores small and focused.** One concern per store. The sidebar store manages sidebar state, not navigation state.
- **Use module-level constants for TanStack Query fallbacks.** See the gotchas section below.
- **Use Zustand selectors** to avoid re-rendering components that don't care about a particular slice of state.

### Don't

- **Don't put server data in Zustand.** Use TanStack Query instead. It handles caching, stale detection, and refetching.
- **Don't use React Context for frequently-changing state.** Every context consumer re-renders on every context value change. Zustand with selectors is the right tool for frequently-updating UI state.
- **Don't use inline `[]` as TanStack Query fallbacks.** Use module-level constants (see gotchas).
- **Don't mix localStorage reads into render paths.** Read once at initialization, store in Zustand, and write back on changes.
- **Don't put derived state in stores.** Compute it from queries or existing state instead.
- **Don't read TanStack Query data from inside Zustand stores.** Keep them separate. Components can read from both, but stores should not cross-reference each other's layers.

---

## Key Files Reference

| File | What It Contains |
|---|---|
| `apps/web/src/shared/lib/data/queryKeys.ts` | TanStack Query key factory for all entities |
| `apps/web/src/shared/lib/data/events.ts` | Event system bridging mutations to TanStack Query invalidation and cross-tab sync |
| `apps/web/src/shared/lib/data/DataProvider.tsx` | DataContext: data client, auth, storage mode, space ID |
| `apps/web/src/shared/lib/data/SpaceProvider.tsx` | SpaceContext: space selection, listing, CRUD |
| `apps/web/src/app/providers.tsx` | Provider tree assembly and QueryClient configuration |
| `apps/web/src/shared/stores/navigation.ts` | Navigation progress state |
| `apps/web/src/shared/stores/objectModal.ts` | Object editor modal state |
| `apps/web/src/shared/stores/recentAccess.ts` | Recently accessed objects (per space, localStorage-backed) |
| `apps/web/src/shared/stores/sidebar.ts` | Sidebar collapsed/mobile state |
| `apps/web/src/features/editor/store.ts` | Editor dirty/saving/collaborative state |
| `apps/web/src/features/theme-builder/stores/customTheme.ts` | Custom theme definitions and space assignments |
| `apps/web/src/features/table-view/stores/viewMode.ts` | View mode per type slug |
| `apps/web/src/features/table-view/stores/filterConfig.ts` | Filter expressions per type slug |
| `apps/web/src/features/table-view/stores/sortConfig.ts` | Sort configuration per type slug |
| `apps/web/src/features/table-view/stores/boardGrouping.ts` | Board view grouping field per type slug |

---

## Gotchas

### 1. Module-level empty array constants for TanStack Query fallbacks

This is the single most common source of infinite loop bugs in the codebase. When a TanStack Query hook returns `data` that might be `undefined`, the temptation is to write:

```ts
// BAD -- creates a new [] reference every render
const objects = data ?? []
```

If `objects` is then used in a `useEffect` dependency array, React sees a new reference every render and re-runs the effect, which triggers a re-render, which creates a new `[]`, causing an infinite loop.

The fix:

```ts
// GOOD -- stable reference
const EMPTY: SomeType[] = []

function useMyHook() {
  const { data } = useQuery(...)
  const objects = data ?? EMPTY
  // ...
}
```

The `EMPTY` constant is defined at module level, so it is the same reference every render.

### 2. Zustand stores should not read from TanStack Query

Keep the layers separate. A Zustand store should manage its own state. If a component needs data from both a Zustand store and a TanStack Query, it reads from both independently. Stores do not call `useQuery` or access the query client.

### 3. SpaceProvider wraps DataProvider -- order matters

`SpaceProvider` must be an ancestor of `DataProvider` because `DataProviderWithSpace` calls `useCurrentSpace()` to get the `spaceId` and passes it to `DataProvider`. If the order is reversed, the context will not be available.

### 4. Custom themes are localStorage-only

Custom themes do not sync across devices. They are stored entirely in localStorage and managed by the `useCustomThemeStore` Zustand store. This is a deliberate design choice -- themes are a client-side concern and do not warrant database storage.

### 5. `recentAccess` store deduplicates and limits entries

The `trackAccess` function removes any existing entry for the same object ID before prepending the new entry. The list is capped at 50 items via `.slice(0, MAX_ENTRIES)`. Entries are scoped per space -- switching spaces loads a different set from localStorage.

### 6. Navigation state must be set and cleared precisely

If `setNavigating(true)` is called but `setNavigating(false)` is never called (due to an error or missing cleanup), the progress bar will remain visible indefinitely. Always ensure navigation end is called in both success and error paths.

### 7. The event system bridges two worlds

The `emit()` function in `events.ts` serves both legacy `subscribe()` listeners (imperative callbacks used by SpaceProvider) and TanStack Query invalidation. When you call `emit('objects')`, both systems are notified. You do not need to call `queryClient.invalidateQueries()` separately.

---

## Exercises

1. Find all Zustand stores in the codebase (shared and feature-specific). For each one, classify whether it manages UI state, persisted preferences, or something else.

2. Trace the complete state changes when a user edits an object's title and saves. Which stores are touched? Which TanStack Query keys are invalidated? Does the change reach other browser tabs?

3. List every localStorage key the app uses. For each key, identify where it is written and where it is read. Verify that none are read during renders (only at initialization).

4. Explain why custom themes use Zustand + localStorage instead of being stored in the database. What are the tradeoffs? What would need to change to make them sync across devices?

5. Find a component that reads from both TanStack Query (via a `useQuery`-based hook) and a Zustand store in the same render. Explain why both are needed and why one tool couldn't replace the other.
