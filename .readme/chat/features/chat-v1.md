# Chat v1

**Status:** Not started
**App:** `apps/chat` (SvelteKit)
**Target:** `swashbuckler.quest/chat/**` via Vercel rewrite

---

## Overview

Real-time chat tied to shared spaces. Each shared space gets a single channel automatically. Space members can send direct messages to each other. Chat appears as a collapsible right sidebar within the main notes app and can be popped out into a standalone window.

---

## Scope

### Phase 1 Features

| Feature | Spec | Description |
|---------|------|-------------|
| Space channel | — | One channel per shared space, auto-created when a space is shared |
| Direct messages | — | 1:1 DMs between members of a shared space |
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

### Auth

SvelteKit reads the existing `sb-*` Supabase session cookie. No token passing or custom auth configuration needed. Use `@supabase/ssr` with SvelteKit hooks to initialize the server-side client.

### Theming

`packages/design-tokens` exports CSS custom properties and a Tailwind preset. Both apps import it. Since the iframe and parent share the same origin, CSS vars set on `:root` by the main app's theme system apply inside the iframe automatically — no postMessage theming bridge needed.

### Sidebar Integration (notes app)

```
apps/web/src/features/chat/
├── ChatSidebar.tsx       # right panel shell, collapse state, pop-out button
└── ChatFrame.tsx         # <iframe src="/chat/space/{spaceId}" />
```

Collapse state persisted to `localStorage`. Pop-out via `window.open('/chat/space/{spaceId}', 'chat', 'width=420,height=700')`. SvelteKit app detects `window.opener !== null` and renders in a compact standalone layout.

### Unread Badge

The iframe postMessages unread counts to the parent window. The notes app sidebar tab/toggle button displays a badge with the count.

---

## Dice Roller

See [dice-roller.md](dice-roller.md) for full notation reference, parser module details, result storage schema, and private roll behavior.

---

## Database Schema

New migrations on the existing Supabase project (continuation of `022_archive.sql`):

### `023_chat.sql`

```sql
-- One channel per shared space
create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null default 'general',
  created_at timestamptz not null default now(),
  unique (space_id)
);

-- DM conversations between space members
create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table chat_conversation_members (
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

-- Messages: channel or DM (exactly one of channel_id / conversation_id set)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  conversation_id uuid references chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  type text not null default 'message', -- 'message' | 'dice' | 'system'
  metadata jsonb,
  thread_parent_id uuid references chat_messages(id) on delete cascade,
  is_private_roll boolean not null default false,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_or_conversation check (
    (channel_id is not null) != (conversation_id is not null)
  )
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
  channel_id uuid references chat_channels(id) on delete cascade,
  conversation_id uuid references chat_conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, coalesce(channel_id, conversation_id))
);
```

### RLS Policies

- `chat_channels`: readable by space members (join via `workspace_shares`), writable by space owner only (auto-created on share)
- `chat_messages`: readable/insertable by channel members; updatable/deletable by message owner only
- `chat_reactions`: readable by channel members; insertable/deletable by owner
- `chat_read_cursors`: user can read/write own rows only
- `chat_conversations` / `chat_conversation_members`: accessible only to participants

### Realtime

Enable Supabase Realtime publication for `chat_messages` and `chat_reactions`. The SvelteKit app subscribes via Supabase client channels.

---

## Notifications

See [notifications.md](notifications.md) for unread tracking, badge postMessage protocol, sound behavior, browser Notification API, and @mention priority details.

---

## GIF Support

Tenor API integration. `/gif <search>` opens an inline GIF picker. Selected GIF URL stored as a message with `type = 'message'` and `metadata.gif_url`. Rendered as an inline image with a max-height cap.

---

## Implementation Sequence

1. **`packages/design-tokens`** — Tailwind preset + CSS custom properties (prerequisite for theming parity)
2. **Database migration** — `023_chat.sql` + RLS + Realtime publication
3. **`apps/chat` scaffold** — SvelteKit init, Supabase SSR client, auth hook, Tailwind + design tokens
4. **Routing** — `/chat/space/[spaceId]`, `/chat/dm/[conversationId]`, standalone layout detection
5. **Channel view** — message list, infinite scroll (load older on scroll up), Realtime subscription
6. **Composer** — textarea, markdown preview toggle, submit on Enter (Shift+Enter for newline)
7. **Dice roller** — parser module + result card component
8. **DMs** — conversation list, member picker, DM composer
9. **Reactions** — emoji picker popover, reaction display on messages
10. **Threads** — thread drawer, reply composer
11. **Mentions** — `@` autocomplete from space members roster
12. **Notifications** — unread cursors, badge postMessage, sound, browser Notification API
13. **GIF support** — Tenor API integration, `/gif` command
14. **Typing indicators** — Supabase presence channel per room
15. **Pinned messages** — pin action, sticky pin strip in channel header
16. **Notes app integration** — `ChatSidebar.tsx`, `ChatFrame.tsx`, collapse state, pop-out
17. **Vercel rewrite** — add `/chat/**` rewrite to `apps/web/vercel.json`

---

## File Structure

```
apps/chat/
├── src/
│   ├── app.html
│   ├── hooks.server.ts           # Supabase SSR session
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client (server + browser)
│   │   ├── dice/
│   │   │   ├── parser.ts         # notation parser — no dependencies
│   │   │   └── parser.test.ts
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
│   │       ├── DmList.svelte
│   │       └── PinStrip.svelte
│   └── routes/
│       ├── +layout.svelte        # auth guard, theme CSS vars, standalone detection
│       ├── chat/
│       │   ├── space/[spaceId]/
│       │   │   └── +page.svelte  # channel view
│       │   └── dm/[conversationId]/
│       │       └── +page.svelte  # DM view
│       └── +error.svelte
├── static/
│   └── sounds/message.mp3
├── svelte.config.js
├── vite.config.ts
└── package.json
```

---

## Verification Checklist

Feature-specific checks live in each sub-spec. This list covers shared infrastructure.

- [ ] Space channel auto-created when a space is shared
- [ ] Messages send and appear in real time for all connected members
- [ ] DMs only available between members of a shared space
- [ ] GIF search returns results and inserts correctly
- [ ] Typing indicator appears and clears correctly
- [ ] Sidebar collapses and restores state from localStorage
- [ ] Pop-out opens in new window with standalone layout
- [ ] RLS prevents members of one space reading another space's messages
- [ ] Custom themes from notes app apply correctly inside the iframe
- [ ] Sub-spec checklists: [composer](composer.md) · [dice roller](dice-roller.md) · [reactions & threads](reactions-and-threads.md) · [notifications](notifications.md)
