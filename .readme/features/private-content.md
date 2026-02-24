# Private Content

**Status:** Done

## Overview

Entry owners can hide specific content _within_ an entry from shared users using two complementary mechanisms: a **private block** (container element) and a **private inline mark** (text-level). Both are completely invisible to shared users.

## Security Model

Visual hiding only. Content remains in the document tree (accessible via devtools) but is invisible in the UI — shared users have no indication it exists. This is a deliberate tradeoff to keep Yjs CRDT collaboration working without pipeline changes.

**Hiding strategy by user type:**
- **View-only shared users**: Private content is stripped from the value tree before it reaches the editor
- **Edit-permission shared users (Yjs active)**: Content stays in the Yjs tree but renders as `display: none` + `contentEditable={false}`

## Usage

| Method | How |
|--------|-----|
| Private block | `/private` slash command (owner only) |
| Private inline mark | Select text + `Cmd+Shift+P`, or wrap with `\|\|\|text\|\|\|` autoformat |

## Implementation

| File | Purpose |
|------|---------|
| `src/features/editor/plugins/private-plugin.tsx` | `PrivateBlockPlugin` (element) + `PrivateMarkPlugin` (leaf) |
| `src/features/editor/lib/stripPrivateContent.ts` | Pure function to remove private nodes from value tree |
| `src/features/editor/components/Editor.tsx` | `EditorModeContext` extended with `isOwner` |
| `src/features/editor/lib/plate-config.ts` | Plugin registration + `\|\|\|` autoformat rule |
| `src/features/editor/components/elements/SlashInput.tsx` | `/private` slash command (owner-only) |
| `src/features/objects/components/ObjectEditor.tsx` | Content stripping for view-only non-owners |

## Owner Rendering

- **Block**: Dashed purple border container with `EyeOff` icon + "Private" label
- **Inline mark**: Subtle dashed purple border + light purple background

## Non-owner Rendering

- **View-only**: `stripPrivateContent()` removes nodes before editor receives them
- **Edit-permission (collab)**: `hidden` class + `contentEditable={false}` wrapper — invisible and non-interactive

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Non-owner cursor near hidden block (collab) | `contentEditable={false}` + `display: none` prevents cursor entry |
| Non-owner selects across hidden inline mark | Hidden span has no layout; selection jumps over it |
| Owner copy/pastes private content | Private marks/blocks persist in the new location |
| Non-owner copy/pastes near hidden content | Hidden content excluded from clipboard |
| Private block contains mentions, images, etc. | Entire subtree hidden; `stripPrivateContent` removes the whole block |
| Autoformat `\|\|\|` vs `\|\|` (spoiler) conflict | `\|\|\|` rule placed before `\|\|` in config |
