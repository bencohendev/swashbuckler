# Architecture Overview

This is the starting point for new developers joining the Swashbuckler project. Read this document first to build a mental model of the codebase before diving into specific areas.

---

## What is Swashbuckler?

Swashbuckler is a knowledge management application built around block-based editing, user-defined types and relations, a visual knowledge graph, real-time collaboration, and dual storage. Authenticated users store data in Supabase (PostgreSQL); unauthenticated guests get a fully functional local experience backed by IndexedDB via Dexie. The same interface abstracts both backends so features work identically in either mode.

---

## Tech Stack

| Technology | Role |
|---|---|
| Next.js 16 (App Router) + React 19 | Application framework and UI library |
| Plate.js (built on Slate.js) | Block-based rich text editor |
| Supabase (PostgreSQL + Auth + Realtime + Storage) | Cloud database, authentication, realtime broadcast, file storage |
| Dexie (IndexedDB) | Offline / guest-mode local database |
| TanStack Query v5 | Server state caching, stale-while-revalidate |
| Zustand | Client-side state management |
| Zod 4 | Schema validation |
| Tailwind CSS 4 | Utility-first styling |
| D3.js | Force-directed knowledge graph visualization |
| Yjs (CRDT) | Realtime collaborative editing |
| Turborepo | Monorepo build orchestration |

---

## Monorepo Structure

The repository is a Turborepo monorepo with the following top-level layout:

```
swashbuckler/
  apps/
    web/          # Main Next.js application
    docs/         # Fumadocs documentation site (docs.swashbuckler.quest)
  packages/       # Shared packages (placeholder for future use)
  supabase/       # Database migrations and Supabase config
  turbo.json      # Turborepo pipeline configuration
  package.json    # Root workspace config
```

- `apps/web/` is where nearly all development happens.
- `apps/docs/` is the public-facing documentation site built with Fumadocs.
- `packages/` is reserved for extracting shared code into reusable packages as the project grows.

---

## App Architecture (`apps/web/src/`)

The application source is organized into three layers. Understanding these layers is the single most important thing for navigating the codebase.

### Layer 1: `app/` -- Thin Routing Layer

This is the Next.js App Router directory. Pages are intentionally thin -- they render feature components, pass route params, and do little else. The real logic lives in `features/`.

Routes are organized into route groups:

| Route group | Purpose | Key routes |
|---|---|---|
| `(auth)/` | Authentication flows | `login`, `signup`, `forgot-password`, `reset-password` |
| `(main)/` | Protected app routes | `dashboard`, `objects/[id]`, `types/[slug]`, `tags/[name]`, `templates/[id]`, `graph`, `trash`, `archive`, `settings/*` |
| `(public)/` | Public marketing / legal | `landing`, `privacy` |
| `auth/callback/` | OAuth callback handler | -- |
| `api/` | Server-side API routes | `account/delete`, plus stubs for objects, relations, sharing, types, upload |

The `(main)/layout.tsx` file is where the primary app shell lives: it renders the sidebar on the left, a header bar across the top, a guest banner (when applicable), and the main content area.

### Layer 2: `features/` -- Feature Modules

Each feature is a self-contained module. Features follow a consistent internal structure:

```
features/
  some-feature/
    components/     # React components specific to this feature
    hooks/          # Data access hooks (TanStack Query wrappers)
    lib/            # Pure logic, utilities, helpers
    stores/         # Zustand stores (when needed)
    index.ts        # Public API (barrel export)
```

Not every feature has all subdirectories -- only the ones it needs.

Here are all 21 features in the codebase:

| Feature | Description |
|---|---|
| `account` | Account settings, data export, account deletion |
| `auth` | Login/signup forms, OAuth, password strength validation |
| `collaboration` | Yjs CRDT realtime co-editing via Supabase Broadcast |
| `editor` | Plate.js block editor, plugins, toolbars, auto-save |
| `global-types` | Reusable type blueprints shared across spaces |
| `graph` | D3.js force-directed knowledge graph visualization |
| `object-types` | Type schema management, field builder UI |
| `objects` | Core CRUD operations, object editor, property fields |
| `onboarding` | First-use tutorial walkthrough for new users |
| `pins` | Favorite/bookmark objects for quick access |
| `quick-capture` | Floating quick-create button (Cmd+E shortcut) |
| `relations` | Object references, @-mentions, linked objects |
| `search` | Global search dialog (Cmd+K shortcut) |
| `sharing` | Space sharing, permission levels, content exclusions |
| `sidebar` | Navigation sidebar, type sections, drag-reorder |
| `spaces` | Multi-workspace support, space switching |
| `starter-kits` | Pre-built type collections for common use cases |
| `table-view` | Table/list/card/board views with filtering and sorting |
| `tags` | Cross-type tagging system |
| `templates` | Template system with variable substitution |
| `theme-builder` | Custom color theme creation and management |

### Layer 3: `shared/` -- Cross-Cutting Concerns

Code that is used across multiple features lives here:

```
shared/
  components/
    ui/             # Reusable UI primitives (Button, Dialog, Input, Toast, etc.)
    layout/         # Layout components (Header)
    GuestBanner.tsx
    SectionErrorBoundary.tsx
    NavigationProgress.tsx
    EmojiPicker.tsx / LazyEmojiPicker.tsx
  hooks/
    useNavigate.ts
    useSessionGuard.ts
    useMutationAction.ts
    useIsMobile.ts
    useToast.ts
    useFocusOnNavigation.ts
  lib/
    data/           # The data layer (see "Data Flow Summary" below)
      types.ts        # DataClient interface and domain types
      supabase.ts     # Supabase implementation of DataClient
      local.ts        # Dexie implementation of DataClient
      DataProvider.tsx # React context that exposes the active DataClient
      SpaceProvider.tsx# Space selection, permissions context
      events.ts       # Event bridge (emit/subscribe + query invalidation)
      queryKeys.ts    # TanStack Query key factory
      errors.ts       # DataLayerError class
      realtime.ts     # Realtime subscription helpers
    supabase/       # Supabase client utilities
      client.ts       # Browser-side Supabase client
      server.ts       # Server-side Supabase client
      middleware.ts   # Auth middleware for Next.js
      upload.ts       # File upload helpers
  stores/
    navigation.ts   # Navigation state
    objectModal.ts  # Object editor modal state
    recentAccess.ts # Recently accessed objects
    sidebar.ts      # Sidebar open/closed state
```

---

## Provider Hierarchy

The provider nesting order in `app/providers.tsx` is critical to understand. Several providers depend on context from their parents, so the order is not arbitrary.

```
<ThemeProvider>                    -- Dark/light/system theme (next-themes)
  <QueryClientProvider>            -- TanStack Query (30s stale, 5min GC)
    <SpaceProvider>                -- Space selection, permissions, sharing
      <CustomThemeApplier />       -- Dynamic CSS variables for custom themes
      <DataProviderWithSpace>      -- Data client + storage mode
        {children}                 -- App content
        <TutorialController />     -- Onboarding flow
      </DataProviderWithSpace>
    </SpaceProvider>
  </QueryClientProvider>
  <Toaster />                      -- Toast notifications (outside query scope)
</ThemeProvider>
```

Why this order matters:

- **ThemeProvider** wraps everything because theme class names must be available globally, including to the Toaster which sits outside the query tree.
- **QueryClientProvider** must wrap everything that calls `useQuery` or `useMutation`. The QueryClient is configured with 30-second stale time, 5-minute garbage collection, and non-retryable `DataLayerError` awareness.
- **SpaceProvider** needs to be above `DataProvider` because `DataProvider` requires a `spaceId` to scope all data queries to the current workspace. SpaceProvider reads the current space from localStorage and provides it via context.
- **DataProviderWithSpace** is an inner component (defined in `providers.tsx`) that reads `useCurrentSpace()` from SpaceProvider and passes `space.id` down to `DataProvider`. This is what connects the space selection to the data layer.
- **Auth state** (`user`) is fetched in the top-level `Providers` component via `supabase.auth.getUser()` and passed as props to both `SpaceProvider` and `DataProvider`. It is not a separate provider.

---

## Data Flow Summary

This section is a brief overview. See [02: Data Layer Deep Dive](./02-data-layer.md) for the full picture.

**Read path:**

```
Component --> Hook --> useQuery (TanStack Query) --> DataClient --> Storage
                                                        |
                                            Supabase (authenticated)
                                            Dexie (guest mode)
```

**Write path:**

```
Component --> Hook --> useMutationAction --> DataClient --> Storage
                                               |
                                          emit(channel)
                                               |
                              +----------------+----------------+
                              |                                 |
                   invalidateQueries()              BroadcastChannel
                   (same tab, re-render)            (other tabs, sync)
```

**Dual storage:** Authenticated users hit Supabase (PostgreSQL). Guests hit Dexie (IndexedDB). Both backends implement the same `DataClient` interface defined in `shared/lib/data/types.ts`, so feature code never knows or cares which storage is active.

---

## Key Conventions

These conventions apply across the entire codebase:

- **Explicit imports** -- Use `import { useState } from 'react'`, not `React.useState`.
- **Export inline with declaration** -- Write `export function Foo() {}`, not a separate `export { Foo }` at the bottom.
- **PascalCase component files** -- Component files are named like `Button.tsx`, `UserProfile.tsx`.
- **Avoid `as` typecasting** -- Prefer proper typing, type guards, or generics over `as` assertions.
- **Hook naming** -- Feature hooks follow the pattern `useXxx()` for lists, `useXxx(id)` for a single item.
- **Module-level empty arrays for TanStack Query fallbacks** -- Always define `const EMPTY: T[] = []` at module scope and use it as `data ?? EMPTY`. An inline `[]` creates a new reference every render, which causes infinite loops when the value is consumed by `useEffect` dependencies.
- **Accessibility is not optional** -- Every feature must use semantic HTML, ARIA attributes, keyboard navigation, focus management, and sufficient color contrast.

---

## What to Read Next

This document gives you the map. The following documents go deep on each area:

| Doc | Topic |
|---|---|
| [02: Data Layer Deep Dive](./02-data-layer.md) | DataClient interface, dual storage, events, query keys, TanStack Query patterns |
| [03: Database and Migrations](./03-database-migrations.md) | Supabase schema, Dexie schema, migration workflow, RLS policies |
| [04: Auth and Sessions](./04-auth-sessions.md) | Supabase Auth, session guards, middleware, OAuth, guest mode |
| [05: Routing and Layout](./05-routing-layout.md) | App Router structure, route groups, layouts, navigation |
| [06: The Editor](./06-editor.md) | Plate.js setup, plugins, auto-save, content serialization |
| [07: Spaces, Sharing, and Permissions](./07-spaces-sharing.md) | Multi-workspace model, sharing flow, permission levels |
| [08: Realtime Collaboration](./08-realtime.md) | Yjs CRDT, Supabase Broadcast provider, awareness, conflict resolution |
| [09: State Management](./09-state-management.md) | Zustand stores, when to use local vs. global state |
| [10: Testing](./10-testing.md) | Vitest unit tests, Playwright e2e tests, fixtures, test conventions |

---

## Exercises

These exercises will help you verify your understanding of the architecture. They are meant to be done by reading the code, not by running the app.

1. **Trace the provider hierarchy.** Open `apps/web/src/app/providers.tsx` and identify each provider wrapper. For each one, note what context or state it provides and which other providers depend on it.

2. **Map a feature module.** Pick any directory under `apps/web/src/features/` (good starting choices: `pins`, `tags`, or `search`). List its `components/`, `hooks/`, and `lib/` files. Identify which hook fetches data, which component renders it, and how they connect.

3. **Find the main layout.** Open `apps/web/src/app/(main)/layout.tsx` and trace how the sidebar and content area are rendered. Identify where the `<Sidebar />` component comes from and how the `<main>` element receives page content via `{children}`.

4. **Identify route groups.** Determine which route group handles `/dashboard` (answer: `(main)/`), `/login` (answer: `(auth)/`), and the landing page at `/landing` (answer: `(public)/`). Understand why these are separate groups -- they each have their own `layout.tsx` with different shells.
