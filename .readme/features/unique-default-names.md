# Unique Default Names

**Status: Not started**

## Overview

New entries should receive unique default titles with an incrementing number (e.g., "Untitled Page", "Untitled Page 2", "Untitled Page 3") instead of creating duplicates with identical names.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Numbering style | "Untitled Page", "Untitled Page 2", "Untitled Page 3" | First entry has no number for cleanliness; subsequent entries increment from 2 |
| Scope of uniqueness | Per type within the current space | Avoids cross-type/cross-space collisions; matches how users think about entries |
| Where to resolve | At call sites (UI components) | Keeps data layer simple; name generation is a UI concern |
| Deleted entries | Excluded from count | Avoids confusing gaps in numbering |

## Implementation

Four call sites currently hardcode `Untitled ${typeName}`:

| File | Context |
|------|---------|
| `src/features/objects/components/CreateObjectButton.tsx` | "Create" button |
| `src/features/quick-capture/components/QuickCaptureDialog.tsx` | Quick capture dialog |
| `src/features/sidebar/components/Sidebar.tsx` | Sidebar new-entry action |
| `src/features/editor/components/elements/SlashInput.tsx` | Slash menu inline creation |

Approach: extract a shared helper (e.g., `getNextUntitledName(typeName, existingTitles)`) that all four sites call, using the current object list to determine the next available number.

## Verification

- [ ] First entry of a type is titled "Untitled {Type}" (no number)
- [ ] Second entry of the same type is titled "Untitled {Type} 2"
- [ ] Numbering increments correctly with many entries
- [ ] Deleting an earlier entry does not affect new entry numbering (no gap-filling)
- [ ] Different types maintain independent counters
- [ ] Different spaces maintain independent counters
- [ ] Works in both local (Dexie) and Supabase storage modes
