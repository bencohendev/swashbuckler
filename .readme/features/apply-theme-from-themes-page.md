# Apply Theme to Current Space (from Themes Page)

**Status:** Done

## Summary

Adds an "Activate" button to each custom theme card on the account-level `/settings/themes` management page, allowing users to apply a theme to their current space without navigating to the per-space Appearance page.

## Motivation

The account-level themes page (`/settings/themes`) let users create, edit, and delete themes but had no way to apply one — users had to navigate back to the per-space Appearance page. Adding an activate action removes that friction.

## Implementation

### `CustomThemeSettings` component
- Reads current space via `useCurrentSpace()` and space theme assignments via `useCustomThemeStore`
- Derives `activeThemeId` from the current space's assignment (if `type === 'custom'`)
- Passes `onActivate` callback to each `ThemeCard`, calling `setSpaceTheme(space.id, { type: 'custom', themeId: id })`
- `isActive` highlights the currently applied theme
- Activate button only shown when a current space is available

### Files changed
- `apps/web/src/features/theme-builder/components/CustomThemeSettings.tsx`
