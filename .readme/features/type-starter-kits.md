# Type Starter Kits

**Status:** Not started

## Summary

Pre-built collections of types that users can import into a space as a group. Each kit is a curated set of types with fields and (optionally) templates designed for a specific use case — like roleplaying, recipe management, or note-taking.

## Motivation

New users face a blank canvas when creating a space. Starter kits give them a running start with well-designed type structures for common workflows, and show what's possible with custom types.

## Scope

- Built-in starter kits shipped with the app (not user-created):
  - **Note Taking** — e.g., Note, Meeting Notes, Journal
  - **Recipes** — e.g., Recipe (ingredients, cook time, servings), Meal Plan
  - **Roleplaying** — e.g., Character, Location, Faction, Session Log, Item
  - More kits can be added over time
- Each kit defines types with fields and optional templates
- Import a kit into a space (copies types like duplicate-space-types does)
- Available during space creation and from space settings
- Works in both Supabase and Dexie modes
- Kits are defined in code (not stored in the database)
