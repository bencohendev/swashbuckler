# Notifications

**Status:** Not started
**Parent spec:** [Chat v1](chat-v1.md)

---

## Overview

Multiple notification surfaces keep users aware of new messages across different contexts: an unread count badge in the notes app sidebar, an audio cue, browser-level notifications, and priority alerts for @mentions.

---

## Unread Tracking

### Mechanism

- Table: `chat_read_cursors` — one row per user per channel
- `last_read_at` is compared against `chat_messages.created_at` to compute unread count
- Unread count = number of messages with `created_at > last_read_at` in the channel (excluding thread replies: `thread_parent_id IS NULL`)
- The aggregate unread badge shown in the notes app sidebar is the sum of unread across all channels the user is a member of

### Cursor Updates

`last_read_at` is updated when either of the following occurs:
- User scrolls to the bottom of the message list (newest message visible)
- Window or panel receives focus while already at the bottom

The cursor is not updated while the user is scrolled up reading history.

**Clock skew:** `last_read_at` **must not** be set from the client clock (`new Date()`). Messages use `now()` server-side; if the cursor is set from a device with a skewed clock, unread counts will be incorrect across devices. All cursor updates use the `update_read_cursor(channel_id)` SECURITY DEFINER RPC defined in `036_chat.sql`, which calls `now()` server-side.

---

## Unread Badge (notes app sidebar)

### Mechanism

- The chat iframe postMessages to its parent window when the unread count changes:
  ```json
  { "type": "unread-count", "count": 3 }
  ```
- The `ChatSidebar` component in `apps/web` listens via `window.addEventListener('message', ...)`, validating `event.origin` before processing
- Renders a numeric badge on the sidebar toggle button when count > 0
- Badge clears when count returns to 0

### Store

**File:** `apps/chat/src/lib/stores/unread.ts`

Manages unread count per channel, fires the postMessage on change.

### Panel Collapse State

The notes app parent sends a `postMessage` to the chat iframe whenever the sidebar collapse state changes:

```json
{ "type": "panel-state", "collapsed": true }
```

The iframe stores this value. When deciding whether to play sound, the iframe treats `collapsed === true` as equivalent to the tab being hidden — sound plays even if `document.hidden === false` while the panel is collapsed.

---

## Sound

- Audio file: `apps/chat/static/sounds/message.mp3`
- Played via **Web Audio API** (preferred over `<audio>` for precise timing and keeping a decoded buffer in memory ready to fire)
- `AudioContext` must be created and `resume()`d within a user gesture (e.g., the first message send) to satisfy browser autoplay policy — the same policy applies to both Web Audio API and `<audio>` elements
- Triggered on new incoming message (not own messages) when either:
  - The browser tab is not active (`document.hidden === true`), or
  - The chat panel is collapsed in the notes app sidebar

### Sound Muting

- Sound is suppressed when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- **Note:** this is a deliberate coupling — `prefers-reduced-motion` controls animation, not audio. Users with vestibular disorders who want no animations but do want audio cues may find this frustrating. A dedicated per-user "mute notification sounds" preference is the correct long-term solution but is deferred to Phase 2. The coupling is intentional for Phase 1 simplicity and must be documented in user-facing help text.

---

## Browser Notification API

### Permission

- Request `Notification.permission` after the user **sends** their first message in the session (not receives) — this ensures user intent before asking
- Do not request on page load — wait for meaningful user activity
- If permission is denied, do not re-request

### Trigger Conditions

Show a browser notification when a new message arrives and:
- `document.hidden === true` (tab not visible), OR
- The message contains an @mention of the current user (see @mention priority below)

### Notification Content

- **Title:** sender's display name
- **Body:** message content (truncated to ~100 chars)
- **Icon:** app favicon or sender avatar

### Click Behavior

Clicking the notification focuses the browser tab/window. The click event fires in the chat iframe's `Notification.onclick` handler. The iframe then:

1. Calls `window.focus()` to ensure the tab is foregrounded
2. Posts `{ type: "sidebar-expand-request" }` to `window.parent` (validated by origin check)
3. Scrolls the message list to the relevant message

The `ChatSidebar` component in `apps/web` handles `sidebar-expand-request` messages by setting the panel to expanded (`collapsed: false`) and responding with a `panel-state` message back to the iframe.

This uses the existing postMessage protocol — the iframe is already allowed to emit messages to its parent (it sends `unread-count` today). No BroadcastChannel or sessionStorage flag is needed.

---

## @Mention Priority

- A message is considered a priority mention if its `content` contains `@{currentUserDisplayName}`
- Priority mentions trigger a browser notification **even when `document.hidden === false`** (tab is visible)
- Priority mentions also bypass the "panel collapsed" check for sound — sound plays regardless
- Known limitation: plain-text matching can produce false positives if one display name is a substring of another (e.g., `@Ali` inside `@Alice`). Acceptable for Phase 1.

---

## Multi-Tab Unread Sync

When the user has chat open in multiple tabs or devices, reading on one tab must update the unread count on all others without a page reload.

**Mechanism:** `chat_read_cursors` is included in the Supabase Realtime publication (see `036_chat.sql`). The `unread.ts` store subscribes to `chat_read_cursors` UPDATE events for the current user. When a cursor update arrives (whether local or from another device), the store recomputes unread count from the new `last_read_at`.

---

## Open Issues

All issues resolved:

- **Notification click handler** — resolved: iframe `Notification.onclick` posts `{ type: "sidebar-expand-request" }` to `window.parent`; `ChatSidebar` handles it (see Click Behavior section)
- **`last_read_at` clock skew** — resolved: all cursor writes go through `update_read_cursor()` RPC using server-side `now()`
- **`prefers-reduced-motion` / sound coupling** — resolved: coupling is intentional for Phase 1; documented in Sound Muting section; dedicated setting deferred to Phase 2

## Verification Checklist

- [ ] Unread count increments correctly as new messages arrive (excluding thread replies)
- [ ] `last_read_at` cursor updated via `update_read_cursor()` RPC (server-side clock) on scroll-to-bottom or focus
- [ ] Unread count clears when messages are read
- [ ] iframe postMessages `{ type: 'unread-count', count: N }` to parent window; origin validated on receipt
- [ ] Notes app sidebar badge reflects current unread count
- [ ] Badge disappears when count reaches 0
- [ ] Sound plays when new message arrives and tab is not active
- [ ] Sound plays when new message arrives and panel is collapsed
- [ ] Sound does not play for own messages
- [ ] Sound is suppressed when `prefers-reduced-motion` is set
- [ ] AudioContext initialized within a user gesture; no autoplay errors in console
- [ ] Notes app parent sends `{ type: 'panel-state', collapsed: boolean }` to iframe on sidebar toggle; iframe uses it for sound decisions
- [ ] Browser notification permission requested after user sends first message (not on load, not on receive)
- [ ] Browser notification fires when document is hidden
- [ ] @mention triggers browser notification even when document is visible
- [ ] Clicking browser notification focuses the tab; iframe posts `sidebar-expand-request` to parent; parent expands sidebar; chat scrolls to message
- [ ] Unread count syncs to 0 in all open tabs when cursor is updated in any one tab
