import type { DataObject, Tag } from '@/shared/lib/data'

export interface TypePageFilters {
  search: string
  selectFilters: Record<string, Set<string>>
  checkboxFilters: Record<string, boolean | undefined>
  tagFilter: Set<string>
}

export const EMPTY_FILTERS: TypePageFilters = {
  search: '',
  selectFilters: {},
  checkboxFilters: {},
  tagFilter: new Set(),
}

export function isFiltered(filters: TypePageFilters): boolean {
  if (filters.search.trim() !== '') return true
  for (const set of Object.values(filters.selectFilters)) {
    if (set.size > 0) return true
  }
  for (const val of Object.values(filters.checkboxFilters)) {
    if (val !== undefined) return true
  }
  if (filters.tagFilter.size > 0) return true
  return false
}

export function filterObjects(
  objects: DataObject[],
  filters: TypePageFilters,
  tagsByObject: Record<string, Tag[]>,
): DataObject[] {
  if (!isFiltered(filters)) return objects

  const query = filters.search.trim().toLowerCase()

  return objects.filter((obj) => {
    // Title search
    if (query && !obj.title.toLowerCase().includes(query)) {
      return false
    }

    // Select / multi_select filters
    for (const [fieldId, selectedValues] of Object.entries(filters.selectFilters)) {
      if (selectedValues.size === 0) continue
      const value = obj.properties?.[fieldId]

      if (Array.isArray(value)) {
        // multi_select: at least one value must be in the selected set
        if (!value.some((v) => selectedValues.has(String(v)))) {
          return false
        }
      } else {
        // select: value must be in the selected set
        if (value == null || !selectedValues.has(String(value))) {
          return false
        }
      }
    }

    // Checkbox filters
    for (const [fieldId, expected] of Object.entries(filters.checkboxFilters)) {
      if (expected === undefined) continue
      const value = obj.properties?.[fieldId]
      if (Boolean(value) !== expected) {
        return false
      }
    }

    // Tag filter
    if (filters.tagFilter.size > 0) {
      const objTags = tagsByObject[obj.id]
      if (!objTags || !objTags.some((t) => filters.tagFilter.has(t.id))) {
        return false
      }
    }

    return true
  })
}
