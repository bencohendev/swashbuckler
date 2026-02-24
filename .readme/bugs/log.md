# Bug Log

All bugs are tracked here. If a bug needs root-cause analysis or detailed investigation notes, create a separate file in this directory and link to it from the table.

## Open

| Bug | Description |
|-----|-------------|
## Closed

| Date | Bug | Fix |
|------|-----|-----|
| 2026-02-24 | Site-wide content flickers | Rewrote useIsMobile with useSyncExternalStore, sync sidebar hydration, added keepPreviousData to sidebar queries, decomposed all-or-nothing sidebar skeleton, migrated tag counts and space shares to TanStack Query, fixed QuickCaptureButton/GraphView/LinkedObjects/GuestBanner pop-in |
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
