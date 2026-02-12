# Emoji Support

**Status: Done**

## Overview

Full emoji picker support across the app: types, spaces, and individual entries.

## Decisions

| Area | Decision |
|------|----------|
| Library | `emoji-picker-react` (searchable, categorized, skin tone support) |
| Scope | Type icons, space icons, and individual entry icons |
| Default icon | New custom types default to `📄` |
| Entry icons | Entries do NOT inherit type emoji — they have independent icons |

## Implementation

### Phase 1: Types & Spaces (done)

#### Shared emoji picker component
- [x] `src/shared/components/EmojiPicker.tsx` — wraps `emoji-picker-react` in a Radix Popover
- Props: `value: string`, `onChange: (emoji: string) => void`, `children: ReactNode` (trigger)
- Respects dark mode via `Theme` prop from the library

#### Object type form
- [x] `src/features/object-types/components/ObjectTypeForm.tsx` — remove `ICON_OPTIONS` Lucide array, replace icon grid with `EmojiPicker`
- `src/features/object-types/components/TypeIcon.tsx` — no changes needed, already handles emojis via `isEmoji()` detection

#### Space creation
- [x] `src/features/sidebar/components/CreateSpaceDialog.tsx` — replace hardcoded 8-emoji grid with `EmojiPicker`

### Phase 2: Entry instance emoji (done)

#### Object editor — add emoji picker to header
- [x] `src/features/objects/components/ObjectEditor.tsx`
- Clickable emoji button in header that opens the picker
- When icon is set: show emoji as trigger; when null: show a subtle add-emoji button
- On select: call `update({ icon: emoji })` to persist
- Only interactive when `canEdit` is true

#### Sidebar — remove type icon inheritance
- [x] `src/features/objects/components/ObjectItem.tsx`
- Remove fallback to `objectType.icon` in both compact and card views
- When `object.icon` is null, show generic `FileIcon`

### No migration needed
- `icon` field on `objects`, `object_types`, and `spaces` is already `TEXT`

## Verification

- [x] `npm install emoji-picker-react` succeeds
- [x] Emoji picker opens in type form and space dialog
- [x] Emoji picker opens in object editor header
- [x] Entries in sidebar show own emoji or generic icon (no type inheritance)
- [x] Selected emoji persists and renders correctly in sidebar
- [x] Dark mode renders correctly in picker
- [x] `npm run build` passes
