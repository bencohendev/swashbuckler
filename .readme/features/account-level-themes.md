# Account-Level Custom Themes

**Status:** Not started

## Summary

Move custom theme creation and management from its current location to Account Settings. Themes are already stored at the account level, but the creation UI should live there too — making it clear that themes are a personal library applied per-space.

## Motivation

Custom themes are account-wide resources, but the current UI placement doesn't reflect that. Moving creation to Account Settings groups it with other account-level features (profile, export, global types) and simplifies the space settings page.

## Scope

- Theme builder (color pickers, preview) in Account Settings under a "Themes" section
- List of user's custom themes with edit and delete
- Space settings retains only theme *selection* (pick from defaults + user's custom themes)
- Migrate any existing per-space theme creation UI
