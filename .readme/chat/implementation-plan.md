# Chat v1 — Implementation Plan

**Status:** Not started
**Parent spec:** [Chat v1](features/chat-v1.md)

Ordered checklist for building Chat v1 from scratch. Each phase builds on the previous.

---

The implementation sequence in [chat-v1.md](features/chat-v1.md) is the canonical ordered list of steps. The phases below group those steps by theme.

## Phase 1 — Foundation

- [ ] **`packages/design-tokens`** — Tailwind preset + CSS custom properties (theming prerequisite for both apps)
- [ ] **`packages/dice-parser`** — parser package scaffold; required before `apps/chat` imports it (must precede app scaffold)
- [ ] **DB migration** — `036_chat.sql`: tables + `chat_messages_safe` view + `update_read_cursor()` RPC + RLS policies + Realtime publication (`chat_messages`, `chat_reactions`, `chat_read_cursors`)
- [ ] **`apps/chat` scaffold** — SvelteKit init, Supabase SSR client, auth hook, Tailwind + design tokens wired up, Vitest + Playwright test setup
- [ ] **Routing** — `/chat/space/[spaceId]`, standalone mode detection via `?mode=standalone` URL param (not `window.opener`)

## Phase 2 — Core Messaging (MVP)

- [ ] **Channel view** — message list (`WHERE thread_parent_id IS NULL`), queries via `chat_messages_safe` view, infinite scroll (load older on scroll up), Realtime subscription
- [ ] **Composer** — textarea, markdown preview (`DOMPurify.sanitize(marked.parse(...))`), Enter/Shift+Enter, empty guard, char limit (4000), draft persistence
- [ ] **Notes app integration** — `ChatSidebar.tsx`, `ChatFrame.tsx`, collapse state + `panel-state` postMessage, pop-out window (`?mode=standalone`), `sidebar-expand-request` postMessage handler

> Integration is here (not last) so the postMessage protocol and iframe context can be tested while building the remaining features.

## Phase 3 — Composer Features

- [ ] **@mentions** — `@` autocomplete popover filtered to `space_shares` roster, priority notification hook
- [ ] **Spoiler tags** — `||text||` pre-process + click-to-reveal toggle (custom marked.js extension or regex pre-pass)
- [ ] **Message editing** — edit own messages in-place, "(edited)" marker, draft saved before edit mode, `ArrowUp` shortcut
- [ ] **Delete message** — context menu "Delete" on own messages; soft-deletes via `is_deleted = true`; renders `[message deleted]`

## Phase 4 — Social Features

- [ ] **Reactions** — emoji picker popover, `chat_reactions` Realtime subscribe, mobile persistent action bar, mobile "who reacted" bottom sheet on tap
- [ ] **Threads** — thread drawer (overlay in sidebar, alongside in pop-out), reply composer, in-memory thread count increment via Realtime INSERT

## Phase 5 — Power Features

- [ ] **Dice roller** — `packages/dice-parser` implementation (100-dice cap, 100-reroll cap), result card component, 500ms submission debounce, `/r`/`/roll`/`/rp` command dispatch
- [ ] **Notifications** — unread cursors (via `update_read_cursor()` RPC), `unread-count` postMessage, `chat_read_cursors` Realtime for multi-tab sync, sound (Web Audio API), `panel-state` consumer, browser Notification API, notification click → `sidebar-expand-request`, @mention priority

## Phase 6 — Polish

- [ ] **GIF support** — Tenor API server-side proxy route (validates Tenor CDN origin before storing), `/gif` command, inline rendering with max-height cap
- [ ] **Typing indicators** — Supabase presence channel per room
- [ ] **Pinned messages** — pin action (space owner only), sticky pin strip in channel header (uses `is_pinned` column)
- [ ] **Jump-to-unread** — scroll button, first unread message marker
- [ ] **Vercel rewrite** — add `/chat/**` → SvelteKit deployment rewrite to `apps/web/vercel.json` (production only)
