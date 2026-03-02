# Routing and Navigation

This document covers how routing, layouts, middleware, and navigation work in Swashbuckler. It explains the App Router structure, the purpose of each route group, how authentication redirects are handled, and patterns you will encounter when adding new pages.

---

## Next.js App Router Overview

Swashbuckler uses **Next.js 16 with the App Router** (not the legacy Pages Router). All routing is file-based, rooted at `apps/web/src/app/`.

Key concepts:

- **File-based routing.** A `page.tsx` file inside a directory defines a route. A `layout.tsx` file wraps all pages in that directory and its subdirectories.
- **Route groups.** Directories wrapped in parentheses like `(main)/` organize routes without affecting the URL path. `(main)/dashboard/page.tsx` maps to `/dashboard`, not `/main/dashboard`.
- **Server Components by default.** Every component in the `app/` directory is a React Server Component unless it includes the `'use client'` directive at the top. Layouts and pages are typically server components; interactive UI lives in client components imported by those pages.
- **Dynamic segments.** Brackets denote dynamic route parameters: `objects/[id]/page.tsx` matches `/objects/abc-123` and provides `id` as a param.

---

## Route Groups

### `(public)/` -- Public marketing pages

Simple full-screen layout. No sidebar, no auth required.

| Route | URL | Purpose |
|---|---|---|
| `landing/page.tsx` | `/landing` | Marketing landing page |
| `privacy/page.tsx` | `/privacy` | Privacy policy |

**Layout** (`(public)/layout.tsx`): A minimal full-height flex column with `bg-background text-foreground`. No navigation chrome.

### `(auth)/` -- Authentication pages

Centered card layout for auth flows. No sidebar. These pages redirect authenticated users to `/dashboard` via middleware.

| Route | URL | Purpose |
|---|---|---|
| `login/page.tsx` | `/login` | Email/password and OAuth sign in |
| `signup/page.tsx` | `/signup` | Account creation |
| `forgot-password/page.tsx` | `/forgot-password` | Password reset request |
| `reset-password/page.tsx` | `/reset-password` | Set new password (from email link) |

**Layout** (`(auth)/layout.tsx`): Centers children in a `max-w-md` container against a muted background.

### `(main)/` -- Protected application routes

This is where the actual app lives. Sidebar + header layout with full app chrome. Accessible to both authenticated users and guests.

| Route | URL | Purpose |
|---|---|---|
| `dashboard/page.tsx` | `/dashboard` | Home view with pinned items and recent activity |
| `objects/[id]/page.tsx` | `/objects/:id` | Object editor (full page) |
| `types/[slug]/page.tsx` | `/types/:slug` | Table view filtered by object type |
| `tags/[name]/page.tsx` | `/tags/:name` | Objects tagged with a specific tag |
| `templates/[id]/page.tsx` | `/templates/:id` | Template editor |
| `graph/page.tsx` | `/graph` | Knowledge graph visualization |
| `trash/page.tsx` | `/trash` | Soft-deleted objects |
| `archive/page.tsx` | `/archive` | Archived objects |
| `settings/page.tsx` | `/settings` | Settings index |
| `settings/account/page.tsx` | `/settings/account` | Account settings |
| `settings/appearance/page.tsx` | `/settings/appearance` | Theme and appearance |
| `settings/sharing/page.tsx` | `/settings/sharing` | Space sharing settings |
| `settings/spaces/page.tsx` | `/settings/spaces` | Space management |
| `settings/templates/page.tsx` | `/settings/templates` | Template management |
| `settings/themes/page.tsx` | `/settings/themes` | Custom theme builder |
| `settings/types/page.tsx` | `/settings/types` | Object type management |

**Layout** (`(main)/layout.tsx`): A server component that renders the full app shell. Covered in detail in the next section.

### `auth/callback/` -- OAuth code exchange

**File:** `apps/web/src/app/auth/callback/route.ts`

This is a standalone Route Handler (not inside a route group) that handles the OAuth PKCE code exchange. After a user signs in with Google or GitHub, Supabase redirects to `/auth/callback?code=...`. The handler exchanges the code for a session, sets cookies, and redirects to `/dashboard` (or a `next` parameter if present). On failure, it redirects to `/login`.

Note: Middleware explicitly exempts `/auth/callback` from auth-page redirects so the exchange can complete.

### `api/` -- Server API routes

| Route | URL | Purpose |
|---|---|---|
| `api/account/delete/route.ts` | `DELETE /api/account/delete` | Server-side account deletion |

---

## Layout Hierarchy

The following tree shows how layouts nest from the root through each route group:

```
RootLayout (app/layout.tsx)
  -- Loads fonts (Geist, Cinzel, Lora, Orbitron, Share Tech Mono)
  -- Injects theme script (getThemeScript)
  -- Wraps children in <Providers>
  -- Includes Vercel Analytics + SpeedInsights
  |
  +-- Providers (app/providers.tsx) [client component]
  |     -- ThemeProvider (next-themes)
  |     -- QueryClientProvider (TanStack Query)
  |     -- SpaceProvider
  |     -- DataProviderWithSpace
  |     -- CustomThemeApplier
  |     -- TutorialController
  |     -- Toaster
  |
  +-- (public)/layout.tsx
  |     +-- /landing
  |     +-- /privacy
  |
  +-- (auth)/layout.tsx
  |     +-- /login
  |     +-- /signup
  |     +-- /forgot-password
  |     +-- /reset-password
  |
  +-- (main)/layout.tsx [server component]
  |     -- NavigationProgress
  |     -- Skip-to-content link
  |     -- Sidebar (in SectionErrorBoundary)
  |     -- GuestBanner
  |     -- Header
  |     -- <main> content area
  |     -- LazyObjectEditorModal
  |     |
  |     +-- /dashboard
  |     +-- /objects/[id]
  |     +-- /types/[slug]
  |     +-- /tags/[name]
  |     +-- /templates/[id]
  |     +-- /graph
  |     +-- /trash
  |     +-- /archive
  |     +-- /settings
  |     +-- /settings/account
  |     +-- /settings/appearance
  |     +-- /settings/sharing
  |     +-- /settings/spaces
  |     +-- /settings/templates
  |     +-- /settings/themes
  |     +-- /settings/types
  |
  +-- auth/callback (Route Handler, no layout)
  +-- api/account/delete (Route Handler, no layout)
```

---

## The Main Layout

**File:** `apps/web/src/app/(main)/layout.tsx`

This is a **server component** (`async function`). It creates a Supabase server client, fetches the current user, and renders the full app shell. Here is the structure:

```tsx
export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex h-dvh">
      <NavigationProgress />
      <a href="#main-content" className="sr-only focus:not-sr-only ...">
        Skip to main content
      </a>
      <SectionErrorBoundary fallbackLabel="Sidebar">
        <Sidebar />
      </SectionErrorBoundary>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <GuestBanner isGuestServer={!user} />
        <Header email={user?.email} />
        <main id="main-content" className="relative flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      <LazyObjectEditorModal />
    </div>
  )
}
```

Walking through each piece:

1. **`NavigationProgress`** -- A fixed-position progress bar at the top of the viewport. Driven by the `useNavigation` Zustand store. Shows when `isNavigating` is true; clears when the pathname changes or after a 10-second safety timeout.

2. **Skip-to-content link** -- An accessibility feature. Visually hidden but becomes visible on focus, allowing keyboard users to jump past the sidebar directly to `#main-content`.

3. **`Sidebar`** -- Wrapped in `SectionErrorBoundary` so a sidebar crash does not take down the entire page. The sidebar renders the space switcher, navigation links, pinned objects, and the user menu.

4. **`GuestBanner`** -- Shown when `user` is null (server-side check). Prompts guest users to sign up to persist their data.

5. **`Header`** -- Top bar with breadcrumbs, search, and user email display.

6. **`<main>`** -- The content area where `{children}` (the page component) renders. Uses `overflow-auto` for independent scrolling.

7. **`LazyObjectEditorModal`** -- A lazily loaded dialog for editing objects in a modal overlay. Mounted at the layout level so it can be opened from any page without navigation. See the Object Editor Modal section below.

---

## Page Patterns

Pages in Swashbuckler are intentionally **thin wrappers**. They exist to:

1. Extract route params (via `params` or `searchParams` props)
2. Optionally prefetch data on the server
3. Render the corresponding feature component

Here are representative examples:

### Simple page -- `types/[slug]/page.tsx`

```tsx
export default async function TypePage({ params }: TypePageProps) {
  const { slug } = await params
  return <TypeTableView slug={slug} />
}
```

Extracts the `slug` param and passes it to the feature component. That is it.

### Page with server prefetch -- `objects/[id]/page.tsx`

```tsx
export default async function ObjectPage({ params, searchParams }: ObjectPageProps) {
  const { id } = await params
  const query = await searchParams
  const isNew = query.new === '1'

  const queryClient = new QueryClient()
  const object = await fetchObject(id)
  if (object) {
    queryClient.setQueryData(queryKeys.objects.detail(id), object)
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ObjectEditor id={id} autoFocus={isNew} />
    </HydrationBoundary>
  )
}
```

This page prefetches the object on the server, seeds a TanStack Query cache with the result, and passes the dehydrated state to the client via `HydrationBoundary`. The client-side `ObjectEditor` picks up the cached data instantly without a loading flash.

### Page with server user check -- `dashboard/page.tsx`

```tsx
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {user ? "Welcome back" : "Welcome"}
        </h1>
        <p className="text-muted-foreground">
          {user?.email ?? "You're using Swashbuckler as a guest. Sign up to save your work."}
        </p>
      </div>
      <DashboardContent />
    </div>
  )
}
```

Server component checks the user to customize the greeting, then delegates to the client-side `DashboardContent` for interactive features.

### Dynamic metadata

Most pages export a `generateMetadata` function that fetches the entity name from Supabase to produce titles like `"Page Title -- Swashbuckler"`. This runs on the server and does not block rendering.

---

## Middleware and Route Protection

**Files:**
- `apps/web/src/proxy.ts` -- Next.js 16 middleware entry point
- `apps/web/src/shared/lib/supabase/middleware.ts` -- Session refresh and redirect logic

### How it works

Next.js 16 uses a `proxy.ts` file at `src/proxy.ts` as the middleware entry point (replacing the older `middleware.ts` convention). It exports a `proxy` function and a `config` with a route matcher.

The matcher runs on every request except static assets:

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

The `proxy` function delegates to `updateSession`, which does the following:

1. **Refreshes the Supabase session.** Creates a server Supabase client with cookie access and calls `supabase.auth.getUser()`. This refreshes expired JWT tokens and syncs cookies.

2. **Root redirect (`/`).** If the user is authenticated or has a `swashbuckler-guest` cookie, redirect to `/dashboard`. Otherwise, redirect to `/landing`.

3. **Landing page redirect.** If an authenticated user visits `/landing`, redirect to `/dashboard`.

4. **Auth page redirect.** If an authenticated user visits `/login`, `/signup`, or any `/auth/*` path (except `/auth/callback`), redirect to `/dashboard`.

5. **Guest mode passthrough.** Unauthenticated users are not blocked from `(main)/` routes. They access the app in guest mode, using IndexedDB for storage. The `swashbuckler-guest` cookie (set client-side on first guest interaction) is used by middleware to decide the root redirect.

Note that the middleware does **not** block unauthenticated users from protected routes. Guest mode is a first-class experience. Auth protection is permissive by design.

---

## Navigation Patterns

### `useNavigate()` hook

**File:** `apps/web/src/shared/hooks/useNavigate.ts`

```tsx
export function useNavigate() {
  const router = useRouter()
  const setNavigating = useNavigation((s) => s.setNavigating)

  const push = useCallback(
    (href: string) => {
      setNavigating(true)
      router.push(href)
    },
    [router, setNavigating],
  )

  return { push, router }
}
```

This hook wraps Next.js `useRouter().push()` with a Zustand-based navigation state flag. When `push` is called:

1. `isNavigating` is set to `true` in the `useNavigation` store
2. `router.push(href)` triggers the SPA navigation
3. `NavigationProgress` renders a progress bar
4. When the new route renders, `NavigationProgress` detects the pathname change and clears the flag

Use `useNavigate().push('/path')` instead of raw `router.push()` to get the progress indicator.

### `NavigationProgress` component

**File:** `apps/web/src/shared/components/NavigationProgress.tsx`

Mounted once in `(main)/layout.tsx`. Renders a thin animated bar at the top of the viewport while navigation is in progress. Includes a 10-second safety timeout to clear stuck states.

### Navigation store

**File:** `apps/web/src/shared/stores/navigation.ts`

A minimal Zustand store with two fields: `isNavigating: boolean` and `setNavigating: (v: boolean) => void`.

---

## Spaces and Routing

Space selection does **not** change the URL. There is no `/spaces/:id/dashboard` pattern. Instead:

- `SpaceProvider` (in `providers.tsx`) tracks the current space in React context
- The current space ID is persisted to `localStorage` under `swashbuckler:currentSpaceId`
- `DataProvider` receives `spaceId` from `SpaceProvider` and scopes all data queries to that space
- Switching spaces re-renders the data layer and refetches queries -- but the URL stays the same

This means `/dashboard` shows different content depending on which space is selected. All routing is space-agnostic; space scoping is handled entirely at the data layer.

---

## The Object Editor Modal

The object editor can be opened in two ways:

1. **Full-page route** -- Navigate to `/objects/:id`. Renders `ObjectEditor` as the page content.
2. **Modal overlay** -- Open the editor as a dialog from any page without navigating.

The modal is powered by a Zustand store and a lazily loaded component mounted at the layout level.

### Store

**File:** `apps/web/src/shared/stores/objectModal.ts`

```ts
interface ObjectModalState {
  objectId: string | null
  autoFocus: boolean
  onClose: (() => void) | null
  open: (id: string, opts?: { autoFocus?: boolean; onClose?: () => void }) => void
  close: () => void
}
```

Any component can call `useObjectModal().open(id)` to open the modal with a specific object. The `close` method clears state and optionally fires an `onClose` callback.

### Component

**File:** `apps/web/src/features/objects/components/ObjectEditorModal.tsx`

Renders a `Dialog` containing the same `ObjectEditor` component used on the full page. On mobile, it expands to full-screen. On desktop, it caps at `max-w-3xl` and `85vh` height.

### Lazy loading

**File:** `apps/web/src/features/objects/components/LazyObjectEditorModal.tsx`

```tsx
export const LazyObjectEditorModal = dynamic(
  () => import('./ObjectEditorModal').then(mod => ({ default: mod.ObjectEditorModal })),
  { ssr: false }
)
```

The modal is code-split and only loaded client-side. It is mounted in `(main)/layout.tsx` so it is available on every app page without being included in the initial bundle.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `apps/web/src/app/layout.tsx` | Root layout: fonts, theme script, `<Providers>` wrapper |
| `apps/web/src/app/providers.tsx` | Client-side provider tree: themes, TanStack Query, spaces, data, toaster |
| `apps/web/src/app/(public)/layout.tsx` | Public pages layout (minimal) |
| `apps/web/src/app/(auth)/layout.tsx` | Auth pages layout (centered card) |
| `apps/web/src/app/(main)/layout.tsx` | Main app layout: sidebar, header, guest banner, modal |
| `apps/web/src/proxy.ts` | Next.js 16 middleware entry point |
| `apps/web/src/shared/lib/supabase/middleware.ts` | Session refresh and redirect logic |
| `apps/web/src/app/auth/callback/route.ts` | OAuth PKCE code exchange handler |
| `apps/web/src/app/api/account/delete/route.ts` | Account deletion API route |
| `apps/web/src/shared/hooks/useNavigate.ts` | Navigation hook with progress indicator |
| `apps/web/src/shared/stores/navigation.ts` | Navigation progress Zustand store |
| `apps/web/src/shared/stores/objectModal.ts` | Object editor modal Zustand store |
| `apps/web/src/shared/components/NavigationProgress.tsx` | Progress bar component |
| `apps/web/src/features/objects/components/LazyObjectEditorModal.tsx` | Lazy-loaded object editor dialog |
| `apps/web/src/features/objects/components/ObjectEditorModal.tsx` | Object editor modal implementation |

---

## Gotchas

1. **Route groups do not affect URLs.** `(main)/dashboard/page.tsx` is `/dashboard`, not `/main/dashboard`. The parentheses are purely organizational.

2. **The main layout is a Server Component.** It is an `async function` that calls `await createClient()` and `await supabase.auth.getUser()`. You cannot use hooks or `'use client'` features directly in it. Interactive behavior is delegated to client components like `Sidebar`, `Header`, and `LazyObjectEditorModal`.

3. **Space switching does not navigate.** Changing the active space does not change the URL. If you add a feature that depends on space context, use `useCurrentSpace()` or `useSpaceId()` rather than looking at route params.

4. **The object modal lives at the layout level.** `LazyObjectEditorModal` is mounted in `(main)/layout.tsx`, not in individual pages. This is what allows it to overlay any page. If you need to open the modal, import `useObjectModal` from the store -- do not mount a second instance.

5. **Middleware handles auth redirects and the guest cookie.** Authentication is permissive: unauthenticated users are not blocked from app routes. The middleware only redirects in specific cases (root path, authenticated users on auth pages, authenticated users on the landing page). Guest mode works without any auth token.

6. **Settings routes are separate pages, not tabs.** Each settings section (`/settings/account`, `/settings/appearance`, etc.) is its own `page.tsx` with its own URL. Navigation between them is standard route navigation, not client-side tab switching.

---

## Exercises

1. **Add a new route under `(main)/`.** Suppose you need a `/bookmarks` page. What files do you need to create? What happens to the layout -- do you need a new one? Where does the feature component live?

2. **Trace navigation from `/dashboard` to `/objects/[id]`.** Starting from a link click on the dashboard, follow the code path through `useNavigate`, the navigation store, `NavigationProgress`, and the object page's server-side prefetch.

3. **Find where the object editor modal is triggered.** Search the codebase for calls to `useObjectModal().open()`. Identify at least two places that open the modal and understand why they use the modal instead of navigating to the full-page route.

4. **Identify which layout renders the sidebar.** Which layout file contains the `<Sidebar />` component? What wraps it, and why? What happens if the sidebar throws an error?
