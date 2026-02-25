# Apply Template to Existing Entry

**Status:** Done

## Overview

Users can apply an existing template to an entry retroactively via the "More Options" dropdown in the editor. This merges template content, properties, icon, and cover image into the current entry.

## UX Flow

1. Open an entry in the editor
2. Click "..." (More Options) → "Apply Template"
3. Dialog shows templates filtered to the entry's type
4. Select a template → choose content mode:
   - **Replace** — entry content is replaced with template content
   - **Keep existing below** — template content first, then existing content
5. Built-in template variables (date, time, user, space) are auto-resolved
6. Click "Apply" → content is merged, saved, editor remounts
7. Toast: "Template applied"

## Content Modes

| Mode | Behavior |
|------|----------|
| Replace | Existing content discarded; template content used |
| Keep existing below | Template content prepended before existing content |

## Property Merging

Template properties fill only empty fields on the existing entry. Existing values are never overwritten.

## Icon & Cover

Template icon and cover image are applied only if the entry has none.

## Edge Cases

- **No templates for type**: Empty state with guidance to save a template first
- **Entry has no content**: Both modes produce the same result (just template content)
- **Template has no content**: Only properties/icon/cover applied; content unchanged
- **Collaborative mode**: Action is disabled (would conflict with Yjs CRDT state)

## Key Files

| File | Role |
|------|------|
| `src/features/templates/components/ApplyTemplateDialog.tsx` | Two-step dialog (selection → options) |
| `src/features/templates/lib/applyTemplate.ts` | `applyTemplateContent()` and `mergeProperties()` utilities |
| `src/features/objects/components/ObjectEditor.tsx` | Menu item, handler, editor re-key |
| `src/features/templates/lib/applyTemplate.test.ts` | Unit tests for merge utilities |
