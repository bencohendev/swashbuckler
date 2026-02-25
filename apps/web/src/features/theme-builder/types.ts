export type ThemeBase = 'light' | 'dark'

export interface ThemeCoreColors {
  background: string
  foreground: string
  primary: string
  secondary: string
  accent: string
  muted: string
  destructive: string
  border: string
}

export interface ThemeResolvedColors extends ThemeCoreColors {
  'primary-foreground': string
  'secondary-foreground': string
  'accent-foreground': string
  'muted-foreground': string
  'destructive-foreground': string
  card: string
  'card-foreground': string
  popover: string
  'popover-foreground': string
  input: string
  ring: string
  sidebar: string
  'sidebar-foreground': string
  'sidebar-primary': string
  'sidebar-primary-foreground': string
  'sidebar-accent': string
  'sidebar-accent-foreground': string
  'sidebar-border': string
  'sidebar-ring': string
  'chart-1': string
  'chart-2': string
  'chart-3': string
  'chart-4': string
  'chart-5': string
}

export interface CustomTheme {
  id: string
  name: string
  base: ThemeBase
  coreColors: ThemeCoreColors
  resolvedColors: ThemeResolvedColors
  createdAt: string
  updatedAt: string
}

export const CORE_COLOR_KEYS: (keyof ThemeCoreColors)[] = [
  'background',
  'foreground',
  'primary',
  'secondary',
  'accent',
  'muted',
  'destructive',
  'border',
]

export type SpaceThemeAssignment =
  | { type: 'default'; value: 'light' | 'dark' | 'system' }
  | { type: 'custom'; themeId: string }

export const CORE_COLOR_LABELS: Record<keyof ThemeCoreColors, string> = {
  background: 'Background',
  foreground: 'Foreground',
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  muted: 'Muted',
  destructive: 'Destructive',
  border: 'Border',
}
