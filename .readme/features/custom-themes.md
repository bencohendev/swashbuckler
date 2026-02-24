# Custom Theme Builder

**Status:** Done

## Context

Users currently can only switch between Light, Dark, and System themes. This feature adds a theme builder where users create custom themes by picking 8 core colors, saving them with unique names, and switching between them. Default Light/Dark always remain available.

## Design Decisions

- **8 core color pickers**: background, foreground, primary, secondary, accent, muted, destructive, border
- **Auto-derived colors**: The remaining ~22 CSS variables (foregrounds, sidebar, charts, card, popover, etc.) are computed from the 8 core colors
- **Single variant per theme**: Each custom theme is either light-base or dark-base (user picks). This determines whether the `.dark` class is applied for Tailwind `dark:` variants
- **localStorage storage**: Works for both guest and authenticated users. Zustand store with localStorage persistence (same pattern as sidebar/viewMode stores)
- **CSS variable overrides**: Custom themes apply as inline styles on `document.documentElement`, layering on top of the defaults from `globals.css`
- **next-themes integration**: Keep next-themes for base class management. When custom theme is active, set next-themes to the theme's base ('light'/'dark'). When reverting to default, clear inline overrides and let next-themes resume control
- **FOUC prevention**: Inline `<script>` in layout.tsx reads pre-resolved colors from localStorage and applies them before React hydrates

## New Files

### Feature structure: `src/features/theme-builder/`

| File | Purpose |
|------|---------|
| `types.ts` | `CustomTheme`, `ThemeCoreColors`, `ThemeResolvedColors`, `ThemeBase` types |
| `stores/customTheme.ts` | Zustand store: CRUD themes, active theme ID, localStorage keys `swashbuckler:customThemes` and `swashbuckler:activeCustomTheme` |
| `lib/colorUtils.ts` | Pure helpers: `hexToRgb`, `rgbToHex`, `rgbToHsl`, `hslToRgb`, `lighten`, `darken`, `mix`, `contrastForeground`, `shiftHue` |
| `lib/deriveColors.ts` | `deriveAllColors(core, base)` maps 8 colors to all ~30 CSS variables |
| `lib/defaultThemeColors.ts` | Default light/dark core colors as hex (converted from globals.css OKLch values) for "Start from Light/Dark" buttons |
| `lib/themeScript.ts` | `getThemeScript()` inline JS string for FOUC prevention |
| `components/CustomThemeApplier.tsx` | Effect-only component: reads store, applies/removes CSS var overrides, syncs with next-themes |
| `components/AppearanceSettings.tsx` | Main page component for Settings > Appearance |
| `components/ThemeList.tsx` | Grid of saved themes + default Light/Dark cards |
| `components/ThemeCard.tsx` | Single theme card: color swatches, name, activate/edit/delete |
| `components/ThemeBuilder.tsx` | Builder UI: name input, base selector, 8 color pickers, live preview, save/cancel |
| `components/ColorPickerField.tsx` | Label + `<input type="color">` + hex text input |
| `components/ThemePreview.tsx` | Live preview panel showing sample UI elements with current colors |
| `index.ts` | Barrel exports |

### Route

| File | Purpose |
|------|---------|
| `src/app/(main)/settings/appearance/page.tsx` | Next.js route rendering `<AppearanceSettings />` |

## Modified Files

| File | Change |
|------|--------|
| `src/app/providers.tsx` | Add `<CustomThemeApplier />` inside `<ThemeProvider>` |
| `src/app/layout.tsx` | Add inline `<script dangerouslySetInnerHTML>` for FOUC prevention |
| `src/app/(main)/settings/page.tsx` | Add Appearance card (PaletteIcon) to settings grid |
| `src/shared/components/layout/Header.tsx` | Clear active custom theme when header theme toggle is clicked |

## Color Derivation Logic

From 8 core inputs, derive:

| Derived Variable | Source |
|-----------------|--------|
| `primary-foreground` | Auto-contrast (black/white) against primary |
| `secondary-foreground` | Auto-contrast against secondary |
| `accent-foreground` | Auto-contrast against accent |
| `muted-foreground` | Darken muted (light base) / lighten muted (dark base) |
| `card`, `popover` | Same as background (light) / slightly lighter background (dark) |
| `card-foreground`, `popover-foreground` | Same as foreground |
| `input` | Same as border |
| `ring` | Darkened/lightened border |
| `sidebar` | Slightly adjusted background |
| `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, etc. | Mirror main equivalents |
| `chart-1` through `chart-5` | Hue rotations from primary/accent/destructive |

## Implementation Order

### Phase 1 — Foundation
1. Create types (`types.ts`)
2. Create color utilities (`lib/colorUtils.ts`)
3. Create derivation logic (`lib/deriveColors.ts`)
4. Create default color objects (`lib/defaultThemeColors.ts`)
5. Create Zustand store (`stores/customTheme.ts`)

### Phase 2 — Theme Application
6. Create `CustomThemeApplier` component
7. Create FOUC script (`lib/themeScript.ts`)
8. Create barrel file (`index.ts`)
9. Modify `providers.tsx` to add `CustomThemeApplier`
10. Modify `layout.tsx` to add inline script

### Phase 3 — UI Components
11. `ColorPickerField`
12. `ThemePreview`
13. `ThemeBuilder`
14. `ThemeCard`
15. `ThemeList`
16. `AppearanceSettings`

### Phase 4 — Integration
17. Create route at `settings/appearance/page.tsx`
18. Add Appearance card to `settings/page.tsx`
19. Update Header.tsx theme toggle to clear custom theme
20. Update feature plans

## Verification

1. **Build**: `npm run build` passes with no errors
2. **Default themes**: Light/Dark/System toggle in header still works, cycling correctly
3. **Create theme**: Go to Settings > Appearance, click "New Theme", pick colors, enter name, save
4. **Live preview**: Colors update in real-time while building
5. **Activate theme**: Click a saved theme to apply it; all UI colors update
6. **Persistence**: Refresh the page; custom theme persists without flash
7. **Revert**: Click default Light or Dark to remove custom overrides
8. **Delete**: Delete a custom theme; if active, reverts to default
9. **Header toggle**: Clicking the header theme toggle while a custom theme is active clears it and resumes normal light/dark/system cycling
