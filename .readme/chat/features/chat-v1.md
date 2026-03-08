# Chat v1

**Status:** Not started
**App:** `apps/chat` (SvelteKit)
**Target:** `swashbuckler.quest/chat/**` via Vercel rewrite

---

## Overview

Real-time chat tied to shared spaces. Each shared space gets a single channel automatically. Space members can send direct messages to each other in Phase 2. Chat appears as a collapsible right sidebar within the main notes app and can be popped out into a standalone window.

---

## Scope

### Phase 1 Features

| Feature | Spec | Description |
|---------|------|-------------|
| Space channel | — | One channel per shared space, auto-created when a space is shared |
| Markdown composer | [composer.md](composer.md) | Plain textarea with rendered markdown output (marked.js) |
| @mentions | [composer.md](composer.md) | Autocomplete from space members, triggers priority notification |
| Spoiler tags | [composer.md](composer.md) | `\|\|text\|\|` renders as click-to-reveal |
| Message editing | [composer.md](composer.md) | Edit own messages; "edited" marker shown |
| Reactions | [reactions-and-threads.md](reactions-and-threads.md) | Emoji reactions on any message |
| Threads | [reactions-and-threads.md](reactions-and-threads.md) | Reply threads on any message (one level deep) |
| Dice roller | [dice-roller.md](dice-roller.md) | Full TTRPG notation via `/r` or `/roll` command |
| Private rolls | [dice-roller.md](dice-roller.md) | `/rp` or `/r ... !private` — result hidden from others |
| Notifications | [notifications.md](notifications.md) | Unread badge, sound, browser Notification API, @mention priority |
| GIF/image embeds | — | Tenor API for GIF search (`/gif`), URL-based image auto-embed |
| Typing indicators | — | "[username] is typing..." shown in channel footer |
| Pinned messages | — | Space owner can pin messages to a sticky header strip |
| Jump-to-unread | — | Button to scroll to first unread message |
| Sidebar embed | — | Collapsible right panel in notes app via same-origin iframe |
| Pop-out window | — | `window.open('/chat/space/{id}')` — standalone window mode |

### Out of Scope (Phase 1)

- Direct messages / DMs (Phase 2)
- Multiple channels per space (Phase 2)
- File attachments
- Voice/video
- Message search
- Read receipts

---

## Architecture

### Deployment

- SvelteKit app at `apps/chat/`
- Deployed as a separate Vercel project
- Main Next.js app proxies `/chat/**` via Vercel rewrite to the SvelteKit deployment
- Same origin (`swashbuckler.quest`) — Supabase auth cookies shared natively

### Dice Parser Package

The dice notation parser lives at `packages/dice-parser` (not inside `apps/chat`). This is required because `apps/tabletop-sim` must import the same parser without modification, and app-to-app imports do not work across monorepo boundaries.

```
packages/dice-parser/
├── src/
│   ├── index.ts       # exports parse()
│   └── parser.ts      # notation parser — no external dependencies
├── package.json
└── tsconfig.json
```

### Auth

SvelteKit reads the existing `sb-*` Supabase session cookie. No token passing or custom auth configuration needed. Use `@supabase/ssr` with SvelteKit hooks to initialize the server-side client.

### Theming

`packages/design-tokens` exports CSS custom properties and a Tailwind preset. Both apps import it.

- **Sidebar iframe:** since the iframe and parent share the same origin, CSS vars set on `:root` by the main app's theme system apply inside the iframe automatically — no postMessage theming bridge needed.
- **Pop-out window:** `window.open()` creates a separate document — `:root` vars from the parent do **not** carry over. In standalone mode, the chat app must initialize its own theme. It reads the user's theme preference from the same Supabase user preferences used by the notes app and applies it directly on `+layout.svelte` load.

### Sidebar Integration (notes app)

```
apps/web/src/features/chat/
├── ChatSidebar.tsx       # right panel shell, collapse state, pop-out button
└── ChatFrame.tsx         # <iframe src="/chat/space/{spaceId}" />
```

Collapse state persisted to `localStorage`. Pop-out via `window.open('/chat/space/{spaceId}?mode=standalone', 'chat', 'width=420,height=700')`. SvelteKit app detects standalone mode via the `?mode=standalone` URL parameter — **not** `window.opener !== null`, which becomes null if the opener tab closes and can be unreliable across browser extensions. A URL param survives the opener closing and is unambiguous.

### postMessage Protocol

Both `postMessage` calls and `message` event listeners **must validate `event.origin`** against the expected origin before processing, even though the iframe is same-origin.

- iframe → parent: `{ type: "unread-count", count: N }`
- iframe → parent: `{ type: "sidebar-expand-request" }` — sent when user clicks a browser notification (see [notifications.md](notifications.md))
- parent → iframe: `{ type: "panel-state", collapsed: boolean }`

### Unread Badge

The iframe postMessages unread counts to the parent window. The notes app sidebar tab/toggle button displays a badge with the count.

---

## Dice Roller

See [dice-roller.md](dice-roller.md) for full notation reference, parser module details, result storage schema, and private roll behavior.

---

## Database Schema

New migration on the existing Supabase project (follows `035_drop_mouse_cursors_pref.sql`):

### `036_chat.sql`

```sql
-- One channel per shared space
create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null default 'general',
  created_at timestamptz not null default now(),
  unique (space_id)
);

-- Messages (channel only for Phase 1)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references chat_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  -- Soft-delete intent: is_deleted = true replaces content display with "[deleted]".
  -- thread_parent_id ON DELETE SET NULL (not CASCADE) so that if a hard-delete path
  -- ever exists (admin tools, GDPR), parent deletion is visible rather than silently
  -- removing thread replies.
  type text not null default 'message'
    constraint chat_messages_type_check check (type in ('message', 'dice', 'system')),
  metadata jsonb,
  thread_parent_id uuid references chat_messages(id) on delete set null,
  is_private_roll boolean not null default false,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_length check (length(content) <= 4000)
);

-- Reactions: one emoji per user per message
create table chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

-- Unread tracking: last read position per user per channel
create table chat_read_cursors (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references chat_channels(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

-- Indexes for common query patterns
create index chat_messages_channel_created_idx on chat_messages (channel_id, created_at);
create index chat_messages_thread_parent_idx on chat_messages (thread_parent_id) where thread_parent_id is not null;
create index chat_messages_pinned_idx on chat_messages (channel_id) where is_pinned = true;

-- Auto-create a chat channel when a space is first shared
create or replace function create_chat_channel_on_share()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into chat_channels (space_id)
  values (new.space_id)
  on conflict (space_id) do nothing;
  return new;
end;
$$;

create trigger trg_create_chat_channel
  after insert on space_shares
  for each row execute function create_chat_channel_on_share();

-- Backfill: create channels for spaces already shared before this migration
insert into chat_channels (space_id)
select distinct space_id from space_shares
on conflict (space_id) do nothing;

-- Security-definer view for safe metadata access on private rolls.
-- Nulls metadata for private roll rows belonging to other users, preventing
-- column-level data leakage on direct queries (page load, history fetch).
-- RLS alone cannot null individual columns; this view enforces it at the
-- query level. The chat app queries this view instead of chat_messages directly.
create or replace view chat_messages_safe
with (security_invoker = false)
as
select
  id,
  channel_id,
  user_id,
  content,
  type,
  case
    when is_private_roll and user_id <> auth.uid() then null
    else metadata
  end as metadata,
  thread_parent_id,
  is_private_roll,
  is_edited,
  is_deleted,
  is_pinned,
  created_at,
  updated_at
from chat_messages;

-- RPC to update read cursor using server-side clock (avoids client clock skew)
create or replace function update_read_cursor(p_channel_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into chat_read_cursors (user_id, channel_id, last_read_at)
  values (auth.uid(), p_channel_id, now())
  on conflict (user_id, channel_id)
  do update set last_read_at = now();
end;
$$;
```

### RLS Policies

The existing `user_has_space_access(user_id, space_id)` SECURITY DEFINER helper (defined in migration 011) is reused for channel access checks.

- `chat_channels`: readable by space members via `user_has_space_access()`; not directly writable by users (created by trigger only)
- `chat_messages` (via `chat_messages_safe` view): readable/insertable by channel members; updatable by message owner only (`content`, `is_edited`); soft-deleted by message owner only (`is_deleted`); main channel queries filter `WHERE thread_parent_id IS NULL` to exclude replies from the main feed
- `chat_reactions`: readable by channel members; insertable/deletable by owner
- `chat_read_cursors`: user can read/write own rows only (writes via `update_read_cursor()` RPC only)

### Private Roll Security

Two layers protect private roll metadata:

**Layer 1 — direct query protection (`chat_messages_safe` view):** The view nulls `metadata` for private roll rows where `user_id <> auth.uid()`. The chat app queries `chat_messages_safe` instead of `chat_messages` directly for all history fetches and page loads. RLS alone cannot null individual columns — this view enforces it at the query level.

**Layer 2 — Realtime guard (client-side):** Supabase Realtime broadcasts the full row and cannot apply the view transformation. When a Realtime INSERT event arrives with `is_private_roll = true` AND `user_id !== currentUser.id`, the client **must** discard the event's `metadata` and render the `[private roll]` placeholder — do not trust the Realtime payload for private rolls you don't own.

### Realtime

Enable Supabase Realtime publication for `chat_messages`, `chat_reactions`, and `chat_read_cursors`. The SvelteKit app subscribes via Supabase client channels.

`chat_read_cursors` Realtime subscription enables multi-tab/multi-device unread sync: when the cursor is updated in one tab or device, other open tabs receive the change and recompute their unread count without a page reload.

---

## Notifications

See [notifications.md](notifications.md) for unread tracking, badge postMessage protocol, sound behavior, browser Notification API, and @mention priority details.

---

## GIF Support

Tenor API integration. `/gif <search>` opens an inline GIF picker. Selected GIF URL stored as a message with `type = 'message'` and `metadata.gif_url`. Rendered as an inline image with a max-height cap. The Tenor API key is a server-side secret only — GIF search must be proxied through a SvelteKit server route to avoid exposing the key to the browser.

**GIF URL validation:** Before storing `metadata.gif_url`, the server route must validate that the URL's origin is `media.tenor.com` (or `c.tenor.com`). This prevents a user who crafts a message row via API abuse from injecting arbitrary image URLs (tracking pixels, NSFW content). The validation happens in the `/api/gif` server route before writing the message — never trust a client-supplied GIF URL without checking the origin.

---

## Implementation Sequence

1. **`packages/design-tokens`** — Tailwind preset + CSS custom properties (prerequisite for theming parity)
2. **`packages/dice-parser`** — parser package scaffold; must exist before `apps/chat` imports it
3. **Database migration** — `036_chat.sql` + RLS + `chat_messages_safe` view + `update_read_cursor()` RPC + Realtime publication (`chat_messages`, `chat_reactions`, `chat_read_cursors`)
4. **`apps/chat` scaffold** — SvelteKit init, Supabase SSR client, auth hook, Tailwind + design tokens, Vitest + Playwright test setup
5. **Routing** — `/chat/space/[spaceId]`, standalone mode detection via `?mode=standalone` URL param
6. **Channel view** — message list (filtered to `thread_parent_id IS NULL`), infinite scroll (load older on scroll up), Realtime subscription (queries `chat_messages_safe`)
7. **Composer** — textarea, markdown preview toggle (DOMPurify + marked.js), Enter/Shift+Enter, empty guard, char limit (4000), draft persistence
8. **Notes app integration** — `ChatSidebar.tsx`, `ChatFrame.tsx`, collapse state + `panel-state` postMessage, pop-out window (`?mode=standalone`)

> Integration at step 8 (not last) so the postMessage protocol and iframe context can be tested while building the remaining features.

9. **Dice roller** — `packages/dice-parser` implementation + result card component
10. **Reactions** — emoji picker popover, reaction display on messages
11. **Threads** — thread drawer, reply composer; Realtime subscription increments thread count badge on parent message when reply INSERT arrives
12. **Mentions** — `@` autocomplete from `space_shares` roster
13. **Notifications** — unread cursors (`update_read_cursor()` RPC), badge postMessage, sound, browser Notification API, notification click → `sidebar-expand-request` postMessage
14. **GIF support** — Tenor API server route (with origin validation), `/gif` command
15. **Typing indicators** — Supabase presence channel per room
16. **Pinned messages** — pin action (space owner only), sticky pin strip in channel header
17. **Vercel rewrite** — add `/chat/**` rewrite to `apps/web/vercel.json` (production only)

---

## File Structure

```
packages/dice-parser/
├── src/
│   ├── index.ts                  # exports parse()
│   └── parser.ts                 # notation parser — no external dependencies
├── package.json
└── tsconfig.json

apps/chat/
├── src/
│   ├── app.html
│   ├── hooks.server.ts           # Supabase SSR session
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client (server + browser)
│   │   ├── stores/
│   │   │   ├── unread.ts         # unread counts, badge postMessage
│   │   │   └── presence.ts      # typing indicators
│   │   └── components/
│   │       ├── MessageList.svelte
│   │       ├── MessageItem.svelte
│   │       ├── DiceResult.svelte
│   │       ├── Composer.svelte
│   │       ├── ReactionPicker.svelte
│   │       ├── ThreadDrawer.svelte
│   │       └── PinStrip.svelte
│   └── routes/
│       ├── +layout.svelte        # auth guard, theme CSS vars, ?mode=standalone detection
│       ├── api/
│       │   └── gif/
│       │       └── +server.ts    # server-side Tenor API proxy (validates Tenor CDN origin)
│       ├── chat/
│       │   └── space/[spaceId]/
│       │       └── +page.svelte  # channel view
│       └── +error.svelte
├── static/
│   └── sounds/message.mp3
├── svelte.config.js
├── vite.config.ts
└── package.json
```

---

## Delete Message

Soft-delete is available to the message author via a context menu action.

- **Trigger:** message context menu → "Delete" (own messages only)
- **Behavior:** sets `is_deleted = true`; replaces displayed content with `[message deleted]` in gray italics. The message row remains so thread structure and reaction counts are preserved.
- **Constraints:** dice messages and system messages are not deletable in Phase 1
- **RLS:** only the message owner (`user_id = auth.uid()`) may set `is_deleted = true`

---

## Thread Count Badge Updates

When a thread reply arrives via Realtime, the parent message's thread count badge in the main feed must update without re-fetching the parent row.

**Mechanism:** The Realtime `chat_messages` INSERT handler checks whether the inserted message has a non-null `thread_parent_id`. If so, it finds the parent message in the local message list store and increments its `reply_count` in memory. The `reply_count` field is not stored in the DB — it is computed on initial load (count of rows with the given `thread_parent_id`) and maintained in the Svelte store thereafter via Realtime events. Last-reply timestamp is similarly updated from the incoming event's `created_at`.

---

## Open Issues

All critical issues from the initial design have been resolved:

- **Private roll column protection** — resolved via `chat_messages_safe` security-definer view (see schema section)
- **Parser package location** — resolved: `packages/dice-parser` (see Dice Parser Package section)
- **`space_shares` vs `workspace_shares`** — confirmed: correct table is `space_shares` (migration 011 dropped `workspace_shares`)
- **Pinned messages schema** — resolved: `is_pinned boolean` added to `chat_messages`
- **Backfill for existing shares** — resolved: migration includes backfill `INSERT ... SELECT DISTINCT space_id FROM space_shares ON CONFLICT DO NOTHING`
- **`type` CHECK constraint** — resolved: `CHECK (type IN ('message', 'dice', 'system'))` added
- **Soft-delete / cascade** — resolved: changed to `ON DELETE SET NULL`; intent documented inline in schema
- **Delete message UX** — resolved: see Delete Message section above
- **Thread count update path** — resolved: in-memory increment via Realtime INSERT handler (see Thread Count Badge Updates section)

## Verification Checklist

Feature-specific checks live in each sub-spec. This list covers shared infrastructure.

- [ ] Space channel auto-created (via trigger) when a space is first shared
- [ ] Backfill: existing shared spaces have a `chat_channels` row after migration
- [ ] Messages send and appear in real time for all connected members
- [ ] Main channel feed excludes thread replies (`thread_parent_id IS NULL`)
- [ ] GIF search proxied through server route; Tenor API key not exposed to browser; `gif_url` origin validated as Tenor CDN before storing
- [ ] Typing indicator appears and clears correctly
- [ ] Sidebar collapses and restores state from localStorage
- [ ] Pop-out opens in new window with standalone layout (`?mode=standalone`); theme initializes from user preferences
- [ ] Standalone mode detection uses `?mode=standalone` URL param (not `window.opener`)
- [ ] RLS prevents members of one space reading another space's messages
- [ ] Custom themes from notes app apply correctly inside the iframe
- [ ] Private roll `metadata` is null for non-owners on direct queries (via `chat_messages_safe` view)
- [ ] Private roll `metadata` not rendered for non-owners even when received via Realtime
- [ ] Deleting a message sets `is_deleted = true`; content replaced with `[message deleted]`
- [ ] Thread count badge updates in real time without re-fetching parent row
- [ ] Unread count syncs across open tabs when cursor is updated in one tab
- [ ] `last_read_at` set via `update_read_cursor()` RPC (server-side clock)
- [ ] postMessage origin validated in both directions
- [ ] Sub-spec checklists: [composer](composer.md) · [dice roller](dice-roller.md) · [reactions & threads](reactions-and-threads.md) · [notifications](notifications.md)
