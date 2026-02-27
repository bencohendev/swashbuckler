# SSR vs Client Rendering Audit

**Status:** Done

## Overview

Route-by-route analysis of rendering strategy, `'use client'` boundary placement, server-side data fetching, hydration, bundle weight, and code splitting for a Next.js 16 App Router app.

---

## 1. Route Rendering Matrix

### Layouts (all Server Components)

| Layout | Auth Check | Notes |
|--------|------------|-------|
| `app/layout.tsx` | No | Fonts, metadata, theme script, wraps `<Providers>` (client) |
| `app/(main)/layout.tsx` | `getUser()` | Sidebar, Header, GuestBanner, ObjectEditorModal — all client children |
| `app/(auth)/layout.tsx` | No | Centering wrapper |
| `app/(public)/layout.tsx` | No | Minimal wrapper |
| `app/(main)/settings/layout.tsx` | No | `<Suspense>` with skeleton fallback |

### Pages

| Route | `'use client'` | Verdict |
|-------|:-:|---------|
| `(public)/landing` | — | **Pass** — fully SSR, `GuestButton` isolated as leaf client component |
| `(auth)/login` | — | **Pass** — SSR shell around `LoginForm` client component |
| `(auth)/signup` | — | **Pass** — SSR shell around `SignupForm` client component |
| `(main)/dashboard` | — | **Pass** — server auth check, client data widgets as children |
| `(main)/objects/[id]` | — | **Pass** — awaits params, delegates to `ObjectEditor` client component |
| `(main)/types/[slug]` | — | **Pass** — awaits params, delegates to `TypeTableView` |
| `(main)/tags/[name]` | — | **Pass** — awaits params, delegates to `TagPageView` |
| `(main)/templates/[id]` | — | **Pass** — awaits params, delegates to `TemplateEditor` |
| `(main)/archive` | — | **Pass** — static heading + `ArchiveList` client widget |
| `(main)/trash` | — | **Pass** — static heading + `TrashList` client widget |
| `(main)/settings/types` | — | **Pass** — static heading + `ObjectTypeManager` |
| `(main)/settings/templates` | — | **Pass** — static heading + `TemplateList` |
| `(main)/graph` | Yes | **Pass** — D3 canvas requires DOM, must be client |
| `(main)/settings/sharing` | Yes | **Pass** — complex form state, auth guards, imperative logic |
| `(main)/settings/page` | Yes | **S1** — only uses `useCurrentSpace()` for one heading |
| `(main)/settings/account` | Yes | **S2** — thin `<AccountSettings />` wrapper, directive not needed |
| `(main)/settings/spaces` | Yes | **S2** — thin `<SpacesSettings />` wrapper, directive not needed |
| `(main)/settings/appearance` | Yes | **S2** — thin `<AppearanceSettings />` wrapper, directive not needed |
| `(main)/settings/themes` | Yes | **S2** — thin `<CustomThemeSettings />` wrapper, directive not needed |

### `'use client'` Component Inventory (13 files with directive)

All are justified:

- **Sidebar, SpaceSwitcher, CreateSpaceDialog** — drag-drop, dropdowns, modal forms
- **Header** — theme selector, search trigger, auth menu
- **GuestButton, GuestBanner, NavigationProgress** — state, cookies, Zustand
- **LoginForm, SignupForm, OAuthButtons** — form state, Supabase auth
- **Dialog, DropdownMenu, Label, Separator, Avatar** — Radix UI primitives (require DOM)

---

## 2. Findings

### Critical

#### C1: ObjectEditorModal in Main Layout Loads Plate.js on Every Route

`app/(main)/layout.tsx:25` renders `<ObjectEditorModal />` in the main layout. This client component imports `ObjectEditor`, which imports the full `Editor` from `features/editor/` — pulling in **25+ `@udecode/plate-*` subpackages**, react-dnd, Yjs, collaboration, emoji picker, tags, pins, templates, relations, and more.

Every page under `(main)/` (dashboard, settings, archive, trash, graph) pays this cost even though the modal is closed by default (`if (!objectId) return null` at runtime).

**Impact:** The Plate.js ecosystem alone is estimated at 300-400KB minified. This dominates the initial bundle for every authenticated route.

**Fix:** Lazy-load the modal so the chunk is fetched only on first open:
```tsx
import dynamic from 'next/dynamic'
const ObjectEditorModal = dynamic(
  () => import('@/features/objects/components/ObjectEditorModal')
    .then(m => ({ default: m.ObjectEditorModal })),
  { ssr: false }
)
```

#### C2: DataProvider Context Value Is Not Memoized

`shared/lib/data/DataProvider.tsx:145-152` creates a new `value` object on every render:

```tsx
const value: DataContextValue = {
  dataClient,      // memoized ✓
  storageMode,     // derived from user, changes on auth
  user,            // changes on auth
  isLoading,       // changes on auth
  spaceId,         // changes on space switch
  migrateToSupabase, // NEW FUNCTION every render ✗
}
```

`migrateToSupabase` is an inline `async` function — not wrapped in `useCallback`. This means `value` is always a new reference, so **every DataContext consumer re-renders on every DataProvider render**, even when nothing they care about changed.

By contrast, `SpaceProvider` correctly memoizes both context values with `useMemo` (lines 205, 214).

**Impact:** Every component using `useDataClient()`, `useAuth()`, `useStorageMode()`, or `useSpaceId()` re-renders on every DataProvider render. In a tree with dozens of consumers, this creates a cascade.

**Fix:** Wrap `migrateToSupabase` in `useCallback`, then wrap `value` in `useMemo`:
```tsx
const migrateToSupabase = useCallback(async () => { ... }, [user, supabase, spaceId])
const value = useMemo(() => ({
  dataClient, storageMode, user, isLoading: isAuthLoading, spaceId: spaceId ?? null, migrateToSupabase,
}), [dataClient, storageMode, user, isAuthLoading, spaceId, migrateToSupabase])
```

#### C3: Data Fetching Waterfall — 3 Sequential Requests Before Content

The critical path for `/objects/[id]`:

```
Server: layout.tsx → getUser()                          [REQUEST 1]
Server: page.tsx  → await params (instant)
Client: hydrate
Client: Providers useEffect → supabase.auth.getUser()   [REQUEST 2 — duplicates #1]
Client: SpaceProvider useEffect → spacesClient.list()    [REQUEST 3 — blocked on #2]
Client: DataProviderWithSpace → reads space context
Client: ObjectEditor → useObject(id) → useQuery          [REQUEST 4 — blocked on #3]
```

Four sequential network requests, of which two are redundant (the server already fetched the user). The user sees nothing until all four complete.

**No TanStack Query SSR hydration exists anywhere.** Zero uses of `dehydrate`, `HydrationBoundary`, or server-side `prefetchQuery`. All data fetching starts from scratch on the client after hydration.

The only prefetching is hover-prefetch in `SidebarLink.tsx:53` (nice touch, but only helps sidebar navigation).

**Impact:** Time to first meaningful paint is bottlenecked by 3-4 RTTs in sequence. On a 200ms network, that's 600-800ms of staring at skeleton/spinner before content appears.

**Fix (incremental):**
1. Stop re-fetching user client-side — pass it from server layout
2. Prefetch spaces and object data server-side using TanStack Query's `HydrationBoundary`
3. Or at minimum, parallelize client requests (spaces + object can load concurrently if spaceId is in localStorage)

### Significant

#### S1: Settings Hub Page Unnecessarily `'use client'`

`app/(main)/settings/page.tsx` uses `useCurrentSpace()` only for the space name/icon in one heading. The rest is static `Link` cards. Extract the heading into a leaf client component and make the page a server component — the static card grid doesn't need client JS.

#### S2: Four Settings Wrapper Pages Unnecessarily `'use client'`

`settings/account`, `settings/spaces`, `settings/appearance`, `settings/themes` are all:
```tsx
'use client'
import { SomeComponent } from '@/features/...'
export default function Page() { return <SomeComponent /> }
```

A server component can render a client component as a child — the directive is unnecessary here. The child component already triggers client rendering. Remove `'use client'` from all four pages.

#### S3: No Dynamic Metadata on Content Pages

Only the root layout exports `metadata`. Dynamic routes (`objects/[id]`, `types/[slug]`, `tags/[name]`, `templates/[id]`) don't export `generateMetadata()`.

**Impact:** All browser tabs show "Swashbuckler" regardless of content. Shared links have no meaningful preview (Open Graph title/description missing).

**Fix:** Add `generateMetadata()` to dynamic routes — fetch the entity name server-side:
```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('objects').select('name').eq('id', id).single()
  return { title: data?.name ? `${data.name} — Swashbuckler` : 'Swashbuckler' }
}
```

#### S4: Editor Barrel Export Defeats Tree-Shaking

`features/editor/index.ts` (86 lines) re-exports all 15 element components, 5 mark components, menu components, plugins, and utilities. Any `import { X } from '@/features/editor'` pulls the entire module graph. This compounds C1 — even if the modal were lazy-loaded, consumers that import individual items still pay for everything.

**Fix:** Import from sub-paths (`@/features/editor/components/Editor`) instead of the barrel. Or split into `@/features/editor/components`, `@/features/editor/elements`, `@/features/editor/plugins`.

### Moderate

#### M1: Zero `next/dynamic` Usage in Entire App

No code splitting beyond automatic route-level splitting. Heavy dependencies that could benefit:

| Dependency | Estimated Size | Used On | Lazy-Loadable? |
|-----------|---------------|---------|----------------|
| Plate.js (25 packages) | ~300-400KB | Editor only | Yes (via C1) |
| emoji-picker-react | ~120KB | Emoji popover | Yes — only rendered on click |
| D3 (4 packages) | ~60KB | `/graph` only | Yes — already route-isolated |
| Yjs + collaboration | ~80KB | Shared spaces only | Yes — conditional on `isCollaborative` |
| react-dnd | ~40KB | Editor drag + board view | Partially |

**Fix:** At minimum, dynamically import `ObjectEditorModal` (C1) and `EmojiPicker`.

#### M2: Duplicate Auth Fetch (Server + Client)

The main layout does `supabase.auth.getUser()` on the server (line 11) but only uses the result for `GuestBanner` (boolean) and `Header` (email string). The client `Providers` component immediately re-fetches the same user via `supabase.auth.getUser()` (providers.tsx:51).

**Impact:** Every navigation to a `(main)` route triggers two auth calls — one server-side, one client-side. The server result is thrown away except for two small values.

**Fix options:**
- Pass the user object (or relevant subset) from server to client via props/context
- Or remove the server-side fetch and let the client handle it (accept the brief flash)
- Or use middleware for auth redirects and remove the layout fetch entirely

#### M3: No `loading.tsx` or `error.tsx` Route Files

No route-level loading states or error boundaries exist (except the `<Suspense>` in `settings/layout.tsx`).

**Impact:**
- No streaming SSR — entire page waits for slowest server component
- No graceful error recovery — server component errors crash the page
- No skeleton UI during route transitions (beyond NavigationProgress bar)

**Fix:** Add `loading.tsx` to `(main)/` for skeleton UI and `error.tsx` for error recovery.

#### M4: No Middleware for Auth Routing

No `middleware.ts` exists. Auth protection relies on server-side `getUser()` check in the layout (which doesn't redirect) and client-side `useAuth()`.

**Note:** This is intentional — the app supports guest mode. Unauthenticated users should access `(main)` routes. Not a bug, but should be documented.

#### M5: Zustand Stores Missing `'use client'` Directive

12 Zustand stores across the app (`shared/stores/`, `features/*/stores/`, `features/*/lib/store.ts`) have no `'use client'` directive. They rely on only being imported from client components.

Currently safe because all consumers are client components. But if a server component ever imports one (easy mistake during refactoring), it will crash at runtime with `localStorage is not defined`.

**Fix:** Add `'use client'` to all store files as a safety net.

### Low

#### L1: Six Font Families Loaded on Every Page

`app/layout.tsx` loads Geist, Geist Mono, Cinzel, Lora, Orbitron, Share Tech Mono — the last four are theme-specific (fantasy/sci-fi). Users on the default theme still download font metadata for unused themes.

**Impact:** Low — `next/font` handles preloading and font-display efficiently. The unused fonts add minimal overhead because browsers only fetch the actual font files when glyphs are needed.

#### L2: GuestBanner Hydration Pattern — Correct

`GuestBanner.tsx` receives `isGuestServer` from SSR and uses `isLoading` to choose between server and client values. No hydration mismatch. Good implementation.

#### L3: Route Group Layout Isolation — Correct

`(main)`, `(auth)`, `(public)` correctly isolate layouts. No cross-contamination. `Providers` is in the root layout, so all groups share context — this is correct because even public pages need theme context.

---

## 3. Provider Architecture Analysis

### Current Tree

```
RootLayout (Server)
└── Providers (Client — 'use client')
    └── ThemeProvider (next-themes)
        └── QueryClientProvider (TanStack)
            └── SpaceProvider (user, isAuthLoading)     ← memoized context ✓
                └── CustomThemeApplier
                └── DataProviderWithSpace                ← reads SpaceContext
                    └── DataProvider (user, isAuthLoading, spaceId)  ← NOT memoized ✗
                        └── {children}
                        └── TutorialController
    └── Toaster
```

### Re-render Analysis

When auth state changes (`setUser` + `setIsAuthLoading` in Providers):
1. `Providers` re-renders (owns the state)
2. `SpaceProvider` receives new props → re-renders → context value re-memoized (breaks only if user ref changes)
3. `DataProviderWithSpace` re-renders (child of SpaceProvider) → reads `useCurrentSpace()`
4. `DataProvider` receives new `user`/`isAuthLoading` → `dataClient` re-memoized → **but `value` object is always new** (C2) → all consumers re-render

When space switches (`switchSpace` in SpaceProvider):
1. `setCurrentSpaceId` → SpaceProvider re-renders
2. `spaceContextValue` memo breaks (currentSpace changed)
3. `DataProviderWithSpace` re-renders (consumes SpaceContext)
4. `DataProvider` receives new `spaceId` → `dataClient` re-memoized → all consumers notified

**The SpacesContext value** (line 214) has a very large dependency array including `currentSpaceId` and `ownedSpaces` — the inline `create`/`archiveSpace` closures capture these, so the memo breaks on space switch. Any component using `useSpaces()` re-renders on space switch even if it only cares about the spaces list.

---

## 4. Bundle & Code Splitting Analysis

### Import Coupling Graph

```
ObjectEditorModal (layout)
  └── ObjectEditor (36 imports — the heaviest component)
      ├── Editor → all Plate.js (25 packages)
      ├── collaboration → Yjs, @slate-yjs/core, SupabaseYjsProvider
      ├── templates → SaveAsTemplateDialog, ApplyTemplateDialog
      ├── relations → extractMentionIds, LinkedObjects
      ├── object-types → useObjectType
      ├── tags → TagPicker
      ├── pins → PinButton
      ├── sharing → useSharedPermission
      └── EmojiPicker → emoji-picker-react (~120KB)
```

Because ObjectEditorModal is in the main layout, all of these end up in the initial chunk for every `(main)` route.

### Feature Coupling Hubs

| Feature | Imported By | Risk |
|---------|------------|------|
| objects | 9+ features | Central hub — always in main chunk |
| object-types | 8+ features | Central hub — always in main chunk |
| templates | 6+ features | Moderate coupling |
| editor | 3 consumers but 25+ transitive deps | Heavy weight per consumer |

No circular imports detected — dependency graph is acyclic.

### What Route-Level Splitting Actually Buys

Currently, Next.js splits by route. But because the layout pulls in ObjectEditorModal (and transitively the entire editor), the route-level split is nearly meaningless for `(main)` routes — they all share the same heavy layout chunk.

If C1 is fixed (lazy-load ObjectEditorModal), then:
- `/dashboard` becomes lightweight (just PinnedObjects + RecentObjects)
- `/settings/*` becomes lightweight (individual settings components)
- `/archive`, `/trash` become lightweight (list components)
- `/graph` stays heavy but isolated (D3, only loaded on that route)
- `/objects/[id]` stays heavy (editor), but only loads when navigated to

---

## 5. Summary Table

| # | Severity | Finding | Effort |
|---|----------|---------|--------|
| C1 | Critical | ObjectEditorModal loads Plate.js on every route | Medium |
| C2 | Critical | DataProvider context value not memoized — cascading re-renders | Low |
| C3 | Critical | 3-4 sequential requests before content (no SSR hydration) | High |
| S1 | Significant | Settings hub page unnecessarily client | Low |
| S2 | Significant | Four settings wrapper pages unnecessarily `'use client'` | Low |
| S3 | Significant | No dynamic metadata on content pages (SEO/tabs) | Low |
| S4 | Significant | Editor barrel export defeats tree-shaking | Low |
| M1 | Moderate | Zero `next/dynamic` usage for code splitting | Medium |
| M2 | Moderate | Duplicate auth fetch (server + client) | Medium |
| M3 | Moderate | No `loading.tsx`/`error.tsx` route files | Low |
| M4 | Moderate | No middleware (intentional for guest mode) | None |
| M5 | Moderate | Zustand stores missing `'use client'` safety directive | Low |
| L1 | Low | Theme fonts loaded eagerly | Low |
| L2 | Low | GuestBanner hydration pattern | None (correct) |
| L3 | Low | Route group isolation | None (correct) |

### What's Working Well

- **All layouts are server components** — correct pattern
- **Most pages are server components** delegating to client children
- **`'use client'` on UI primitives** (Radix) is correct and necessary
- **Theme script injection** prevents FOUC with `dangerouslySetInnerHTML`
- **`suppressHydrationWarning`** on `<html>` prevents theme class mismatch
- **SpaceProvider context is memoized** with proper `useMemo` (lines 205, 214)
- **Settings layout has `<Suspense>`** with skeleton fallback
- **Landing page is fully SSR** — zero unnecessary client JS
- **Sidebar hover-prefetch** with `queryClient.prefetchQuery` on `onMouseEnter`
- **No CSS-in-JS runtime** — Tailwind is build-time, SSR-safe
- **No `window`/`document` access in server components** — all properly guarded
- **No circular imports** in feature dependency graph
