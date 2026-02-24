import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData, exportLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('exportLocalData', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  it('returns expected shape with all keys', async () => {
    const data = await exportLocalData()

    expect(data).toHaveProperty('objects')
    expect(data).toHaveProperty('objectTypes')
    expect(data).toHaveProperty('templates')
    expect(data).toHaveProperty('objectRelations')
    expect(data).toHaveProperty('spaces')
    expect(data).toHaveProperty('tags')
    expect(data).toHaveProperty('objectTags')
    expect(data).toHaveProperty('pins')
  })

  it('returns arrays for all properties', async () => {
    const data = await exportLocalData()

    expect(Array.isArray(data.objects)).toBe(true)
    expect(Array.isArray(data.objectTypes)).toBe(true)
    expect(Array.isArray(data.templates)).toBe(true)
    expect(Array.isArray(data.objectRelations)).toBe(true)
    expect(Array.isArray(data.spaces)).toBe(true)
    expect(Array.isArray(data.tags)).toBe(true)
    expect(Array.isArray(data.objectTags)).toBe(true)
    expect(Array.isArray(data.pins)).toBe(true)
  })

  it('has empty objects after clearLocalData', async () => {
    const data = await exportLocalData()

    expect(data.objects).toEqual([])
    expect(data.objectRelations).toEqual([])
    expect(data.templates).toEqual([])
    expect(data.tags).toEqual([])
    expect(data.objectTags).toEqual([])
    expect(data.pins).toEqual([])
  })

  it('includes seeded object types after clearLocalData', async () => {
    const data = await exportLocalData()

    // clearLocalData re-seeds default types (Page)
    expect(data.objectTypes.length).toBeGreaterThanOrEqual(1)
    expect(data.objectTypes.some(t => t.slug === 'page')).toBe(true)
  })

  it('round-trip: created items appear in export', async () => {
    // Create some objects
    await client.objects.create({ title: 'Page 1', type_id: PAGE_TYPE_ID })
    await client.objects.create({ title: 'Page 2', type_id: PAGE_TYPE_ID })

    // Create a tag
    await client.tags.create({ name: 'important' })

    const data = await exportLocalData()

    expect(data.objects.length).toBe(2)
    expect(data.tags.length).toBe(1)
    expect(data.tags[0].name).toBe('important')
  })

  it('includes relations in export', async () => {
    const obj1 = await client.objects.create({ title: 'Source', type_id: PAGE_TYPE_ID })
    const obj2 = await client.objects.create({ title: 'Target', type_id: PAGE_TYPE_ID })

    await client.relations.create({
      source_id: obj1.data!.id,
      target_id: obj2.data!.id,
    })

    const data = await exportLocalData()

    expect(data.objectRelations.length).toBe(1)
    expect(data.objectRelations[0].source_id).toBe(obj1.data!.id)
    expect(data.objectRelations[0].target_id).toBe(obj2.data!.id)
  })
})
