'use client'

import { STARTER_KITS } from '../data/kits'

interface StarterKitSelectorProps {
  value: string
  onChange: (kitId: string) => void
}

export function StarterKitSelector({ value, onChange }: StarterKitSelectorProps) {
  const categories = new Map<string, typeof STARTER_KITS>()
  for (const kit of STARTER_KITS) {
    const existing = categories.get(kit.category)
    if (existing) {
      existing.push(kit)
    } else {
      categories.set(kit.category, [kit])
    }
  }

  return (
    <select
      id="starter-kit"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
      aria-label="Choose a starter kit"
    >
      <option value="">Select a kit…</option>
      {Array.from(categories.entries()).map(([category, kits]) => (
        <optgroup key={category} label={category}>
          {kits.map((kit) => (
            <option key={kit.id} value={kit.id}>
              {kit.icon} {kit.name} ({kit.types.length} types)
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
