import type { ThemeCoreColors, ThemeResolvedColors, ThemeBase } from '../types'
import { contrastForeground, lighten, darken, shiftHue } from './colorUtils'

export function deriveAllColors(
  core: ThemeCoreColors,
  base: ThemeBase,
): ThemeResolvedColors {
  const isLight = base === 'light'

  return {
    // Core colors (pass through)
    ...core,

    // Auto-contrast foregrounds
    'primary-foreground': contrastForeground(core.primary),
    'secondary-foreground': contrastForeground(core.secondary),
    'accent-foreground': contrastForeground(core.accent),
    'destructive-foreground': '#ffffff',

    // Muted foreground: darken for light, lighten for dark
    'muted-foreground': isLight
      ? darken(core.muted, 40)
      : lighten(core.muted, 40),

    // Card / popover
    card: isLight ? core.background : lighten(core.background, 5),
    'card-foreground': core.foreground,
    popover: isLight ? core.background : lighten(core.background, 5),
    'popover-foreground': core.foreground,

    // Input / ring
    input: core.border,
    ring: isLight ? darken(core.border, 15) : lighten(core.border, 15),

    // Sidebar
    sidebar: isLight ? darken(core.background, 2) : lighten(core.background, 5),
    'sidebar-foreground': core.foreground,
    'sidebar-primary': core.primary,
    'sidebar-primary-foreground': contrastForeground(core.primary),
    'sidebar-accent': core.accent,
    'sidebar-accent-foreground': contrastForeground(core.accent),
    'sidebar-border': core.border,
    'sidebar-ring': isLight ? darken(core.border, 15) : lighten(core.border, 15),

    // Chart colors: hue rotations from primary/accent/destructive
    'chart-1': core.primary,
    'chart-2': shiftHue(core.primary, 120),
    'chart-3': core.accent,
    'chart-4': shiftHue(core.accent, 60),
    'chart-5': core.destructive,
  }
}
