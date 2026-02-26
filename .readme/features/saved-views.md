# Saved Views & Filters

**Status:** Active

## Summary

Let users save named views per type page — a combination of filters, sort order, and view mode (table/list/card/board) — and switch between them. Currently filters persist automatically in localStorage but there's no way to name, save, or switch between different filter configurations.

## Motivation

Power users work with the same type in different contexts (e.g., "Recent recipes", "Vegetarian only", "By cook time"). Saved views let them switch contexts without re-applying filters each time.

## Scope

- Save current filter + sort + view mode as a named view
- View selector dropdown on type pages to switch between saved views
- Edit and delete saved views
- One default view per type (applied on first visit)
- Storage: localStorage for guest mode, user-scoped for authenticated users
- Persist across sessions
