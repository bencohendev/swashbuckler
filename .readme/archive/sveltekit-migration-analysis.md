# SvelteKit Migration Analysis

**Date:** 2026-03-06
**Status:** Archived — exploratory analysis, no action taken

---

## Motivation

Frustration with loading states and content flashes in the current Next.js/React codebase prompted an exploration of migrating to SvelteKit.

## Codebase Scope

- 337 source files, ~38K LOC, 21 feature modules
- 193 React components, ~935 React hook calls
- Plate.js rich text editor with 15+ plugins + collaborative editing via Yjs
- Radix UI primitives, react-dnd for drag-and-drop
- 95 test files (71 unit via Vitest/React Testing Library, 23 e2e via Playwright)
- Supabase + Dexie dual storage, TanStack Query, Zustand stores
- Monorepo: `apps/web` (Next.js 16), `apps/docs` (Next.js + Fumadocs)

## Key Finding: Slate/Plate Is React-Only

Slate renders editor nodes as React components, uses React hooks for state, and relies on React's reconciliation. Plate is a layer on top of Slate that's even more tightly coupled. **Neither has a Svelte port, and no community effort exists to create one.**

The Svelte rich text editor landscape is limited to:
- **Tiptap** (ProseMirror-based, has official Svelte support)
- Raw **ProseMirror** or **CodeMirror**

This means a SvelteKit migration would require a complete editor rewrite — the single largest and riskiest piece of the codebase.

## Pros of Migrating to SvelteKit

1. **Simpler reactivity** — No `useEffect`/`useCallback`/`useMemo` dance; Svelte 5 runes make reactive state trivial
2. **Smaller bundle** — Svelte compiles away the framework
3. **Less boilerplate** — No provider trees, context wrappers, or hook rules
4. **Better loading patterns** — SvelteKit's `+page.ts`/`+page.server.ts` load functions with streaming are more ergonomic
5. **Fewer re-render bugs** — The infinite loop footgun with TanStack Query + inline arrays wouldn't exist

## Cons and Risks

1. **Plate.js is the dealbreaker** — React-only, 35 files, 15+ plugins, collaborative editing. No Svelte equivalent. Would need Tiptap + full rebuild of mentions, slash commands, block menus, template variables, collaboration
2. **Yjs collaboration rework** — Supabase Yjs provider is reusable (vanilla JS), but the Plate integration is not. Must re-integrate with replacement editor
3. **95 tests need rewriting** — Unit tests use React Testing Library; e2e tests are mostly portable but helpers are React-specific
4. **Radix UI replacement** — No direct Svelte equivalent. Melt UI / Bits UI are options but less mature
5. **react-dnd replacement** — Would need svelte-dnd-action or similar
6. **Smaller ecosystem** — Fewer community packages, fewer Stack Overflow answers for edge cases
7. **D3 graph integration** — Framework-agnostic but React patterns need rewriting
8. **Docs app** — Also Next.js; would need migration or you'd run two frameworks

## Migration Effort by Component

| Component | Framework-Agnostic | Difficulty | Est. Days |
|---|---|---|---|
| Plate.js Editor | No | Critical | 15-30 |
| React Hooks (~935) | No | Heavy | 10-15 |
| Next.js App Router | No | Heavy | 5-7 |
| Yjs/Collaboration | Partial | Medium | 5-7 |
| Radix UI Components | No | Medium | 3-5 |
| TanStack Query | Yes | Medium | 2-3 |
| React Contexts (4) | No | Medium | 2-3 |
| Zustand Stores (10) | Yes | Low-Med | 1-2 |
| Supabase Auth | Yes | Medium | 1-2 |
| Dexie (IndexedDB) | Yes | Low | 0 |

**Total estimate: 2-4 months** for a solo developer. Editor is 40-60% of that.

## Confidence Level: 4/10

- Framework migration mechanics (routing, state, components): 6/10
- Plate.js to Tiptap editor rebuild with all customizations + Yjs collab: 3/10
- The editor is the heart of the app and the highest-risk area

## Alternatives Considered

1. **Fix loading states directly** — Diagnose specific flash/loading issues in the current stack. Days of work, not months.
2. **Migrate Plate to Tiptap within React** — Replace the editor while staying in React/Next.js. Addresses editor DX without a full rewrite.
3. **Leverage Next.js 16 / React 19 features** — Better Suspense, server components, streaming may not be fully utilized yet.

## Conclusion

The migration is technically feasible but not advisable given the risk/reward ratio. The editor rewrite alone is a multi-week project with high uncertainty. The loading state frustrations that motivated this exploration likely have targeted fixes within the current stack.
