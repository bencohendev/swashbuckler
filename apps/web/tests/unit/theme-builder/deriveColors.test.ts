import { describe, it, expect } from 'vitest'
import { deriveAllColors } from '@/features/theme-builder/lib/deriveColors'
import type { ThemeCoreColors } from '@/features/theme-builder/types'

const lightCore: ThemeCoreColors = {
  background: '#ffffff',
  foreground: '#000000',
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#f59e0b',
  muted: '#f1f5f9',
  destructive: '#ef4444',
  border: '#e2e8f0',
}

const darkCore: ThemeCoreColors = {
  background: '#0f172a',
  foreground: '#f8fafc',
  primary: '#3b82f6',
  secondary: '#475569',
  accent: '#f59e0b',
  muted: '#1e293b',
  destructive: '#ef4444',
  border: '#334155',
}

describe('deriveAllColors', () => {
  describe('light theme', () => {
    const colors = deriveAllColors(lightCore, 'light')

    it('passes through core colors', () => {
      expect(colors.background).toBe(lightCore.background)
      expect(colors.foreground).toBe(lightCore.foreground)
      expect(colors.primary).toBe(lightCore.primary)
      expect(colors.destructive).toBe(lightCore.destructive)
    })

    it('derives auto-contrast foregrounds', () => {
      // Primary (#3b82f6) is relatively dark — expect white foreground
      expect(colors['primary-foreground']).toBe('#ffffff')
      // Destructive (#ef4444) — red, expect white
      expect(colors['destructive-foreground']).toBe('#ffffff')
    })

    it('darkens muted-foreground for light theme', () => {
      // Muted (#f1f5f9) darkened by 40 should produce a darker shade
      expect(colors['muted-foreground']).not.toBe(lightCore.muted)
    })

    it('sets card and popover to background for light', () => {
      expect(colors.card).toBe(lightCore.background)
      expect(colors.popover).toBe(lightCore.background)
    })

    it('sets card/popover foreground to foreground', () => {
      expect(colors['card-foreground']).toBe(lightCore.foreground)
      expect(colors['popover-foreground']).toBe(lightCore.foreground)
    })

    it('sets input to border', () => {
      expect(colors.input).toBe(lightCore.border)
    })

    it('derives ring from border (darkened)', () => {
      expect(colors.ring).not.toBe(lightCore.border)
    })

    it('derives sidebar colors', () => {
      expect(colors['sidebar-foreground']).toBe(lightCore.foreground)
      expect(colors['sidebar-primary']).toBe(lightCore.primary)
      expect(colors['sidebar-accent']).toBe(lightCore.accent)
      expect(colors['sidebar-border']).toBe(lightCore.border)
    })

    it('sets chart colors from primary/accent/destructive', () => {
      expect(colors['chart-1']).toBe(lightCore.primary)
      expect(colors['chart-3']).toBe(lightCore.accent)
      expect(colors['chart-5']).toBe(lightCore.destructive)
    })

    it('derives chart-2 and chart-4 as hue-shifted variants', () => {
      expect(colors['chart-2']).not.toBe(lightCore.primary)
      expect(colors['chart-4']).not.toBe(lightCore.accent)
    })
  })

  describe('dark theme', () => {
    const colors = deriveAllColors(darkCore, 'dark')

    it('lightens muted-foreground for dark theme', () => {
      expect(colors['muted-foreground']).not.toBe(darkCore.muted)
    })

    it('lightens card/popover for dark theme', () => {
      // Card should be slightly lighter than background
      expect(colors.card).not.toBe(darkCore.background)
    })

    it('lightens ring for dark theme', () => {
      expect(colors.ring).not.toBe(darkCore.border)
    })

    it('lightens sidebar for dark theme', () => {
      expect(colors.sidebar).not.toBe(darkCore.background)
    })
  })

  it('returns all expected keys', () => {
    const colors = deriveAllColors(lightCore, 'light')
    const expectedKeys = [
      'background', 'foreground', 'primary', 'secondary', 'accent',
      'muted', 'destructive', 'border',
      'primary-foreground', 'secondary-foreground', 'accent-foreground',
      'muted-foreground', 'destructive-foreground',
      'card', 'card-foreground', 'popover', 'popover-foreground',
      'input', 'ring',
      'sidebar', 'sidebar-foreground', 'sidebar-primary',
      'sidebar-primary-foreground', 'sidebar-accent',
      'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring',
      'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
    ]
    for (const key of expectedKeys) {
      expect(colors).toHaveProperty(key)
      expect(typeof (colors as unknown as Record<string, string>)[key]).toBe('string')
    }
  })
})
