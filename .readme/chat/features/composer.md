# Composer

**Status:** Not started
**Parent spec:** [Chat v1](chat-v1.md)

---

## Overview

The message composer handles text input, markdown preview, @mention autocomplete, spoiler tag syntax, and in-place message editing. It is the primary input surface for the chat app.

---

## Composer UI

**Component:** `apps/chat/src/lib/components/Composer.svelte`

- Plain `<textarea>` for input
- Toggle button switches between **edit** mode (raw markdown) and **preview** mode (rendered output)
- Submit button sends the message; keyboard shortcut also triggers submit
- Send button is **disabled** when the composer is blank or whitespace-only; `Enter` is a no-op in the same state

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | Insert newline |
| `Escape` | Cancel edit (when editing an existing message) |
| `ArrowUp` (on empty composer) | Open edit mode for most recent own message |

---

## Markdown Rendering

**Libraries:** `marked.js` + `DOMPurify`

Rendered markdown displayed in message list via `MessageItem.svelte`. Preview mode in composer renders the same output before sending.

**XSS prevention is mandatory.** marked.js v5+ removed its built-in `sanitize` option. Rendering `marked.parse(content)` alone is a direct XSS vector — `<script>alert(1)</script>` and `<img onerror=.../>` pass through unchanged. Every render path **must** use:

```ts
DOMPurify.sanitize(marked.parse(content))
```

Both steps in that order, always. No exceptions for "trusted" content.

### Supported Syntax

| Syntax | Output |
|--------|--------|
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `` `code` `` | Inline code |
| ```` ```block``` ```` | Code block |
| `[text](url)` | Hyperlink |
| `- item` | Unordered list |
| `1. item` | Ordered list |
| `> quote` | Blockquote |

Raw HTML is stripped by DOMPurify after marked.js parsing.

Pasting a bare URL inserts it as plain text — no auto-formatting and no link unfurl in Phase 1.

---

## @Mentions

### Trigger Behavior

- Typing `@` opens an autocomplete popover
- Popover filters space member roster in real time as user continues typing
- Arrow keys navigate, `Enter` or click selects
- `Escape` dismisses without inserting

### Autocomplete Data

- Source: space member roster fetched from `space_shares` for the current space (`workspace_shares` was dropped in migration 011)
- Display: avatar + display name
- Filter: case-insensitive prefix match on display name

### Storage

Mention stored as plain text in message content (e.g., `@username`). The notification system reads mention text to trigger priority alerts — no separate mention table required for Phase 1.

---

## Spoiler Tags

- **Syntax:** `||hidden text||`
- **Rendering:** Displays as a blurred/hidden span with a click-to-reveal toggle
- CSS class `spoiler` applied to the span; `spoiler--revealed` toggled on click
- Spoiler state is per-client and per-session (not persisted)

---

## Draft Persistence

- Typing in the composer saves the draft to `localStorage`, keyed by channel/conversation ID
- Draft is restored when the user returns to that channel on page load
- Draft is cleared from `localStorage` on successful send

---

## Character Limit

- Maximum message length: **4000 characters**
- A character counter (e.g., `3847/4000`) appears when the user is within 200 characters of the limit
- Counter text turns red when 0 characters remain
- Send button is disabled and `Enter` is a no-op when the character limit is reached

---

## Message Editing

- Edit action available only on the current user's own messages (via message context menu or `ArrowUp` shortcut)
- Clicking edit saves the current draft to `localStorage`, then loads existing message content into the composer
- Saving submits a `PATCH` to update `chat_messages.content` and sets `is_edited = true`
- An "(edited)" marker is shown after the message timestamp
- Cancel restores the in-progress draft that was active before edit mode opened (not an empty state) — the draft is read back from `localStorage`

### Edit Constraints

- Only the original author can edit
- Dice roll messages (`type = 'dice'`) are not editable
- System messages (`type = 'system'`) are not editable

---

## Accessibility

- `<textarea>` has an `aria-label` ("Message composer") and `aria-multiline="true"`
- Autocomplete popover uses `role="listbox"` with `role="option"` items
- Active autocomplete option reflected via `aria-activedescendant`
- Preview toggle button has `aria-pressed` reflecting current mode
- Focus returns to composer after selecting a mention or dismissing the popover

---

## Open Issues

- **Spoiler tag syntax is not built into marked.js** — `||hidden text||` is not standard markdown. marked.js has no built-in support for it. Needs either a custom marked.js extension or a pre/post-processing step (regex replace before `marked.parse`, then DOMPurify). Implementation path must be decided before building.

All other issues resolved:
- **XSS** — resolved: mandatory `DOMPurify.sanitize(marked.parse(content))` pattern documented above
- **`workspace_shares`** — resolved: confirmed table is `space_shares`
- **Draft + cancel ambiguity** — resolved: cancel restores the pre-edit draft from `localStorage`

## Verification Checklist

- [ ] Enter sends message; Shift+Enter inserts newline
- [ ] Send button disabled and Enter is no-op when composer is blank or whitespace-only
- [ ] Pasting a bare URL inserts plain text (no auto-formatting)
- [ ] Draft persists in localStorage keyed by channel/conversation ID; restored on page load; cleared on send
- [ ] Character counter appears within 200 chars of limit; turns red at 0; send blocked at limit
- [ ] Markdown preview toggle renders correctly before sending; output passes through `DOMPurify.sanitize(marked.parse(content))`
- [ ] `<script>alert(1)</script>` in message content is stripped and not executed
- [ ] `@` triggers autocomplete filtered to space members
- [ ] Selecting a mention inserts it into the composer
- [ ] `||spoiler||` renders as hidden text, revealed on click
- [ ] Edit action loads message content into composer
- [ ] Saving edit updates message and shows "(edited)" marker
- [ ] Cancel edit restores the draft that was active before edit mode opened (not an empty state)
- [ ] ArrowUp on empty composer opens edit for last own message
- [ ] Escape closes autocomplete without inserting
- [ ] Dice and system messages have no edit action
- [ ] Accessible: ARIA roles on autocomplete, focus management, keyboard navigation
