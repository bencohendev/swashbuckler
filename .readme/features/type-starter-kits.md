# Type Starter Kits

**Status:** Done

## Summary

Pre-built collections of types that users can import into a space as a group. Each kit is a curated set of types with fields designed for a specific use case — like roleplaying, recipe management, or note-taking.

## Motivation

New users face a blank canvas when creating a space. Starter kits give them a running start with well-designed type structures for common workflows, and show what's possible with custom types.

## Included Kits

### Note Taking (Productivity)
- **Note** — Tags (multi_select)
- **Meeting Notes** — Date, Attendees, Action Items, Status
- **Journal** — Date, Mood

### Recipes (Lifestyle)
- **Recipe** — Ingredients, Cook Time, Servings, Cuisine, Difficulty
- **Meal Plan** — Week Of (date)

### Roleplaying (Creative)
- **Character** — Race, Class, Level, Status
- **Location** — Region, Type, Discovered
- **Faction** — Alignment, Influence
- **Session Log** — Session Number, Date, Location
- **Item** — Type, Rarity, Attuned

## Entry Points

### Types Page
A "Starter Kits" button in the ObjectTypeManager toolbar opens a dialog showing all kits grouped by category. Each kit row is expandable to preview its types. Clicking "Import" creates the types, skipping any with conflicting slugs, and shows a toast with results.

### Create Space Dialog
A radio group offers three mutually exclusive options:
- **Start empty** (default)
- **Copy from existing space** — existing space dropdown + "Include templates" checkbox
- **Use a starter kit** — dropdown selector grouped by category

## Implementation

### Architecture
- Kit definitions are static TypeScript data in `src/features/starter-kits/data/kits.ts`
- Import logic in `src/features/starter-kits/lib/importKit.ts` handles type creation, slug conflict detection, template remapping, and event emission
- `useImportKit` hook wires the import function with `useDataClient()` and `useObjectTypes()`

### Conflict Handling
- Types are matched by slug — if a slug already exists in the target space, that type is skipped
- Templates are only created for types that were successfully imported (not skipped)
- Toast messages report both created and skipped types

### Both Storage Modes
Works identically for Supabase (authenticated) and Dexie (guest) modes — the import function operates through the `DataClient` interface.

## Files

- `src/features/starter-kits/data/kits.ts` — Kit interfaces and static data
- `src/features/starter-kits/lib/importKit.ts` — Import logic
- `src/features/starter-kits/hooks/useImportKit.ts` — React hook
- `src/features/starter-kits/components/StarterKitBrowser.tsx` — Dialog for types page
- `src/features/starter-kits/components/StarterKitSelector.tsx` — Dropdown for Create Space dialog
- Modified: `ObjectTypeManager.tsx`, `CreateSpaceDialog.tsx`, `SpaceProvider.tsx`
