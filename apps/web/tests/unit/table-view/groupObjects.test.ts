import { describe, it, expect } from 'vitest'
import { groupObjectsByField } from '@/features/table-view/lib/groupObjects'
import type { DataObjectSummary } from '@/shared/lib/data'

function makeSummary(id: string, properties: Record<string, unknown> = {}): DataObjectSummary {
  return {
    id,
    title: `Object ${id}`,
    type_id: '11111111-1111-1111-1111-111111111111',
    owner_id: null,
    space_id: '22222222-2222-2222-2222-222222222222',
    parent_id: null,
    icon: null,
    cover_image: null,
    properties,
    sort_order: 0,
    is_deleted: false,
    deleted_at: null,
    is_archived: false,
    archived_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('groupObjectsByField', () => {
  const fieldId = 'status'
  const options = ['Todo', 'In Progress', 'Done']

  it('groups objects into correct buckets', () => {
    const objects = [
      makeSummary('a', { status: 'Todo' }),
      makeSummary('b', { status: 'Done' }),
      makeSummary('c', { status: 'Todo' }),
      makeSummary('d', { status: 'In Progress' }),
    ]

    const result = groupObjectsByField(objects, fieldId, options)

    expect(result).toHaveLength(4) // 3 options + Uncategorized
    expect(result[0].label).toBe('Todo')
    expect(result[0].objects.map((o) => o.id)).toEqual(['a', 'c'])
    expect(result[1].label).toBe('In Progress')
    expect(result[1].objects.map((o) => o.id)).toEqual(['d'])
    expect(result[2].label).toBe('Done')
    expect(result[2].objects.map((o) => o.id)).toEqual(['b'])
    expect(result[3].label).toBe('Uncategorized')
    expect(result[3].objects).toHaveLength(0)
  })

  it('places objects with unknown field value in Uncategorized', () => {
    const objects = [
      makeSummary('a', { status: 'Unknown' }),
      makeSummary('b', { status: 42 }),
    ]

    const result = groupObjectsByField(objects, fieldId, options)

    const uncategorized = result.find((c) => c.label === 'Uncategorized')!
    expect(uncategorized.objects).toHaveLength(2)
  })

  it('places objects without the field in Uncategorized', () => {
    const objects = [
      makeSummary('a', {}),
      makeSummary('b', { other: 'value' }),
    ]

    const result = groupObjectsByField(objects, fieldId, options)

    const uncategorized = result.find((c) => c.label === 'Uncategorized')!
    expect(uncategorized.objects).toHaveLength(2)
  })

  it('returns empty buckets when no objects', () => {
    const result = groupObjectsByField([], fieldId, options)

    expect(result).toHaveLength(4)
    for (const col of result) {
      expect(col.objects).toHaveLength(0)
    }
  })

  it('preserves column order matching options order', () => {
    const result = groupObjectsByField([], fieldId, options)

    expect(result[0].value).toBe('Todo')
    expect(result[1].value).toBe('In Progress')
    expect(result[2].value).toBe('Done')
    expect(result[3].value).toBeNull()
  })

  it('handles single option', () => {
    const result = groupObjectsByField(
      [makeSummary('a', { status: 'Only' })],
      fieldId,
      ['Only'],
    )
    expect(result).toHaveLength(2) // 1 option + Uncategorized
    expect(result[0].objects).toHaveLength(1)
  })
})
