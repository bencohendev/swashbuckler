# Bug Log

All bugs are tracked here. If a bug needs root-cause analysis or detailed investigation notes, create a separate file in this directory and link to it from the table.

## Open

| Bug | Description |
|-----|-------------|
| New entry title shows text instead of placeholder | When creating a new entry, the title field should show a placeholder instead of pre-filled text |
| Private block / code block unescapable | Can't escape out of private blocks or code blocks — cursor gets trapped with no way to insert content above or below |
| Table block missing row/column controls | Table blocks have no UI controls to add or delete rows and columns |
## Closed

| Date | Bug | Fix |
|------|-----|-----|
| 2026-02-24 | Sidebar skeleton spacing off | Change `px-2` → `p-2` on skeleton sections to add vertical padding |
| 2026-02-24 | Duplicate names allowed for spaces, types, templates, tags | Add case-insensitive unique constraints (Supabase migration 021), pre-mutation Dexie checks, surface DUPLICATE errors in UI |
| 2026-02-24 | Site-wide content flickers | Rewrote useIsMobile with useSyncExternalStore, sync sidebar hydration, added keepPreviousData to sidebar queries, decomposed all-or-nothing sidebar skeleton, migrated tag counts and space shares to TanStack Query, fixed QuickCaptureButton/GraphView/LinkedObjects/GuestBanner pop-in |
| 2026-02-24 | Graph node tap not working on mobile | Add 5px drag threshold so touch jitter doesn't prevent node selection |
| 2026-02-24 | Guest mode: no "New Type" button and no default type | Treat `owner_id === 'local'` as owner in permission resolver; seed Page type on first local space creation |
| 2026-02-23 | Content flash on settings pages | Add settings layout with Suspense boundary to handle `useSearchParams` bailout |
| 2026-02-23 | Mobile graph broken | Add pinch-to-zoom, touch drag/pan, and tap selection for mobile graph view |
| 2026-02-23 | Graph filter search no-op | Filter nodes by search query in GraphCanvas (was only highlighting, not filtering) |
| 2026-02-23 | Mobile slash menu unusable | Render slash menu as bottom panel on mobile; skip auto-focus to prevent keyboard flicker |
| 2026-02-23 | Delete types not working | Add ON DELETE CASCADE to type FKs (migration 020), cascade in Dexie (incl. relations/tags/pins), use `.select()` on Supabase delete to detect silent failures, invalidate objects/templates caches after type deletion |
| 2026-02-23 | View-only users see create buttons | Guard Quick Capture FAB/shortcut and "New Type" buttons with `canEdit` permission check |
| 2026-02-23 | [Shared user can't create new entries](shared-user-create-entries.md) | Classify spaces by owner_id, add error feedback, re-apply RLS INSERT policy (migration 019) |
| 2026-02-22 | [Unsaved changes on navigate](unsaved-changes-on-navigate.md) | Key-based editor remount + stable save callback via refs |
| 2026-02-21 | [Cursor presence not visible](cursor-presence.md) | Import `DOMEditor` from top-level `slate-dom` to avoid dual-package WeakMap issue |
| 2026-02-21 | [Simultaneous join duplication](simultaneous-join.md) | Set `doc.clientID = 0` before seeding so duplicate seeds are idempotent |
| 2026-02-20 | Stale entry visible after switching spaces | Redirect to `/` on space switch in SpaceSwitcher |
| 2026-02-20 | Failing tests (18 across 4 files) | Update stale schemas/fixtures from remove-builtins migration and spaces changes |
| 2026-02-20 | Middleware deprecation warning | Migrate `src/middleware.ts` to `proxy.ts` for Next.js 16 |
