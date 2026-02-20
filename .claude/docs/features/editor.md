# Editor

**Status: Done**

## Overview

Rich block editor built on Plate.js (Slate.js) with slash commands, mentions, spoiler text, and auto-save.

## Decisions

| Area | Decision |
|------|----------|
| Framework | Plate.js (Slate.js) |
| Slash menu | `/` trigger with categorized blocks |
| Mention trigger | `@` (changed from `[[`) |
| Inline create | Via `/` menu + `@` "Create new" option |
| Spoiler | Click to reveal |
| Auto-save | Debounced (1000ms) |
| Code highlighting | Full stack (JS, TS, HTML, CSS, JSON, Python, SQL, Go, Rust) |
| Inline formatting | Bold, italic, code, link, strikethrough, underline, highlight, spoiler |

## Block Types

- Paragraph, Headings (H1-H3), Blockquote
- Bulleted list, Numbered list, Toggle list
- Code block (with syntax highlighting)
- Callout, Table, Image
- Link, Mention

## Implementation

- `src/features/editor/components/Editor.tsx` — Plate.js integration
- `src/features/editor/components/SlashMenu.tsx` — slash menu with block categories
- `src/features/editor/components/MentionInput.tsx` — mention with search and inline creation
- `src/features/editor/plugins/spoiler-plugin.tsx` — custom spoiler mark plugin
- `src/features/editor/hooks/useAutoSave.ts` — debounced auto-save
- `src/features/editor/components/elements/` — block element components (Image, CodeBlock, etc.)
- `src/features/editor/store.ts` — Zustand editor state

## Mention System

- Triggered by `@`
- Search results grouped by type
- "Create new" option opens CreateObjectModal
- Created entry auto-inserted as mention
- Mention IDs extracted on save to sync `object_relations`

## Auto-save

- Debounced save fires 1s after last keystroke (solo) / 3s after last Y.Doc update (collaborative)
- `save` callback is stabilized via refs + `useEditorStore.getState()` — never changes identity, preventing stale closures in unmount/debounce effects
- On unmount: pending debounce timer is cleared, then `isDirty` is read from store and a final save is flushed synchronously
- `beforeunload` handler prompts the user if dirty changes exist when closing the tab
- Collaborative mode uses the same ref pattern for `doSave` (`onSave`, `awareness`, `editor` in refs)
- `isDirty` tracked in both solo and collaborative modes for status indicators
- `markClean()` called on mount (SoloEditor) and after Y.Doc seeding (CollaborativeEditor) to clear false-positive dirty state from Plate initialization

## Verification

- [x] All block types render
- [x] Slash menu inserts blocks
- [x] Slash menu "Create New..." opens modal
- [x] @ mention shows grouped results
- [x] @ mention "Create new" opens modal
- [x] Created entry links inline
- [x] Spoiler hides text, click reveals
- [x] Auto-save after 1s idle
- [x] Image support
- [x] Navigate away mid-edit — changes saved on unmount
- [x] Close tab mid-edit — browser prompts "Leave site?"
