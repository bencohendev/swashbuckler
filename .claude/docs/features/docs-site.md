# Documentation Site

**Status: Not started**

## Overview

User-facing documentation site at `docs.swashbuckler.quest`, built with Fumadocs in a Turborepo monorepo alongside the existing web app. Both apps share one repo but have fully independent build pipelines and Vercel deployments.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Architecture | Monorepo (Turborepo) | Single repo, independent builds. Docs changes don't trigger web builds and vice versa. |
| Docs framework | Fumadocs (v16) | Next.js native, Tailwind v4 support, built-in search (Orama), MDX-first. Matches existing stack. |
| Package manager | npm (keep current) | Switching to pnpm mid-migration risks breaking Plate.js/slate-dom dual-copy resolution. Migrate later if desired. |
| Shared packages | None initially | Tailwind v4 is CSS-configured (not shareable JS). Docs uses Fumadocs UI, web uses shadcn. No overlap. |
| Subdomain | `docs.swashbuckler.quest` | Separate Vercel project, CNAME to `cname.vercel-dns.com` |

## Target Structure

```
swashbuckler/
├── apps/
│   ├── web/                  ← existing app (moved from root)
│   │   ├── src/, tests/, supabase/, public/
│   │   ├── package.json      ← @swashbuckler/web
│   │   ├── turbo.json        ← web-specific env var scoping
│   │   └── (all current config files)
│   └── docs/                 ← new Fumadocs site
│       ├── src/app/
│       ├── content/docs/     ← MDX content lives here
│       ├── package.json      ← @swashbuckler/docs
│       ├── source.config.ts
│       └── next.config.ts
├── packages/                 ← empty for now
├── turbo.json
├── package.json              ← workspace root
└── .github/workflows/ci.yml
```

## Implementation

### Step 1: Monorepo scaffolding

| File | What |
|------|------|
| `package.json` (root) | `"workspaces": ["apps/*", "packages/*"]`, turbo devDep, delegating scripts |
| `turbo.json` | Task defs: build, dev, lint, test:run, test:e2e |
| `apps/`, `packages/` | Empty directories |

### Step 2: Move web app to `apps/web/`

Use `git mv` for all moves (preserves blame). Single commit, no content changes.

**Move into `apps/web/`:** `src/`, `tests/`, `supabase/`, `public/`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `package.json`, `.env.local.example`, `next-env.d.ts`

**Keep at root:** `CLAUDE.md`, `README.md`, `.github/`, `.gitignore`, `.claude/`

**No path alias changes needed** — `@/` resolves to `./src/*` relative to each app's `tsconfig.json`.

After moving: delete old `package-lock.json`, run `npm install` from root for workspace-aware lockfile.

Add `apps/web/turbo.json` to scope Supabase env vars to web build cache only:
```json
{ "extends": ["//"], "tasks": { "build": { "env": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] } } }
```

### Step 3: Create Fumadocs site (`apps/docs/`)

| File | Purpose |
|------|---------|
| `package.json` | Deps: fumadocs-core ^16, fumadocs-mdx ^14, fumadocs-ui ^16, next 16.1.6, react 19 |
| `source.config.ts` | `defineDocs({ dir: "content/docs" })` |
| `next.config.ts` | Wrapped with `createMDX()` from fumadocs-mdx |
| `tsconfig.json` | Standard Next.js + `.source/**/*.ts` include for Fumadocs types |
| `postcss.config.mjs` | `@tailwindcss/postcss` plugin |
| `src/app/layout.tsx` | Root layout with Fumadocs `RootProvider` |
| `src/app/global.css` | Tailwind v4 + `fumadocs-ui/css/neutral.css` + `preset.css` |
| `src/app/docs/layout.tsx` | `DocsLayout` with nav tree |
| `src/app/docs/[[...slug]]/page.tsx` | Dynamic MDX page renderer (uses `await params` for Next.js 16) |
| `src/app/(home)/page.tsx` | Redirect to `/docs` |
| `src/lib/source.ts` | Content loader via `fumadocs-core/source` |
| `src/app/api/search/route.ts` | Built-in Orama search endpoint |
| `mdx-components.tsx` | MDX component overrides |
| `content/docs/index.mdx` | Seed documentation page |
| `content/docs/meta.json` | Nav structure |

Dev server on port 3001 to avoid conflict with web app.

### Step 4: Update CI

`/.github/workflows/ci.yml` — replace `npm run X` with `npx turbo run X`:
- Lint/test: `npx turbo run lint`, `npx turbo run test:run`
- Build: `npx turbo run build` (both apps, with Supabase env vars)
- E2E: `npx turbo run test:e2e --filter=@swashbuckler/web`
- Playwright artifact path → `apps/web/playwright-report/`

### Step 5: Update .gitignore

Add `.turbo`, `.source/`. Update root-anchored paths (`/.next/`, `/coverage`, `/node_modules`) to work with nested apps.

### Step 6: Vercel configuration (manual, in dashboard)

**Existing project** (swashbuckler.quest):
- Root Directory → `apps/web`
- Ignored Build Step → `npx turbo-ignore --fallback=HEAD^1`

**New project** (docs.swashbuckler.quest):
- Import same repo, Root Directory → `apps/docs`
- Ignored Build Step → `npx turbo-ignore --fallback=HEAD^1`
- Domain → `docs.swashbuckler.quest` (CNAME → `cname.vercel-dns.com`)

**Deploy safety:** Update Vercel settings before merging to main. Validate with preview deploys first.

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| slate-dom hoisting breaks Plate.js | Verify single copy at expected path post-migration. Add `overrides` in apps/web/package.json if needed. |
| Fumadocs CSS `@source` path wrong due to hoisting | Test `@source "fumadocs-ui"` shorthand (Tailwind v4) vs relative path |
| Vercel deploys break during migration | Update root directory settings before merge. Test with preview deploys. |

## Verification

- [ ] `npm install` from root succeeds with workspace resolution
- [ ] `npx turbo run build` builds both apps successfully
- [ ] `npx turbo run lint` passes for both apps
- [ ] `npx turbo run test:run --filter=@swashbuckler/web` — all tests pass
- [ ] Web app dev server works at `http://localhost:3000`
- [ ] Docs dev server works at `http://localhost:3001`
- [ ] `npx turbo run dev` runs both simultaneously
- [ ] E2E tests pass for web app
- [ ] `swashbuckler.quest` loads correctly after Vercel deploy
- [ ] `docs.swashbuckler.quest` loads and shows documentation
- [ ] Docs-only commit skips web build on Vercel
- [ ] Web-only commit skips docs build on Vercel
