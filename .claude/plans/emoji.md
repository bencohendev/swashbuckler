# Emoji Support

**Status: Done**

## Overview

Replace Lucide icon grids with a full emoji picker (`emoji-picker-react`) for object types and spaces. The icon field is already `TEXT` and `TypeIcon.tsx` already detects and renders emojis, so this is primarily a UI change.

## Decisions

| Area | Decision |
|------|----------|
| Library | `emoji-picker-react` (searchable, categorized, skin tone support) |
| Scope | Object type icons + space icons |
| Default icon | New custom types default to `📄` |

## Implementation

### Shared emoji picker component
- `src/shared/components/EmojiPicker.tsx` — wraps `emoji-picker-react` in a Radix Popover
- Props: `value: string`, `onChange: (emoji: string) => void`, `children: ReactNode` (trigger)
- Respects dark mode via `Theme` prop from the library

### Object type form
- `src/features/object-types/components/ObjectTypeForm.tsx` — remove `ICON_OPTIONS` Lucide array, replace icon grid with `EmojiPicker`
- `src/features/object-types/components/TypeIcon.tsx` — no changes needed, already handles emojis via `isEmoji()` detection

### Space creation
- `src/features/sidebar/components/CreateSpaceDialog.tsx` — replace hardcoded 8-emoji grid with `EmojiPicker`

### No migration needed
- `icon` field on `object_types` and `spaces` is already `TEXT`

## Verification

- [x] `npm install emoji-picker-react` succeeds
- [x] Emoji picker opens in object type form and space dialog
- [ ] Selected emoji persists and renders correctly in sidebar
- [x] Dark mode renders correctly in picker
- [x] `npm run build` passes
