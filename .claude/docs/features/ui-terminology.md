# UI Terminology Rename

**Status: Done**

## Overview

Renamed user-facing terminology from programmer jargon ("object", "Object Type") to friendlier terms ("entry", "Type"). Internal code (component names, TypeScript types, variable names, file names, database tables) remains unchanged.

## Terminology Map

| Concept | Old UI term | New UI term | Internal code (unchanged) |
|---------|------------|-------------|--------------------------|
| Instance | object / objects | entry / entries | `DataObject`, `SBObject`, `objects` table |
| Schema | Object Type / Object Types | Type / Types | `ObjectType`, `object_types` table |

## Scope

**Changed:** All user-visible strings in `.tsx` files — placeholders, empty states, labels, confirmations, screen-reader text, settings descriptions.

**Not changed:**
- TypeScript types, interfaces, variable names (`SBObject`, `ObjectType`, `DataObject`, etc.)
- Component names (`ObjectEditor`, `ObjectList`, `LinkedObjects`, etc.)
- File names and import paths
- Database table/column names (`objects`, `object_types`, `object_relations`, etc.)
- URL routes (`/objects/[id]`, `/settings/types`)
- Internal code comments (unless rendered to UI)

## Files Changed

| File | Changes |
|------|---------|
| `RecentObjects.tsx` | "No recent entries..." |
| `ObjectList.tsx` | Default empty message "No entries yet" |
| `PinnedObjects.tsx` | "No pinned entries yet. Pin entries for quick access." |
| `LinkedObjects.tsx` | "Search entries..." / "No entries found" |
| `GlobalSearchDialog.tsx` | "Search entries..." / "Entries" section header |
| `QuickCaptureDialog.tsx` | "No types available" / "New Type" action |
| `settings/page.tsx` | "Types" label, "Customize types and their properties" |
| `settings/types/page.tsx` | "Types" heading, description |
| `settings/templates/page.tsx` | "creating new entries" |
| `CreateTypeDialog.tsx` | "Define a new type with custom fields" |
| `ObjectTypeManager.tsx` | "Entries of this type will not be deleted..." |
| `SlashMenu.tsx` | "Create a new linked entry" |
| `ObjectEditor.tsx` | "Entry not found" / fallback type label "Entry" |
| `TypeSection.tsx` | "Type settings" / "Entries of this type..." in confirm |
| `ExclusionManager.tsx` | "Hide specific entries" |
| `GraphView.tsx` | "No entries to display" / "Create some entries..." |
| `TemplateList.tsx` | Fallback type label "Entry" |
| `TagPageView.tsx` | "removed from all entries" / "No entries with this tag" |
| `ObjectItem.tsx` | Fallback type label "Entry" |
| `ObjectEditorModal.tsx` | sr-only "Edit Entry" |
