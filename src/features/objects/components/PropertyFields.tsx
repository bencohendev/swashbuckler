'use client'

import type { FieldDefinition } from '@/shared/lib/data'

interface PropertyFieldsProps {
  fields: FieldDefinition[]
  values: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
}

export function PropertyFields({ fields, values, onChange }: PropertyFieldsProps) {
  if (fields.length === 0) return null

  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4">
      {sortedFields.map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(value) => onChange(field.id, value)}
        />
      ))}
    </div>
  )
}

interface FieldInputProps {
  field: FieldDefinition
  value: unknown
  onChange: (value: unknown) => void
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const label = (
    <label className="block text-xs font-medium text-muted-foreground">
      {field.name}
      {field.required && <span className="text-destructive"> *</span>}
    </label>
  )

  switch (field.type) {
    case 'text':
      return (
        <div>
          {label}
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )

    case 'number':
      return (
        <div>
          {label}
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )

    case 'date':
      return (
        <div>
          {label}
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 rounded border"
          />
          <label className="text-sm">{field.name}</label>
        </div>
      )

    case 'select':
      return (
        <div>
          {label}
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )

    case 'multi_select': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div>
          {label}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {field.options?.map((option) => {
              const isSelected = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selected.filter(s => s !== option))
                    } else {
                      onChange([...selected, option])
                    }
                  }}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    case 'url':
      return (
        <div>
          {label}
          <input
            type="url"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )

    default:
      return null
  }
}
