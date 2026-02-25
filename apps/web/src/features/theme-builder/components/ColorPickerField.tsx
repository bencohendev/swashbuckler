'use client'

import { useId } from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Label } from '@/shared/components/ui/Label'

interface ColorPickerFieldProps {
  label: string
  value: string
  onChange: (hex: string) => void
}

export function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  const id = useId()

  function handleTextChange(text: string) {
    const normalized = text.startsWith('#') ? text : `#${text}`
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      onChange(normalized.toLowerCase())
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-text`}>{label}</Label>
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-picker`} className="sr-only">
          {label} color picker
        </label>
        <input
          id={`${id}-picker`}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input p-1"
        />
        <Input
          id={`${id}-text`}
          type="text"
          value={value}
          onChange={e => handleTextChange(e.target.value)}
          maxLength={7}
          className="font-mono"
        />
      </div>
    </div>
  )
}
