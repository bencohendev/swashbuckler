export type FilterFieldType =
  | 'text'
  | 'url'
  | 'title'
  | 'number'
  | 'date'
  | 'system_date'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'tag'
  | 'relation'
  | 'content'

export interface OperatorDef {
  value: string
  label: string
  needsValue: boolean
  needsValue2: boolean
}

const TEXT_OPERATORS: OperatorDef[] = [
  { value: 'contains', label: 'contains', needsValue: true, needsValue2: false },
  { value: 'does_not_contain', label: 'does not contain', needsValue: true, needsValue2: false },
  { value: 'equals', label: 'equals', needsValue: true, needsValue2: false },
  { value: 'not_equals', label: 'does not equal', needsValue: true, needsValue2: false },
  { value: 'starts_with', label: 'starts with', needsValue: true, needsValue2: false },
  { value: 'ends_with', label: 'ends with', needsValue: true, needsValue2: false },
  { value: 'is_empty', label: 'is empty', needsValue: false, needsValue2: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false, needsValue2: false },
]

const NUMBER_OPERATORS: OperatorDef[] = [
  { value: 'eq', label: '=', needsValue: true, needsValue2: false },
  { value: 'neq', label: '\u2260', needsValue: true, needsValue2: false },
  { value: 'gt', label: '>', needsValue: true, needsValue2: false },
  { value: 'lt', label: '<', needsValue: true, needsValue2: false },
  { value: 'gte', label: '\u2265', needsValue: true, needsValue2: false },
  { value: 'lte', label: '\u2264', needsValue: true, needsValue2: false },
  { value: 'is_empty', label: 'is empty', needsValue: false, needsValue2: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false, needsValue2: false },
]

const DATE_OPERATORS: OperatorDef[] = [
  { value: 'is', label: 'is', needsValue: true, needsValue2: false },
  { value: 'is_before', label: 'is before', needsValue: true, needsValue2: false },
  { value: 'is_after', label: 'is after', needsValue: true, needsValue2: false },
  { value: 'is_on_or_before', label: 'is on or before', needsValue: true, needsValue2: false },
  { value: 'is_on_or_after', label: 'is on or after', needsValue: true, needsValue2: false },
  { value: 'is_between', label: 'is between', needsValue: true, needsValue2: true },
  { value: 'is_empty', label: 'is empty', needsValue: false, needsValue2: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false, needsValue2: false },
]

const SELECT_OPERATORS: OperatorDef[] = [
  { value: 'is', label: 'is', needsValue: true, needsValue2: false },
  { value: 'is_not', label: 'is not', needsValue: true, needsValue2: false },
  { value: 'is_empty', label: 'is empty', needsValue: false, needsValue2: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false, needsValue2: false },
]

const MULTI_SELECT_OPERATORS: OperatorDef[] = [
  { value: 'contains', label: 'contains', needsValue: true, needsValue2: false },
  { value: 'does_not_contain', label: 'does not contain', needsValue: true, needsValue2: false },
  { value: 'is_empty', label: 'is empty', needsValue: false, needsValue2: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false, needsValue2: false },
]

const CHECKBOX_OPERATORS: OperatorDef[] = [
  { value: 'is_checked', label: 'is checked', needsValue: false, needsValue2: false },
  { value: 'is_not_checked', label: 'is not checked', needsValue: false, needsValue2: false },
]

const TAG_OPERATORS: OperatorDef[] = [
  { value: 'contains', label: 'contains', needsValue: true, needsValue2: false },
  { value: 'does_not_contain', label: 'does not contain', needsValue: true, needsValue2: false },
  { value: 'is_empty', label: 'has no tags', needsValue: false, needsValue2: false },
  { value: 'is_not_empty', label: 'has tags', needsValue: false, needsValue2: false },
]

const RELATION_OPERATORS: OperatorDef[] = [
  { value: 'links_to', label: 'links to', needsValue: true, needsValue2: false },
  { value: 'links_to_type', label: 'links to type', needsValue: true, needsValue2: false },
  { value: 'has_links', label: 'has links', needsValue: false, needsValue2: false },
  { value: 'has_no_links', label: 'has no links', needsValue: false, needsValue2: false },
]

const CONTENT_OPERATORS: OperatorDef[] = [
  { value: 'contains', label: 'contains', needsValue: true, needsValue2: false },
  { value: 'does_not_contain', label: 'does not contain', needsValue: true, needsValue2: false },
  { value: 'is_empty', label: 'is empty', needsValue: false, needsValue2: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false, needsValue2: false },
]

const REGISTRY: Record<FilterFieldType, OperatorDef[]> = {
  text: TEXT_OPERATORS,
  url: TEXT_OPERATORS,
  title: TEXT_OPERATORS,
  number: NUMBER_OPERATORS,
  date: DATE_OPERATORS,
  system_date: DATE_OPERATORS,
  select: SELECT_OPERATORS,
  multi_select: MULTI_SELECT_OPERATORS,
  checkbox: CHECKBOX_OPERATORS,
  tag: TAG_OPERATORS,
  relation: RELATION_OPERATORS,
  content: CONTENT_OPERATORS,
}

export function getOperators(fieldType: FilterFieldType): OperatorDef[] {
  return REGISTRY[fieldType] ?? []
}

export function getDefaultOperator(fieldType: FilterFieldType): string {
  const ops = getOperators(fieldType)
  return ops[0]?.value ?? 'contains'
}

export function operatorNeedsValue(op: string): boolean {
  for (const ops of Object.values(REGISTRY)) {
    const found = ops.find((o) => o.value === op)
    if (found) return found.needsValue
  }
  return false
}

export function operatorNeedsValue2(op: string): boolean {
  for (const ops of Object.values(REGISTRY)) {
    const found = ops.find((o) => o.value === op)
    if (found) return found.needsValue2
  }
  return false
}

export function getOperatorLabel(op: string): string {
  for (const ops of Object.values(REGISTRY)) {
    const found = ops.find((o) => o.value === op)
    if (found) return found.label
  }
  return op
}
