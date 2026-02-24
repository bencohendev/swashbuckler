# Duplicate Space Types

**Status:** Done

## Summary

Duplicate all types from an existing space into a new space. When creating a new space, users can select a source space to copy its type definitions (name, slug, icon, color, fields, sort order) into the new space with new UUIDs. Optionally copies templates (with remapped type IDs) via an "Include templates" checkbox.

## Scope

- **Space creation only** — no standalone import action
- Types are deep-copied (name, plural_name, slug, icon, color, fields with new UUIDs, sort_order)
- Templates optionally copied via checkbox (default unchecked)
- No entries are copied
- Works in both authenticated (Supabase) and guest (Dexie) modes

## Implementation

- `CreateSpaceDialog` shows a "Copy types from" select dropdown listing owned spaces, plus an "Include templates" checkbox when a source is selected
- `SpaceSwitcher` passes owned spaces to the dialog and forwards the new fields
- `SpaceProvider.create` handles duplication: creates source/target data clients, copies types with new field UUIDs, optionally copies templates with remapped type IDs
- Partial failure is tolerated — the space still exists with whatever types were successfully created
