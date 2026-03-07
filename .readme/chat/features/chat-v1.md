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

| Feature | Description |
|---------|-------------|
| Space channel | One channel per shared space, auto-created when a space is shared |
| Direct messages | 1:1 DMs between members of a shared space |
| Markdown composer | Plain textarea with rendered markdown output (marked.js) |
| Reactions | Emoji reactions on any message |
| Threads | Reply threads on any message (one level deep) |
| Dice roller | Full TTRPG notation via `/r` or `/roll` command |
| Private rolls | `/rp` or `/r ... !private` — result hidden from others |
| Notifications | Unread badge, sound, browser Notification API, @mention priority |
| GIF/image embeds | Tenor API for GIF search (`/gif`), URL-based image auto-embed |
| @mentions | Autocomplete from space members, triggers priority notification |
| Typing indicators | "[username] is typing..." shown in channel footer |
| Spoiler tags | `\|\|text\|\|` renders as click-to-reveal |
| Message editing | Edit own messages; "edited" marker shown |
| Pinned messages | Space owner can pin messages to a sticky header strip |
| Jump-to-unread | Button to scroll to first unread message |
| Sidebar embed | Collapsible right panel in notes app via same-origin iframe |
| Pop-out window | `window.open('/chat/space/{id}')` — standalone window mode |

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

### Notation Reference

| Notation | Description | Example |
|----------|-------------|---------|
| `XdY` | Roll X dice of Y sides | `2d6` |
| `+N` / `-N` | Modifier | `1d20+5` |
| `XdY!` | Exploding dice (max value → roll again, add) | `2d6!` |
| `XdYkhN` | Keep highest N | `4d6kh3` (D&D stat rolling) |
| `XdYklN` | Keep lowest N | `2d20kl1` (disadvantage) |
| `XdYrN` | Reroll values equal to N | `2d6r1` (Halfling Luck) |
| `XdYtN` | Count successes (dice showing N+) | `5d6t4` (World of Darkness) |
| `XdF` | Fudge/FATE dice (-1, 0, +1) | `4dF` |
| Mixed groups | Multiple dice types summed | `1d8+2d6+3` |
| Label | Append text after notation | `2d6+3 Fireball damage` |

### Commands

- `/r <notation>` or `/roll <notation>` — public roll, result visible to all
- `/rp <notation>` or `/r <notation> !private` — private roll, shows `[private roll]` to others; full result visible only to roller

### Result Storage

Dice rolls are stored as `chat_messages` with `type = 'dice'` and full result data in `metadata JSONB`:

```json
{
  "notation": "4d6kh3",
  "groups": [
    {
      "count": 4,
      "sides": 6,
      "rolls": [3, 5, 2, 6],
      "kept": [5, 6, 3],
      "dropped": [2],
      "exploded": []
    }
  ],
  "total": 14,
  "label": "Strength check",
  "private": false
}
```

The dice parser is a standalone TypeScript module with no dependencies — reusable in the tabletop simulator.

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

### Unread Count

`chat_read_cursors.last_read_at` compared to `chat_messages.created_at` to compute unread count per channel/conversation. Updated on scroll-to-bottom or window focus.

### Sound

Small audio file (`/sounds/message.mp3`) played via Web Audio API on new messages when the tab is not active or the chat panel is collapsed. Respect `prefers-reduced-motion` — no sound if reduced motion is set.

### Browser Notifications

Request `Notification` permission after first message received. Show notification for new messages when document is hidden. @mentions trigger notifications even when document is visible (priority).

### Unread Badge (in notes app)

iframe postMessages `{ type: 'unread-count', count: N }` to `window.parent` on change. The `ChatSidebar` component in the notes app listens and renders a badge on the sidebar toggle button.

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

- [ ] Space channel auto-created when a space is shared
- [ ] Messages send and appear in real time for all connected members
- [ ] Markdown renders correctly (bold, italic, code, links, lists)
- [ ] Dice roller handles all notation types and stores results in metadata
- [ ] Private rolls show `[private roll]` to other members
- [ ] DMs only available between members of a shared space
- [ ] Reactions add/remove correctly with unique constraint enforced
- [ ] Thread replies nest correctly under parent messages
- [ ] Unread count increments correctly and clears on read
- [ ] Notification sound plays only when not active/visible
- [ ] Browser notification fires on new message when document hidden
- [ ] @mention triggers priority notification
- [ ] Spoiler tags render as click-to-reveal
- [ ] GIF search returns results and inserts correctly
- [ ] Typing indicator appears and clears correctly
- [ ] Sidebar collapses and restores state from localStorage
- [ ] Pop-out opens in new window with standalone layout
- [ ] Unread badge in notes app sidebar reflects actual unread count
- [ ] RLS prevents members of one space reading another space's messages
- [ ] Custom themes from notes app apply correctly inside the iframe
- [ ] Accessible: keyboard navigable, ARIA roles on message list, focus management in composer
