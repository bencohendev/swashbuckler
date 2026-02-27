import { describe, it, expect } from 'vitest'
import {
  getOperators,
  getDefaultOperator,
  operatorNeedsValue,
  operatorNeedsValue2,
  getOperatorLabel,
  type FilterFieldType,
} from '@/features/table-view/lib/operatorRegistry'

describe('getOperators', () => {
  const expectedCounts: Record<FilterFieldType, number> = {
    text: 8,
    url: 8,
    title: 8,
    number: 8,
    date: 8,
    system_date: 8,
    select: 4,
    multi_select: 4,
    checkbox: 2,
    tag: 4,
    relation: 4,
    content: 4,
  }

  for (const [type, count] of Object.entries(expectedCounts)) {
    it(`returns ${count} operators for ${type}`, () => {
      expect(getOperators(type as FilterFieldType)).toHaveLength(count)
    })
  }

  it('text and url share the same operators', () => {
    const textOps = getOperators('text').map((o) => o.value)
    const urlOps = getOperators('url').map((o) => o.value)
    expect(textOps).toEqual(urlOps)
  })

  it('date and system_date share the same operators', () => {
    const dateOps = getOperators('date').map((o) => o.value)
    const sysOps = getOperators('system_date').map((o) => o.value)
    expect(dateOps).toEqual(sysOps)
  })
})

describe('getDefaultOperator', () => {
  it('returns "contains" for text', () => {
    expect(getDefaultOperator('text')).toBe('contains')
  })

  it('returns "eq" for number', () => {
    expect(getDefaultOperator('number')).toBe('eq')
  })

  it('returns "is" for date', () => {
    expect(getDefaultOperator('date')).toBe('is')
  })

  it('returns "is" for select', () => {
    expect(getDefaultOperator('select')).toBe('is')
  })

  it('returns "contains" for multi_select', () => {
    expect(getDefaultOperator('multi_select')).toBe('contains')
  })

  it('returns "is_checked" for checkbox', () => {
    expect(getDefaultOperator('checkbox')).toBe('is_checked')
  })

  it('returns "contains" for tag', () => {
    expect(getDefaultOperator('tag')).toBe('contains')
  })

  it('returns "links_to" for relation', () => {
    expect(getDefaultOperator('relation')).toBe('links_to')
  })
})

describe('operatorNeedsValue', () => {
  it('returns true for "contains"', () => {
    expect(operatorNeedsValue('contains')).toBe(true)
  })

  it('returns false for "is_empty"', () => {
    expect(operatorNeedsValue('is_empty')).toBe(false)
  })

  it('returns false for "is_checked"', () => {
    expect(operatorNeedsValue('is_checked')).toBe(false)
  })

  it('returns false for "has_links"', () => {
    expect(operatorNeedsValue('has_links')).toBe(false)
  })

  it('returns true for "eq"', () => {
    expect(operatorNeedsValue('eq')).toBe(true)
  })
})

describe('operatorNeedsValue2', () => {
  it('returns true for "is_between"', () => {
    expect(operatorNeedsValue2('is_between')).toBe(true)
  })

  it('returns false for "is_before"', () => {
    expect(operatorNeedsValue2('is_before')).toBe(false)
  })

  it('returns false for "contains"', () => {
    expect(operatorNeedsValue2('contains')).toBe(false)
  })
})

describe('getOperatorLabel', () => {
  it('returns "contains" for contains', () => {
    expect(getOperatorLabel('contains')).toBe('contains')
  })

  it('returns "is empty" for is_empty', () => {
    expect(getOperatorLabel('is_empty')).toBe('is empty')
  })

  it('returns "=" for eq', () => {
    expect(getOperatorLabel('eq')).toBe('=')
  })

  it('returns "is between" for is_between', () => {
    expect(getOperatorLabel('is_between')).toBe('is between')
  })

  it('returns "links to" for links_to', () => {
    expect(getOperatorLabel('links_to')).toBe('links to')
  })

  it('returns raw op value for unknown operator', () => {
    expect(getOperatorLabel('unknown_op')).toBe('unknown_op')
  })
})
