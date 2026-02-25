import type { DataObjectSummary, Tag } from '@/shared/lib/data'

export interface TypePageFilters {
  search: string
  selectFilters: Record<string, Set<string>>
  checkboxFilters: Record<string, boolean | undefined>
  tagFilter: Set<string>
  dateFilters: Record<string, { from?: string; to?: string }>
  numberFilters: Record<string, { min?: number; max?: number }>
  textFilters: Record<string, string>
}

export const EMPTY_FILTERS: TypePageFilters = {
  search: '',
  selectFilters: {},
  checkboxFilters: {},
  tagFilter: new Set(),
  dateFilters: {},
  numberFilters: {},
  textFilters: {},
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

  for (const range of Object.values(filters.dateFilters)) {
    if (range.from || range.to) return true
  }

  for (const range of Object.values(filters.numberFilters)) {
    if (range.min !== undefined || range.max !== undefined) return true
  }

  for (const val of Object.values(filters.textFilters)) {
    if (val.length > 0) return true
  }

  return false
}

export function filterObjects(
  objects: DataObjectSummary[],
  filters: TypePageFilters,
  tagsByObject: Record<string, Tag[]>,
): DataObjectSummary[] {
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

    // Date filters
    for (const [fieldId, range] of Object.entries(filters.dateFilters)) {
      if (!range.from && !range.to) continue
      const val = obj.properties?.[fieldId]
      if (val === undefined || val === null || val === '') {
        return false
      }
      const dateStr = String(val).slice(0, 10) // YYYY-MM-DD
      if (range.from && dateStr < range.from) return false
      if (range.to && dateStr > range.to) return false
    }

    // Number filters
    for (const [fieldId, range] of Object.entries(filters.numberFilters)) {
      if (range.min === undefined && range.max === undefined) continue
      const val = obj.properties?.[fieldId]
      if (val === undefined || val === null || val === '') {
        return false
      }
      const num = Number(val)
      if (isNaN(num)) return false
      if (range.min !== undefined && num < range.min) return false
      if (range.max !== undefined && num > range.max) return false
    }

    // Text filters (text + url)
    for (const [fieldId, filterQuery] of Object.entries(filters.textFilters)) {
      if (!filterQuery) continue
      const val = obj.properties?.[fieldId]
      if (val === undefined || val === null || val === '') {
        return false
      }
      if (!String(val).toLowerCase().includes(filterQuery.toLowerCase())) {
        return false
      }
    }

    return true
  })
}
