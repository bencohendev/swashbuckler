# Chat — Documentation Index

**App:** `apps/chat` (SvelteKit)
**Stack:** SvelteKit, Supabase Realtime, Tailwind, shared design tokens
**Status:** In development

## Overview

Real-time chat tied to shared spaces. Appears as a collapsible right sidebar in the main notes app and can be popped out into a standalone window. Served at `/chat/**` on the same origin via Vercel rewrite, embedded as a same-origin iframe.

## Integration Architecture

- **Routing:** Vercel rewrite proxies `/chat/**` → SvelteKit deployment
- **Auth:** Shared Supabase session cookies (same origin — no extra config)
- **Theming:** CSS custom properties from `packages/design-tokens` apply inside iframe automatically
- **Embed:** Main app renders `<iframe src="/chat/space/{spaceId}" />` in collapsible right sidebar
- **Pop-out:** `window.open('/chat/space/{spaceId}')` — same origin, full access

## Features

| Feature | Spec | Status |
|---------|------|--------|
| [Chat v1](features/chat-v1.md) | Space channels, DMs, shared architecture, GIFs, typing indicators, sidebar embed | Active |
| [Composer](features/composer.md) | Markdown, @mentions, spoiler tags, message editing | Not started |
| [Dice Roller](features/dice-roller.md) | TTRPG notation, private rolls, result cards | Not started |
| [Reactions and Threads](features/reactions-and-threads.md) | Emoji reactions, reply threads (one level deep) | Not started |
| [Notifications](features/notifications.md) | Unread badge, sound, browser Notification API, @mention priority | Not started |

## Planned Features

| Feature | Description |
|---------|-------------|
| Message search | Full-text search across channel history |
| File attachments | Upload files directly in chat |
| Voice/video | Audio/video rooms per space |

## Database Tables (same Supabase project)

```
chat_channels              # one per shared space, auto-created on share
chat_conversations         # DM threads between space members
chat_conversation_members  # participants + last_read_at per conversation
chat_messages              # content, type, metadata JSONB, thread_parent_id
chat_reactions             # message_id + user_id + emoji (unique constraint)
chat_read_cursors          # user_id + channel_id + last_read_at (unread tracking)
```
