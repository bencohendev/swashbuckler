'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { FieldBuilder } from './FieldBuilder'
import type { ObjectType, FieldDefinition, CreateObjectTypeInput, UpdateObjectTypeInput } from '@/shared/lib/data'

interface ObjectTypeFormProps {
  objectType?: ObjectType
  onSave: (input: CreateObjectTypeInput | UpdateObjectTypeInput) => Promise<void>
  onCancel: () => void
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ObjectTypeForm({ objectType, onSave, onCancel }: ObjectTypeFormProps) {
  const [name, setName] = useState(objectType?.name ?? '')
  const [pluralName, setPluralName] = useState(objectType?.plural_name ?? '')
  const [slug, setSlug] = useState(objectType?.slug ?? '')
  const [icon, setIcon] = useState(objectType?.icon ?? '📄')
  const [color, setColor] = useState(objectType?.color ?? '')
  const [fields, setFields] = useState<FieldDefinition[]>(objectType?.fields ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [pluralManuallyEdited, setPluralManuallyEdited] = useState(false)

  const isEditing = !!objectType

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugManuallyEdited && !isEditing) {
      setSlug(slugify(value))
    }
    if (!pluralManuallyEdited && !isEditing) {
      setPluralName(value ? value + 's' : '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)

    if (isEditing) {
      const updates: UpdateObjectTypeInput = {}
      if (name !== objectType.name) updates.name = name.trim()
      if (pluralName !== objectType.plural_name) updates.plural_name = pluralName.trim()
      if (slug !== objectType.slug) updates.slug = slug
      if (icon !== objectType.icon) updates.icon = icon
      if (color !== (objectType.color ?? '')) updates.color = color || null
      updates.fields = fields
      await onSave(updates)
    } else {
      await onSave({
        name: name.trim(),
        plural_name: pluralName.trim() || name.trim() + 's',
        slug: slug || slugify(name),
        icon,
        color: color || null,
        fields,
      })
    }

    setIsSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Task"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Plural</label>
          <input
            type="text"
            value={pluralName}
            onChange={(e) => {
              setPluralName(e.target.value)
              setPluralManuallyEdited(true)
            }}
            placeholder="e.g., Tasks"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugManuallyEdited(true)
            }}
            placeholder="auto-generated"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Icon</label>
        <EmojiPicker value={icon} onChange={setIcon}>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-lg border text-lg transition-colors hover:bg-muted"
          >
            {icon}
          </button>
        </EmojiPicker>
      </div>

      <div>
        <label className="block text-sm font-medium">Color (optional)</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={color || '#6b7280'}
            onChange={(e) => setColor(e.target.value)}
            className="size-8 cursor-pointer rounded border"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#6b7280"
            className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {color && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setColor('')}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <FieldBuilder fields={fields} onChange={setFields} />

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !name.trim()}>
          {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Type'}
        </Button>
      </div>
    </form>
  )
}
