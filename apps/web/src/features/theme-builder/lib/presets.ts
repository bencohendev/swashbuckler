import type { ThemeCoreColors, ThemePresetDefinition } from '../types'
import { deriveAllColors } from './deriveColors'

const fantasyLightCore: ThemeCoreColors = {
  background: '#f4e4c1',
  foreground: '#2c1810',
  primary: '#8b1a1a',
  secondary: '#ecdcc3',
  accent: '#d4b896',
  muted: '#e8d5b8',
  destructive: '#a02020',
  border: '#c9a96e',
}

const fantasyDarkCore: ThemeCoreColors = {
  background: '#1a120b',
  foreground: '#e8d5a3',
  primary: '#c9a96e',
  secondary: '#2a1e14',
  accent: '#3a2a1a',
  muted: '#2a1e14',
  destructive: '#d44040',
  border: '#4a3520',
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'fantasy',
    label: 'Fantasy',
    icon: 'Swords',
    lightColors: deriveAllColors(fantasyLightCore, 'light'),
    darkColors: deriveAllColors(fantasyDarkCore, 'dark'),
  },
]

export function getPreset(id: string): ThemePresetDefinition | undefined {
  return THEME_PRESETS.find(p => p.id === id)
}
