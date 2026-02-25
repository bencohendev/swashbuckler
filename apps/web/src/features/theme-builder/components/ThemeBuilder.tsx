'use client'

import { useState, useMemo, useCallback } from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Label } from '@/shared/components/ui/Label'
import { Button } from '@/shared/components/ui/Button'
import { useCurrentSpace } from '@/shared/lib/data'
import { useCustomThemeStore } from '../stores/customTheme'
import { deriveAllColors } from '../lib/deriveColors'
import { DEFAULT_PRESETS } from '../lib/defaultThemeColors'
import { CORE_COLOR_KEYS, CORE_COLOR_LABELS } from '../types'
import type { ThemeCoreColors, ThemeBase, CustomTheme } from '../types'
import { ColorPickerField } from './ColorPickerField'
import { ThemePreview } from './ThemePreview'

interface ThemeBuilderProps {
  editingTheme?: CustomTheme | null
  onClose: () => void
}

export function ThemeBuilder({ editingTheme, onClose }: ThemeBuilderProps) {
  const addTheme = useCustomThemeStore(s => s.addTheme)
  const updateTheme = useCustomThemeStore(s => s.updateTheme)
  const setSpaceTheme = useCustomThemeStore(s => s.setSpaceTheme)
  const { space } = useCurrentSpace()
  const isEditing = !!editingTheme

  const [name, setName] = useState(editingTheme?.name ?? '')
  const [base, setBase] = useState<ThemeBase>(editingTheme?.base ?? 'light')
  const [colors, setColors] = useState<ThemeCoreColors>(
    editingTheme?.coreColors ?? DEFAULT_PRESETS[0].colors,
  )

  const resolvedColors = useMemo(
    () => deriveAllColors(colors, base),
    [colors, base],
  )

  const updateColor = useCallback((key: keyof ThemeCoreColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
  }, [])

  function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (isEditing && editingTheme) {
      updateTheme(editingTheme.id, trimmedName, base, colors)
    } else {
      const theme = addTheme(trimmedName, base, colors)
      if (space) {
        setSpaceTheme(space.id, { type: 'custom', themeId: theme.id })
      }
    }
    onClose()
  }

  return (
    <div className="space-y-6">
      {/* Name input */}
      <div className="space-y-1.5">
        <Label htmlFor="theme-name">Theme Name</Label>
        <Input
          id="theme-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Custom Theme"
          maxLength={50}
        />
      </div>

      {/* Base selector */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Base Variant</legend>
        <div className="flex gap-2">
          {(['light', 'dark'] as const).map(b => (
            <button
              key={b}
              type="button"
              onClick={() => setBase(b)}
              className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                base === b
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
              aria-pressed={base === b}
            >
              {b}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Preset buttons */}
      <div>
        <span className="mb-2 block text-sm font-medium">Start From</span>
        <div className="flex gap-2">
          {DEFAULT_PRESETS.map(preset => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => {
                setBase(preset.base)
                setColors(preset.colors)
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Color pickers + preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {CORE_COLOR_KEYS.map(key => (
            <ColorPickerField
              key={key}
              label={CORE_COLOR_LABELS[key]}
              value={colors[key]}
              onChange={hex => updateColor(key, hex)}
            />
          ))}
        </div>
        <ThemePreview resolvedColors={resolvedColors} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim()}>
          {isEditing ? 'Update Theme' : 'Save Theme'}
        </Button>
      </div>
    </div>
  )
}
