import type { DataObjectSummary, FieldDefinition, Tag } from '@/shared/lib/data'

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export const DEFAULT_SORT: SortConfig = {
  field: 'updated_at',
  direction: 'desc',
}

function compareValues(a: unknown, b: unknown, fieldType?: string): number {
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1

  if (fieldType === 'number') {
    return (Number(a) || 0) - (Number(b) || 0)
  }

  if (fieldType === 'date') {
    return new Date(String(a)).getTime() - new Date(String(b)).getTime()
  }

  if (fieldType === 'checkbox') {
    return (a ? 1 : 0) - (b ? 1 : 0)
  }

  return String(a).localeCompare(String(b))
}

export function sortObjects(
  objects: DataObjectSummary[],
  sort: SortConfig,
  fields: FieldDefinition[],
  tagsByObject: Record<string, Tag[]>,
): DataObjectSummary[] {
  const fieldMap = new Map(fields.map((f) => [f.id, f]))

  return [...objects].sort((a, b) => {
    let cmp: number

    if (sort.field === 'title') {
      cmp = a.title.localeCompare(b.title)
    } else if (sort.field === 'tags') {
      const aTags = (tagsByObject[a.id] ?? []).map((t) => t.name).sort().join(', ')
      const bTags = (tagsByObject[b.id] ?? []).map((t) => t.name).sort().join(', ')
      if (!aTags && !bTags) cmp = 0
      else if (!aTags) cmp = 1
      else if (!bTags) cmp = -1
      else cmp = aTags.localeCompare(bTags)
    } else if (sort.field === 'updated_at') {
      cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    } else if (sort.field === 'created_at') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    } else {
      const field = fieldMap.get(sort.field)
      if (!field) return 0
      cmp = compareValues(
        a.properties?.[sort.field],
        b.properties?.[sort.field],
        field.type,
      )
    }

    return sort.direction === 'desc' ? -cmp : cmp
  })
}
