import type { DataObject } from '@/shared/lib/data'

export interface GroupedColumn {
  value: string | null
  label: string
  objects: DataObject[]
}

export function groupObjectsByField(
  objects: DataObject[],
  fieldId: string,
  options: string[]
): GroupedColumn[] {
  const buckets = new Map<string | null, DataObject[]>()

  // Initialize a bucket for each option + uncategorized
  for (const opt of options) {
    buckets.set(opt, [])
  }
  buckets.set(null, [])

  for (const obj of objects) {
    const raw = obj.properties[fieldId]
    const value = typeof raw === 'string' && options.includes(raw) ? raw : null
    buckets.get(value)!.push(obj)
  }

  const columns: GroupedColumn[] = options.map((opt) => ({
    value: opt,
    label: opt,
    objects: buckets.get(opt)!,
  }))

  columns.push({
    value: null,
    label: 'Uncategorized',
    objects: buckets.get(null)!,
  })

  return columns
}
