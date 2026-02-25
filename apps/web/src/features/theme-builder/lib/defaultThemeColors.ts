import type { ThemeCoreColors, ThemeBase } from '../types'

export interface DefaultThemePreset {
  label: string
  base: ThemeBase
  colors: ThemeCoreColors
}

// Hex approximations of the OKLCH values in globals.css :root
export const DEFAULT_LIGHT_COLORS: ThemeCoreColors = {
  background: '#ffffff',
  foreground: '#171717',
  primary: '#262626',
  secondary: '#f5f5f5',
  accent: '#f5f5f5',
  muted: '#f5f5f5',
  destructive: '#dc2626',
  border: '#e5e5e5',
}

// Hex approximations of the OKLCH values in globals.css .dark
// Note: dark border oklch(1 0 0 / 10%) pre-composited against dark bg as opaque hex
export const DEFAULT_DARK_COLORS: ThemeCoreColors = {
  background: '#171717',
  foreground: '#fafafa',
  primary: '#e5e5e5',
  secondary: '#3b3b3b',
  accent: '#3b3b3b',
  muted: '#3b3b3b',
  destructive: '#f87171',
  border: '#2b2b2b',
}

export const DEFAULT_PRESETS: DefaultThemePreset[] = [
  { label: 'Start from Light', base: 'light', colors: DEFAULT_LIGHT_COLORS },
  { label: 'Start from Dark', base: 'dark', colors: DEFAULT_DARK_COLORS },
]
