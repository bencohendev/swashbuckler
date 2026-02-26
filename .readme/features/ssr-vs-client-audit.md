# SSR vs Client Rendering Audit

**Status:** Not started

## Overview

Route-by-route analysis of rendering strategy, `'use client'` boundary placement, server-side data fetching opportunities, and bundle efficiency. Identifies hydration risks, unnecessary client-side rendering, and code splitting improvements for Next.js 16 App Router.

## Scope

### In Scope
- Route-level rendering strategy (Server Component vs Client Component)
- `'use client'` boundary placement and propagation
- Server-side data fetching opportunities (RSC data loading)
- Middleware logic and redirect handling
- Hydration risks (mismatch, flash of unstyled content)
- SEO metadata (title, description, Open Graph)
- Bundle size analysis and code splitting
- Dynamic imports and lazy loading
- Static vs dynamic route detection

### Out of Scope
- Data fetching logic correctness (covered in [Client API Audit](client-api-audit.md))
- Accessibility of rendered output (covered in [Accessibility Audit v2](accessibility-audit-v2.md))

## Audit Areas

### 1. Route-by-Route Rendering Analysis

**Checks:**
- Each route's top-level component: Server or Client?
- Which routes could be Server Components but are Client?
- Layout components: do they need `'use client'`?
- Loading/error/not-found pages: Server or Client?
- Auth routes: appropriate rendering for security

**Key Files:**
- `src/app/(auth)/` — login, signup
- `src/app/(main)/` — main app layout and routes
- `src/app/auth/callback/` — OAuth callback
- `src/app/layout.tsx` — root layout
- `src/app/page.tsx` — landing/home page

**Pass Criteria:**
- Routes that don't need interactivity are Server Components
- `'use client'` only on components that use hooks, event handlers, or browser APIs
- Layouts push `'use client'` as deep as possible

### 2. `'use client'` Boundary Analysis

**Checks:**
- Are boundaries placed at the lowest possible level?
- Do any Server Components unnecessarily become Client due to parent boundaries?
- Could interactive parts be extracted into Client Component children?
- Provider wrapping: are providers (theme, data, space) at the right level?
- Are shared components marked `'use client'` when they don't need to be?

**Key Files:**
- `src/app/(main)/layout.tsx` — main layout with providers
- `src/shared/components/` — shared UI components
- `src/features/*/components/` — feature components

**Pass Criteria:**
- No unnecessary `'use client'` directives
- Provider boundaries don't force entire subtrees to be Client Components
- Shared components are Server Components where possible

### 3. Server-Side Data Fetching Opportunities

**Checks:**
- Routes that fetch data on mount could fetch during SSR
- Auth state available server-side via cookies (Supabase SSR)
- Initial page data (spaces, types, current object) could be server-fetched
- TanStack Query hydration for SSR → client handoff
- Redirect logic in middleware vs client-side

**Key Files:**
- `src/shared/lib/data/DataProvider.tsx` — data provider setup
- `src/middleware.ts` (if exists) — middleware
- `src/app/(main)/` — route components

**Pass Criteria:**
- Critical above-the-fold data fetched server-side where possible
- No loading spinners for data that could be SSR'd
- Auth redirects happen in middleware, not client-side

### 4. Hydration Risks

**Checks:**
- Client-only values (localStorage, window dimensions) don't render during SSR
- `useEffect` vs `useSyncExternalStore` for client-only state
- Date/time rendering consistent between server and client
- Theme detection (system preference) doesn't cause flash
- Random/unique ID generation stable between server and client

**Key Files:**
- `src/features/theme/` — theme provider
- `src/features/spaces/` — space selection from localStorage
- `src/shared/hooks/` — shared hooks

**Pass Criteria:**
- No hydration mismatch warnings in development
- No visible flash of wrong theme/content on load
- localStorage-dependent state deferred to client

### 5. SEO & Metadata

**Checks:**
- `metadata` export on route pages (title, description)
- Dynamic metadata for object pages (object name as title)
- Open Graph tags for sharing
- Canonical URLs
- `robots.txt` and `sitemap.xml` (if public-facing)
- Landing page metadata

**Key Files:**
- `src/app/layout.tsx` — root metadata
- `src/app/(main)/` — route metadata
- `src/app/(auth)/` — auth page metadata
- `apps/docs/` — docs site metadata

**Pass Criteria:**
- Every public route has meaningful title and description
- Dynamic pages generate appropriate metadata
- Sharing a link shows proper preview

### 6. Bundle Size & Code Splitting

**Checks:**
- Large dependencies (Plate, D3, Yjs) lazy-loaded or code-split
- Feature modules split by route (not bundled together)
- Dynamic imports for heavy components (editor, graph)
- Tree-shaking effective (no barrel file re-export issues)
- Image optimization (next/image usage)
- Font loading strategy

**Key Files:**
- `next.config.ts` — webpack/turbopack config
- `package.json` — dependency list
- `src/features/editor/` — Plate editor (heavy)
- `src/features/graph/` — D3 graph (heavy)

**Pass Criteria:**
- Initial JS bundle under reasonable threshold
- Editor and graph code not loaded on non-editor/graph routes
- No duplicate dependency bundles
- next/image used for all images

### 7. Middleware & Redirects

**Checks:**
- Auth check in middleware vs client-side
- Protected route handling (redirect to login)
- Guest vs authenticated routing logic
- OAuth callback handling
- Middleware matcher configuration (don't run on static assets)

**Key Files:**
- `src/middleware.ts` (if exists)
- `src/app/auth/callback/route.ts`
- `next.config.ts` — redirects config

**Pass Criteria:**
- Unauthenticated users redirected server-side (not client flash)
- Middleware doesn't run unnecessarily on static assets
- OAuth callback processes securely

## Methodology

1. Route inventory: list all routes, classify as Server/Client, note data needs
2. Boundary trace: follow `'use client'` propagation through component tree
3. Bundle analysis: `next build` output, `@next/bundle-analyzer`
4. Hydration test: compare SSR HTML to client-rendered HTML
5. Lighthouse audit: performance scores, TTI, LCP, CLS

## Deliverables

- Route rendering matrix (route → strategy → recommendation)
- Bundle size breakdown by route/feature
- Prioritized list of SSR opportunities
- Fix PRs for quick wins (boundary moves, dynamic imports)
- Updated spec with final results
