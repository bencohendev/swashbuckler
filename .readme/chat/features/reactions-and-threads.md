# Reactions and Threads

**Status:** Not started
**Parent spec:** [Chat v1](chat-v1.md)

---

## Overview

Emoji reactions let members respond to messages with emojis. Reply threads let members discuss a specific message without cluttering the main channel. Threads are one level deep — no nested replies.

---

## Reactions

### Behavior

- On desktop, hovering a message reveals a reaction button (smiley face icon) and other message actions
- On touch devices there is no hover state — a persistent **message action bar** (a small row of icon buttons: react, reply, …) renders beneath each message at all times on mobile
- Clicking opens an emoji picker popover
- Selecting an emoji adds a reaction from the current user
- Clicking an existing reaction the user has added removes it (toggle)
- Clicking an existing reaction the user has not added adds it

### Display

- Reactions grouped by emoji beneath the message
- Each group shows: emoji + count (e.g., `👍 3`)
- Tooltip on hover lists the display names of users who reacted
- Current user's reactions highlighted (filled/bordered style)

### Database

Table: `chat_reactions`

```sql
unique (message_id, user_id, emoji)
```

One row per user per emoji per message — the unique constraint prevents duplicates.

### Realtime

`chat_reactions` table subscribed via Supabase Realtime. INSERT and DELETE events update the reaction counts in real time for all connected members.

---

## Threads

### Behavior

- Any message can be replied to via a "Reply" action in the message context menu
- Clicking "Reply" opens a **thread drawer** (side panel) focused on that message
- Thread drawer shows the parent message at the top, followed by all replies
- A composer at the bottom of the drawer sends replies to that thread
- The parent message in the main channel shows a thread count badge with reply count and last-reply timestamp (e.g., `3 replies · Today at 2:04 PM`). No avatars for Phase 1.

### Constraints

- One level deep only — replies cannot themselves be replied to
- `thread_parent_id` is set on reply messages; parent messages have `thread_parent_id = null`
- Replies are stored in `chat_messages` with `thread_parent_id` referencing the parent

### Thread Drawer Component

**Component:** `apps/chat/src/lib/components/ThreadDrawer.svelte`

- Opens as a right-side panel overlaying (or alongside) the message list
- Closes via an X button or pressing `Escape`
- Focus moves to the reply composer when the drawer opens
- Focus returns to the triggering message when the drawer closes

### Realtime

Thread replies are delivered via the existing `chat_messages` Realtime subscription. The thread drawer filters messages by `thread_parent_id` to display only replies for the open thread.

---

## Accessibility

- Emoji picker popover: `role="dialog"`, `aria-label="Pick a reaction"`
- Reaction buttons: `aria-label="React with [emoji] ([count])"`, `aria-pressed` for own reactions
- Thread drawer: `role="complementary"`, `aria-label="Thread"`, focus trapped while open
- Reply action: `aria-label="Reply to message"`

---

## Verification Checklist

- [ ] Emoji picker opens on reaction button click
- [ ] Selecting an emoji adds a reaction visible to all members in real time
- [ ] Clicking own reaction removes it
- [ ] Clicking another user's reaction adds the current user's reaction
- [ ] Unique constraint prevents duplicate reactions (one per user per emoji per message)
- [ ] Reaction counts update in real time via Supabase subscription
- [ ] Reply action opens thread drawer for the selected message
- [ ] Thread drawer shows parent message and all replies
- [ ] Replies send correctly and appear in real time
- [ ] Thread count badge shows reply count + last-reply timestamp (e.g., `3 replies · Today at 2:04 PM`)
- [ ] Mobile: persistent action bar (react, reply) renders beneath each message; desktop: action bar appears on hover
- [ ] Thread drawer closes on X or Escape; focus returns to trigger
- [ ] No nested threads — reply composer is not shown inside thread replies
- [ ] Accessible: ARIA roles on picker, drawer, and reaction buttons
