# Account-Level Custom Themes

**Status:** Done

## Summary

Custom theme creation and management lives on a dedicated `/settings/themes` page, linked from the settings hub under the Account section. The per-space Appearance page is simplified to theme selection only.

## Motivation

Custom themes are account-wide resources, but the original UI placement on the per-space Appearance page conflated theme *management* with theme *selection*. A standalone page under Account settings makes the model clearer.

## Implementation

### `/settings/themes` page
- `CustomThemeSettings` component in `features/theme-builder/components/`
- Full theme builder (create/edit) with `autoAssignSpace={false}` — creating a theme here does not auto-assign it to any space
- Theme list with edit/delete via `ThemeCard` (compact color swatches)
- Settings hub shows a "Custom Themes" card under the Account section

### Appearance page (selection only)
- `ThemeList` renders in `selectionOnly` mode — default themes + custom themes with activate-only controls
- Custom theme cards show the full `ThemePreview` (sidebar, heading, buttons, card, chart swatches) instead of color palette strips
- "Manage custom themes" link points to `/settings/themes`

### Other changes
- `ThemeBuilder` accepts optional `autoAssignSpace` prop (default `true` for backward compat)
- `ThemeCard` has optional `onActivate`/`onEdit`/`onDelete` — buttons hidden when omitted
- `ThemeCard` accepts `showPreview` prop to render `ThemePreview` instead of color swatches
- Removed redundant light/dark/system theme toggle from Account Settings `PreferencesSection`
