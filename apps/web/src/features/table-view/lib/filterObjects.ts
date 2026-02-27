import type { DataObjectSummary, Tag, ObjectRelation } from '@/shared/lib/data'
import { type FilterExpression, type FilterCondition, hasActiveFilters } from './filterTypes'

export { type FilterExpression, EMPTY_EXPRESSION, hasActiveFilters } from './filterTypes'

export interface FilterContext {
  tagsByObject: Record<string, Tag[]>
  relationsByObject: Record<string, ObjectRelation[]>
  objectTypeByObjectId: Record<string, string>
  contentTextByObject: Record<string, string>
}

export function filterObjects(
  objects: DataObjectSummary[],
  expression: FilterExpression,
  ctx: FilterContext,
): DataObjectSummary[] {
  if (!hasActiveFilters(expression)) return objects

  const query = expression.search.trim().toLowerCase()

  const hasContentData = Object.keys(ctx.contentTextByObject).length > 0

  return objects.filter((obj) => {
    // Search applies globally (AND with groups) — matches title or content
    if (query) {
      const titleMatch = obj.title.toLowerCase().includes(query)
      const contentMatch = hasContentData && (ctx.contentTextByObject[obj.id] ?? '').toLowerCase().includes(query)
      if (!titleMatch && !contentMatch) return false
    }

    // If no groups, search-only filter
    if (expression.groups.length === 0) return true

    // DNF: OR across groups, AND within each group
    return expression.groups.some((group) =>
      group.conditions.every((cond) => evaluateCondition(obj, cond, ctx)),
    )
  })
}

function evaluateCondition(
  obj: DataObjectSummary,
  cond: FilterCondition,
  ctx: FilterContext,
): boolean {
  const { target, operator } = cond

  switch (target.kind) {
    case 'title':
      return evaluateText(obj.title, operator, cond.value)

    case 'system': {
      const dateStr = obj[target.field]
      return evaluateDate(dateStr, operator, cond.value, cond.value2)
    }

    case 'tag':
      return evaluateTag(obj.id, operator, cond.value, ctx.tagsByObject)

    case 'relation':
      return evaluateRelation(
        obj.id,
        operator,
        cond.value,
        ctx.relationsByObject,
        ctx.objectTypeByObjectId,
      )

    case 'content':
      return evaluateText(ctx.contentTextByObject[obj.id] ?? '', operator, cond.value)

    case 'property': {
      const raw = obj.properties?.[target.fieldId]
      return evaluatePropertyValue(raw, operator, cond.value, cond.value2)
    }
  }
}

function evaluatePropertyValue(
  raw: unknown,
  operator: string,
  value: unknown,
  value2: unknown,
): boolean {
  // Handle is_empty / is_not_empty universally
  if (operator === 'is_empty') return isEmpty(raw)
  if (operator === 'is_not_empty') return !isEmpty(raw)

  // Checkbox operators
  if (operator === 'is_checked') return Boolean(raw) === true
  if (operator === 'is_not_checked') return Boolean(raw) === false

  // Select operators
  if (operator === 'is') return String(raw ?? '') === String(value ?? '')
  if (operator === 'is_not') return String(raw ?? '') !== String(value ?? '')

  // Multi-select operators (array values)
  if (operator === 'contains' && Array.isArray(raw)) {
    return raw.some((v) => String(v) === String(value ?? ''))
  }
  if (operator === 'does_not_contain' && Array.isArray(raw)) {
    return !raw.some((v) => String(v) === String(value ?? ''))
  }

  // Number operators
  if (isNumberOperator(operator)) {
    return evaluateNumber(raw, operator, value)
  }

  // Date operators for property fields
  if (isDateLikeOperator(operator)) {
    const dateStr = raw == null ? '' : String(raw)
    return evaluateDate(dateStr, operator, value, value2)
  }

  // Text operators (non-array values)
  return evaluateText(raw == null ? '' : String(raw), operator, value)
}

function evaluateText(raw: string | null | undefined, operator: string, value: unknown): boolean {
  if (operator === 'is_empty') return isEmpty(raw)
  if (operator === 'is_not_empty') return !isEmpty(raw)

  const strVal = (raw ?? '').toLowerCase()
  const filterVal = String(value ?? '').toLowerCase()

  switch (operator) {
    case 'contains':
      return strVal.includes(filterVal)
    case 'does_not_contain':
      return !strVal.includes(filterVal)
    case 'equals':
      return strVal === filterVal
    case 'not_equals':
      return strVal !== filterVal
    case 'starts_with':
      return strVal.startsWith(filterVal)
    case 'ends_with':
      return strVal.endsWith(filterVal)
    default:
      return true
  }
}

function evaluateNumber(raw: unknown, operator: string, value: unknown): boolean {
  if (raw == null || raw === '') return false
  const num = Number(raw)
  if (isNaN(num)) return false
  const cmp = Number(value)
  if (isNaN(cmp)) return true

  switch (operator) {
    case 'eq':
      return num === cmp
    case 'neq':
      return num !== cmp
    case 'gt':
      return num > cmp
    case 'lt':
      return num < cmp
    case 'gte':
      return num >= cmp
    case 'lte':
      return num <= cmp
    default:
      return true
  }
}

function evaluateDate(
  raw: string | null | undefined,
  operator: string,
  value: unknown,
  value2?: unknown,
): boolean {
  if (operator === 'is_empty') return isEmpty(raw)
  if (operator === 'is_not_empty') return !isEmpty(raw)

  if (raw == null || raw === '') return false
  const dateStr = String(raw).slice(0, 10)
  const cmp = String(value ?? '').slice(0, 10)

  switch (operator) {
    case 'is':
      return dateStr === cmp
    case 'is_before':
      return dateStr < cmp
    case 'is_after':
      return dateStr > cmp
    case 'is_on_or_before':
      return dateStr <= cmp
    case 'is_on_or_after':
      return dateStr >= cmp
    case 'is_between': {
      const cmp2 = String(value2 ?? '').slice(0, 10)
      return dateStr >= cmp && dateStr <= cmp2
    }
    default:
      return true
  }
}

function evaluateTag(
  objectId: string,
  operator: string,
  value: unknown,
  tagsByObject: Record<string, Tag[]>,
): boolean {
  const tags = tagsByObject[objectId] ?? []

  switch (operator) {
    case 'is_empty':
      return tags.length === 0
    case 'is_not_empty':
      return tags.length > 0
    case 'contains':
      return tags.some((t) => t.id === String(value ?? ''))
    case 'does_not_contain':
      return !tags.some((t) => t.id === String(value ?? ''))
    default:
      return true
  }
}

function evaluateRelation(
  objectId: string,
  operator: string,
  value: unknown,
  relationsByObject: Record<string, ObjectRelation[]>,
  objectTypeByObjectId: Record<string, string>,
): boolean {
  const relations = relationsByObject[objectId] ?? []

  switch (operator) {
    case 'has_links':
      return relations.length > 0
    case 'has_no_links':
      return relations.length === 0
    case 'links_to': {
      const targetId = String(value ?? '')
      return relations.some(
        (r) => r.source_id === objectId
          ? r.target_id === targetId
          : r.source_id === targetId,
      )
    }
    case 'links_to_type': {
      const typeId = String(value ?? '')
      return relations.some((r) => {
        const linkedId = r.source_id === objectId ? r.target_id : r.source_id
        return objectTypeByObjectId[linkedId] === typeId
      })
    }
    default:
      return true
  }
}

function isEmpty(val: unknown): boolean {
  if (val == null) return true
  if (val === '') return true
  if (Array.isArray(val) && val.length === 0) return true
  return false
}

function isNumberOperator(op: string): boolean {
  return ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'].includes(op)
}

function isDateLikeOperator(op: string): boolean {
  return [
    'is_before', 'is_after',
    'is_on_or_before', 'is_on_or_after', 'is_between',
  ].includes(op)
}

export function hasContentFilter(expression: FilterExpression): boolean {
  return expression.groups.some((g) =>
    g.conditions.some((c) => c.target.kind === 'content'),
  )
}
