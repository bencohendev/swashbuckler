# Chat v1 — Implementation Plan

**Status:** Not started
**Parent spec:** [Chat v1](features/chat-v1.md)

Ordered checklist for building Chat v1 from scratch. Each phase builds on the previous.

---

## Phase 1 — Foundation

- [ ] **`packages/design-tokens`** — Tailwind preset + CSS custom properties (theming prerequisite for both apps)
- [ ] **DB migration** — `023_chat.sql` + RLS policies + Supabase Realtime publication
- [ ] **`apps/chat` scaffold** — SvelteKit init, Supabase SSR client, auth hook, Tailwind + design tokens wired up
- [ ] **Routing** — `/chat/space/[spaceId]`, `/chat/dm/[conversationId]`, standalone layout detection (`window.opener`)

## Phase 2 — Core Messaging (MVP)

- [ ] **Channel view** — message list, infinite scroll (load older on scroll up), Realtime subscription
- [ ] **Composer** — textarea, markdown preview toggle, Enter/Shift+Enter, empty guard, char limit (4000), draft persistence
- [ ] **Notes app integration** — `ChatSidebar.tsx`, `ChatFrame.tsx`, collapse state + `panel-state` postMessage, pop-out window

> Integration is here (not last) so the postMessage protocol and iframe context can be tested while building the remaining features.

## Phase 3 — Composer Features

- [ ] **@mentions** — `@` autocomplete popover filtered to space members, priority notification hook
- [ ] **Spoiler tags** — `||text||` parse + click-to-reveal toggle
- [ ] **Message editing** — edit own messages in-place, "(edited)" marker, `ArrowUp` shortcut

## Phase 4 — Social Features

- [ ] **Reactions** — emoji picker popover, `chat_reactions` Realtime subscribe, mobile persistent action bar
- [ ] **Threads** — thread drawer, reply composer, parent badge showing reply count + last-reply timestamp

## Phase 5 — Power Features

- [ ] **Dice roller** — parser module (`parser.ts`), result card component, inline error surface, `/r`/`/roll` command dispatch
- [ ] **DMs** — conversation list, member picker, DM composer
- [ ] **Notifications** — unread cursors, `unread-count` postMessage, sound (Web Audio API), `panel-state` consumer, browser Notification API, @mention priority

## Phase 6 — Polish

- [ ] **GIF support** — Tenor API integration, `/gif` command, inline rendering
- [ ] **Typing indicators** — Supabase presence channel per room
- [ ] **Pinned messages** — pin action (space owner only), sticky pin strip in channel header
- [ ] **Jump-to-unread** — scroll button, first unread message marker
- [ ] **Vercel rewrite** — add `/chat/**` → SvelteKit deployment rewrite to `apps/web/vercel.json` (production only)
