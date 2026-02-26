# Bug Log

All bugs are tracked here. If a bug needs root-cause analysis or detailed investigation notes, create a separate file in this directory and link to it from the table.

## Open

| Bug | Description |
|-----|-------------|

## Closed

| Date | Bug | Fix |
|------|-----|-----|
| 2026-02-25 | Cursor lost after inserting inline link | Override LinkPlugin transforms (insertText, insertData, insertBreak) with deferred focus restoration after withLink's URL auto-wrapping |
| 2026-02-25 | Theme switcher + custom themes interaction | Added palette icon for custom themes, remember last custom theme in cycle so users can switch back |
| 2026-02-25 | OAuth redirect account menu stale | Derive `isGuest` from client-side `useAuth()` state instead of server `email` prop — use server prop only during hydration loading |
| 2026-02-25 | Mobile sharing button overflows container | Stack email input on its own row with select + button below — dialog is too narrow for a single-row layout |
| 2026-02-25 | Types list has unnecessary reorder chevrons | Removed up/down chevron buttons and handleMoveType callback from ObjectTypeManager |
| 2026-02-25 | Field row grip icon only moves up on click | Replaced click-to-move with real drag-and-drop using react-dnd (DraggableFieldRow wrapper with midpoint-based hover reordering) |
| 2026-02-24 | Cursor jumps out of newly created special blocks | Defer both selection and focus together inside a single `setTimeout` callback so plugin normalization finishes before cursor position is set |
| 2026-02-24 | New entry title shows text instead of placeholder | Show placeholder instead of generated name in title input for new entries |
| 2026-02-24 | Cursor trapped in code blocks, tables, and private blocks | Add ExitBreakPlugin (Mod+Enter / Mod+Shift+Enter) and TrailingBlockPlugin to ensure users can always escape block-level elements |
| 2026-02-24 | Table blocks have no row/column controls | Add floating toolbar on hover with add row, add column, delete row, delete column, delete table buttons |
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
