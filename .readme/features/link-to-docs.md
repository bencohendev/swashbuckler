# Link to Docs from App

**Status:** Done

## Overview

Provides in-app access to the documentation site and a quick reference for keyboard shortcuts via a help button in the sidebar.

## Implementation

### Help Button

A small `HelpCircleIcon` button pinned to the bottom of the sidebar (inside the `<aside>`, after the scrollable content area). The button is icon-only and centered in the sidebar footer in all states (expanded, collapsed, mobile).

Clicking it opens a Radix `DropdownMenu` with two items:

1. **Documentation** (`BookOpenIcon`) — external link to `https://docs.swashbuckler.quest` (`target="_blank"`, `rel="noopener noreferrer"`)
2. **Keyboard shortcuts** (`KeyboardIcon`) — opens a `Dialog` with a shortcut reference

### Keyboard Shortcuts Dialog

Three sections:

| Section | Shortcut | Action |
|---------|----------|--------|
| General | `⌘ K` | Search |
| General | `⌘ E` | Quick capture |
| General | `⌘ \` | Toggle sidebar |
| Editor | `/` | Slash commands |
| Editor | `[[` | Link to object |
| Editor | `⌘ Enter` | Exit block |
| Markdown | `#` | Heading |
| Markdown | `>` | Quote |
| Markdown | `-` | Bullet list |
| Markdown | `1.` | Numbered list |
| Markdown | ` ``` ` | Code block |

### Sidebar Overflow Fix

Added `overflow-x-hidden` to the scrollable content wrapper to prevent a horizontal scrollbar caused by the `w-64` inner content div exceeding the sidebar boundary.

## Files

| File | Change |
|------|--------|
| `apps/web/src/features/sidebar/components/Sidebar.tsx` | Help button, shortcuts dialog, overflow fix |
