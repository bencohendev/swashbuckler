# Sci-Fi Theme (Cyberpunk / Neon)

**Status:** Done

## Overview

A built-in preset theme with a cyberpunk/neon aesthetic — dark navy backgrounds, neon cyan/magenta glows, grid overlays, scanline effects, and futuristic typography. Follows the exact same preset architecture established by the Fantasy theme. Includes both light (daytime cyberpunk) and dark (classic cyberpunk) variants.

## Architecture

Uses the same preset system as Fantasy:

- Entry in `THEME_PRESETS` array with `id: 'sci-fi'`, `icon: 'Zap'`
- `data-preset="sci-fi"` attribute on `<html>` activates decorative CSS rules
- All decorative styling scoped under `html[data-preset="sci-fi"]`
- FOUC script auto-includes new presets (iterates `THEME_PRESETS`)

## Key files

| File | Purpose |
|------|---------|
| `features/theme-builder/lib/presets.ts` | `scifiLightCore` + `scifiDarkCore` colors, `THEME_PRESETS` entry |
| `app/sci-fi.css` | Decorative CSS scoped under `html[data-preset="sci-fi"]` |
| `app/layout.tsx` | Orbitron + Share Tech Mono Google Fonts |
| `features/theme-builder/components/ThemeList.tsx` | `ZapIcon` in `PRESET_ICONS` map |
| `shared/components/layout/Header.tsx` | `ZapIcon` for sci-fi preset in header toggle |

## Color palettes

### Light (daytime cyberpunk)
- Background: `#e8edf5` (cool gray-blue)
- Foreground: `#0a0e27` (dark navy)
- Primary: `#0088cc` (electric blue)
- Secondary: `#dce3f0` (light steel)
- Accent: `#c0d0e8` (muted blue)
- Muted: `#d0d8e8` (pale blue-gray)
- Destructive: `#cc2255` (hot pink)
- Border: `#0099dd` (cyan-blue)

### Dark (classic cyberpunk)
- Background: `#060a18` (near-black navy)
- Foreground: `#d0f0ff` (bright ice)
- Primary: `#00ddff` (neon cyan)
- Secondary: `#0c1428` (dark navy)
- Accent: `#121e3a` (dark blue)
- Muted: `#0c1428` (dark navy)
- Destructive: `#ff2266` (neon pink)
- Border: `#1a3050` (steel blue)

## Decorative CSS features

- **Typography**: Orbitron (headings), Share Tech Mono (body) — futuristic fonts
- **Editor**: subtle grid overlay via repeating-linear-gradient, faint scanline effect
- **Sidebar**: circuit-board pattern with fine grid lines
- **Dialogs**: sharp corners (border-radius: 1px), neon border glow
- **Buttons**: neon glow box-shadow on hover/active, hard edges
- **Cards**: 1px border-radius, faint neon border glow
- **Header**: neon gradient border-image (cyan fading at edges)
- **Dividers**: gradient with centered hexagon symbol
- **Inputs**: sharp corners, 1px border
- **Scrollbar**: dark track with cyan thumb
- **Dark variant**: intensified glow effects, stronger scanlines
