# Onboarding Guide

A structured learning program for new developers joining the Swashbuckler project. Read the documents in order — each builds on the previous one.

## Reading Order

| # | Document | What You'll Learn |
|---|----------|-------------------|
| 1 | [Architecture Overview](01-architecture-overview.md) | The big picture: monorepo layout, feature-based structure, provider hierarchy, data flow, conventions |
| 2 | [Data Layer Deep Dive](02-data-layer.md) | The DataClient interface, dual Supabase/Dexie implementations, TanStack Query, event system, mutation patterns |
| 3 | [Database & Migrations](03-database.md) | Full PostgreSQL schema, every table explained, RLS policies, migration history, Dexie local database |
| 4 | [Auth & Sessions](04-auth.md) | Supabase Auth, OAuth flow, guest mode, session management, middleware, local-to-cloud migration |
| 5 | [Routing & Layout](05-routing.md) | Next.js App Router structure, route groups, layout hierarchy, navigation, the object editor modal |
| 6 | [The Editor](06-editor.md) | Plate.js architecture, 30+ plugins, custom plugins, content model, auto-save, the slate-dom gotcha |
| 7 | [Spaces, Sharing & Permissions](07-spaces-sharing.md) | Multi-space model, sharing system, exclusions, permission resolution, collaboration activation |
| 8 | [Realtime Collaboration](08-collaboration.md) | Yjs CRDT, custom SupabaseYjsProvider, presence, leader election, critical implementation gotchas |
| 9 | [State Management](09-state-management.md) | TanStack Query vs Zustand vs Context vs localStorage — when to use each, all stores documented |
| 10 | [Testing](10-testing.md) | Vitest unit tests, Playwright e2e, accessibility testing, mocking strategies, fixture patterns |

## How to Use This Guide

**Week 1 — Orientation (Docs 1-3):**
Start with the architecture overview to get the big picture. Then dive into the data layer and database — these are the foundation everything else builds on. By the end of week 1, you should be able to trace a data read/write from component to database and back.

**Week 2 — Infrastructure (Docs 4-5):**
Understand how users get into the app (auth) and how they navigate it (routing). These docs connect the data layer to the actual user experience.

**Week 3 — Core Features (Docs 6-8):**
The editor is the heart of the app. Spaces and sharing add multi-user complexity. Collaboration is the most technically challenging feature. Take your time with these.

**Week 4 — Patterns & Quality (Docs 9-10):**
Wrap up with the state management philosophy (understanding _why_ things are structured this way) and the testing infrastructure (so you can contribute confidently).

## Each Document Includes

- **Key files** — exact paths to the source code being discussed
- **Code walkthroughs** — step-by-step traces through real code paths
- **Gotchas** — things that will trip you up if you don't know about them
- **Exercises** — hands-on tasks to confirm your understanding

## Prerequisite Knowledge

This guide assumes familiarity with:
- React (hooks, context, components)
- TypeScript
- Next.js basics (App Router, server vs client components)
- SQL fundamentals
- Git

No prior knowledge of Plate.js, Yjs, Supabase, Dexie, or TanStack Query is required — the docs explain these as they come up.

## Related Documentation

- [Feature Specs](../features/) — per-feature specifications (what each feature does)
- [API Documentation](../api/) — data layer reference (interface signatures, query keys)
- [Bug Log](../bugs/log.md) — tracked bugs and fixes
- [Main Index](../index.md) — master documentation index
