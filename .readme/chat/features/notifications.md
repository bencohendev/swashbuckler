# Notifications

**Status:** Not started
**Parent spec:** [Chat v1](chat-v1.md)

---

## Overview

Multiple notification surfaces keep users aware of new messages across different contexts: an unread count badge in the notes app sidebar, an audio cue, browser-level notifications, and priority alerts for @mentions.

---

## Unread Tracking

### Mechanism

- Table: `chat_read_cursors` — one row per user per channel/conversation
  - Channel rows use `channel_id`; DM conversation rows use `conversation_id` (with `channel_id = null`)
- `last_read_at` is compared against `chat_messages.created_at` to compute unread count
- Unread count = number of messages with `created_at > last_read_at` in the channel or DM
- The aggregate unread badge shown in the notes app sidebar is the **sum of unread across all channels + all DM conversations**

### Cursor Updates

`last_read_at` is updated when either of the following occurs:
- User scrolls to the bottom of the message list (newest message visible)
- Window or panel receives focus while already at the bottom

The cursor is not updated while the user is scrolled up reading history.

---

## Unread Badge (notes app sidebar)

### Mechanism

- The chat iframe postMessages to its parent window when the unread count changes:
  ```json
  { "type": "unread-count", "count": 3 }
  ```
- The `ChatSidebar` component in `apps/web` listens via `window.addEventListener('message', ...)`
- Renders a numeric badge on the sidebar toggle button when count > 0
- Badge clears when count returns to 0

### Store

**File:** `apps/chat/src/lib/stores/unread.ts`

Manages unread count per channel/DM, fires the postMessage on change.

### Panel Collapse State

The notes app parent sends a `postMessage` to the chat iframe whenever the sidebar collapse state changes:

```json
{ "type": "panel-state", "collapsed": true }
```

The iframe stores this value. When deciding whether to play sound, the iframe treats `collapsed === true` as equivalent to the tab being hidden — sound plays even if `document.hidden === false` while the panel is collapsed.

---

## Sound

- Audio file: `apps/chat/static/sounds/message.mp3`
- Played via **Web Audio API** (not `<audio>` element — avoids autoplay restrictions in some browsers)
- Triggered on new incoming message (not own messages) when either:
  - The browser tab is not active (`document.hidden === true`), or
  - The chat panel is collapsed in the notes app sidebar

### Reduced Motion

- Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- If reduced motion is preferred, suppress the sound notification

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

Clicking the notification focuses the browser tab/window and scrolls the chat to the relevant message.

---

## @Mention Priority

- A message is considered a priority mention if its `content` contains `@{currentUserDisplayName}`
- Priority mentions trigger a browser notification **even when `document.hidden === false`** (tab is visible)
- Priority mentions also bypass the "panel collapsed" check for sound — sound plays regardless

---

## Verification Checklist

- [ ] Unread count increments correctly as new messages arrive
- [ ] `last_read_at` cursor updates on scroll-to-bottom or focus
- [ ] Unread count clears when messages are read
- [ ] iframe postMessages `{ type: 'unread-count', count: N }` to parent window
- [ ] Notes app sidebar badge reflects current unread count
- [ ] Badge disappears when count reaches 0
- [ ] Sound plays when new message arrives and tab is not active
- [ ] Sound plays when new message arrives and panel is collapsed
- [ ] Sound does not play for own messages
- [ ] Sound is suppressed when `prefers-reduced-motion` is set
- [ ] Notes app parent sends `{ type: 'panel-state', collapsed: boolean }` to iframe on sidebar toggle; iframe uses it for sound decisions
- [ ] DM unread counts tracked via `conversation_id` in `chat_read_cursors`; included in aggregate sidebar badge
- [ ] Browser notification permission requested after user sends first message (not on load, not on receive)
- [ ] Browser notification fires when document is hidden
- [ ] @mention triggers browser notification even when document is visible
- [ ] Clicking browser notification focuses the tab and scrolls to message
