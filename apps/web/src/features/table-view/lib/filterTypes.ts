export type FilterFieldTarget =
  | { kind: 'property'; fieldId: string }
  | { kind: 'system'; field: 'created_at' | 'updated_at' }
  | { kind: 'title' }
  | { kind: 'tag' }
  | { kind: 'relation' }

export interface FilterCondition {
  id: string
  target: FilterFieldTarget
  operator: string
  value: unknown
  value2?: unknown
}

export interface FilterGroup {
  id: string
  conditions: FilterCondition[]
}

export interface FilterExpression {
  search: string
  groups: FilterGroup[]
}

export const EMPTY_EXPRESSION: FilterExpression = { search: '', groups: [] }

export function hasActiveFilters(expr: FilterExpression): boolean {
  if (expr.search.trim() !== '') return true
  return expr.groups.some((g) => g.conditions.length > 0)
}

export function addGroup(expr: FilterExpression): FilterExpression {
  return {
    ...expr,
    groups: [...expr.groups, { id: crypto.randomUUID(), conditions: [] }],
  }
}

export function removeGroup(expr: FilterExpression, groupId: string): FilterExpression {
  return {
    ...expr,
    groups: expr.groups.filter((g) => g.id !== groupId),
  }
}

export function addCondition(
  expr: FilterExpression,
  groupId: string,
  condition: FilterCondition,
): FilterExpression {
  return {
    ...expr,
    groups: expr.groups.map((g) =>
      g.id === groupId
        ? { ...g, conditions: [...g.conditions, condition] }
        : g,
    ),
  }
}

export function removeCondition(
  expr: FilterExpression,
  groupId: string,
  conditionId: string,
): FilterExpression {
  const groups = expr.groups
    .map((g) =>
      g.id === groupId
        ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }
        : g,
    )
    .filter((g) => g.conditions.length > 0)
  return { ...expr, groups }
}

export function updateCondition(
  expr: FilterExpression,
  groupId: string,
  conditionId: string,
  updates: Partial<Omit<FilterCondition, 'id'>>,
): FilterExpression {
  return {
    ...expr,
    groups: expr.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            conditions: g.conditions.map((c) =>
              c.id === conditionId ? { ...c, ...updates } : c,
            ),
          }
        : g,
    ),
  }
}
