# Fantasy Theme

**Status:** Active

## Overview

A built-in preset theme that transforms the UI with a fantasy/medieval aesthetic — parchment textures, scroll-style modals, medieval typography, ornamental borders, embossed buttons, and wood-grain sidebar. Includes both light (classic parchment) and dark (aged/burned parchment) variants that follow the user's system preference or manual light/dark selection.

## Architecture

### Preset Themes concept

A preset is a static, built-in theme that provides **colors + decorative CSS**. Custom themes (user-created) remain color-only. This is the key architectural distinction.

- `SpaceThemeAssignment` union gains a `{ type: 'preset'; presetId: string }` variant
- `ThemePresetDefinition` interface: `id`, `label`, `icon`, `lightColors`, `darkColors`
- A `data-preset="fantasy"` attribute on `<html>` activates decorative CSS rules
- All decorative styling is pure CSS scoped under `html[data-preset="fantasy"]`
- Components use existing `data-slot` attributes for clean CSS targeting

### Theme toggle behavior

Presets behave like custom themes in the toggle cycle:
- Selected from the Appearance settings page (not the header toggle)
- Header toggle cycles: `light → dark → system → [last non-default] → light`
- When a preset is active, clicking toggle returns to light
- Preset shows `SwordsIcon` in the header toggle

### FOUC prevention

The inline FOUC script includes hardcoded preset palettes so colors apply before React hydrates. It detects dark mode via `matchMedia` and sets both CSS variables and the `data-preset` attribute.

## Key files

| File | Purpose |
|------|---------|
| `features/theme-builder/types.ts` | `SpaceThemeAssignment` preset variant, `ThemePresetDefinition` |
| `features/theme-builder/lib/presets.ts` | `THEME_PRESETS` array, `getPreset()` helper, color definitions |
| `app/fantasy.css` | All decorative CSS scoped under `html[data-preset="fantasy"]` |
| `app/layout.tsx` | Cinzel + Lora Google Fonts via CSS variables |
| `features/theme-builder/components/CustomThemeApplier.tsx` | Preset branch: apply colors + `data-preset` attribute |
| `features/theme-builder/lib/themeScript.ts` | FOUC script with inline preset palettes |
| `shared/components/layout/Header.tsx` | SwordsIcon + preset in toggle cycle |
| `features/theme-builder/components/ThemeList.tsx` | Preset Themes section in Appearance settings |
| `features/theme-builder/stores/customTheme.ts` | Store remembers presets when switching away |

## Fantasy color palettes

### Light (classic parchment)
- Background: warm cream `#f4e4c1`
- Foreground: dark brown `#2c1810`
- Primary: deep crimson `#8b1a1a`
- Border: gold `#c9a96e`
- Sidebar: warm tan accent

### Dark (aged/burned parchment)
- Background: very dark brown `#1a120b`
- Foreground: warm cream `#e8d5a3`
- Primary: gold `#c9a96e`
- Border: dark gold `#4a3520`

## Decorative CSS features

- **Typography**: Cinzel (headings), Lora (body) — medieval serif fonts
- **Editor parchment**: layered radial-gradient noise, aged-edge inset shadow
- **Sidebar wood grain**: subtle repeating-linear-gradient lines
- **Dialog scrolls**: reduced border-radius, thicker borders, ornamental pseudo-elements
- **Buttons embossed**: inset box-shadow highlight + drop shadow, text-shadow
- **Cards**: reduced border-radius, thicker border, inset shadow
- **Header**: ornamental gradient border-image (fades at edges)
- **Dividers**: gradient border with centered diamond fleuron (◆)
- **Scrollbar**: themed track/thumb colors
- **Dark variant**: adjusted gradients/opacities for burned parchment feel
