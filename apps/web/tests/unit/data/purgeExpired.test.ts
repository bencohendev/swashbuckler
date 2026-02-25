import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('purgeExpired', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  it('returns 0 when no expired items exist', async () => {
    const result = await client.objects.purgeExpired()

    expect(result.error).toBeNull()
    expect(result.data).toBe(0)
  })

  it('does not purge items younger than 30 days', async () => {
    // Create and soft-delete an object (deleted_at will be now)
    const created = await client.objects.create({ title: 'Recent', type_id: PAGE_TYPE_ID })
    await client.objects.delete(created.data!.id)

    const result = await client.objects.purgeExpired()

    expect(result.data).toBe(0)

    // Object should still exist
    const obj = await client.objects.get(created.data!.id)
    expect(obj.data).not.toBeNull()
    expect(obj.data!.is_deleted).toBe(true)
  })

  it('purges items older than 30 days', async () => {
    // Create and soft-delete an object
    const created = await client.objects.create({ title: 'Old', type_id: PAGE_TYPE_ID })
    await client.objects.delete(created.data!.id)

    // Move Date.now forward by 31 days to make the deletion "old"
    const thirtyOneDays = 31 * 24 * 60 * 60 * 1000
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + thirtyOneDays)

    const result = await client.objects.purgeExpired()

    expect(result.data).toBe(1)

    // Object should no longer exist
    const obj = await client.objects.get(created.data!.id)
    expect(obj.data).toBeNull()

    vi.restoreAllMocks()
  })

  it('does not touch non-deleted objects', async () => {
    // Create an active object
    const created = await client.objects.create({ title: 'Active', type_id: PAGE_TYPE_ID })

    // Move time forward 31 days
    const thirtyOneDays = 31 * 24 * 60 * 60 * 1000
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + thirtyOneDays)

    await client.objects.purgeExpired()

    const obj = await client.objects.get(created.data!.id)
    expect(obj.data).not.toBeNull()
    expect(obj.data!.is_deleted).toBe(false)

    vi.restoreAllMocks()
  })

  it('cascades: removes relations referencing purged objects', async () => {
    const obj1 = await client.objects.create({ title: 'Source', type_id: PAGE_TYPE_ID })
    const obj2 = await client.objects.create({ title: 'Target', type_id: PAGE_TYPE_ID })

    // Create a relation between the objects
    await client.relations.create({
      source_id: obj1.data!.id,
      target_id: obj2.data!.id,
    })

    // Soft-delete obj1
    await client.objects.delete(obj1.data!.id)

    // Move time forward 31 days
    const thirtyOneDays = 31 * 24 * 60 * 60 * 1000
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + thirtyOneDays)

    await client.objects.purgeExpired()

    // Relations for obj2 should no longer reference purged obj1
    const relations = await client.relations.list({ objectId: obj2.data!.id })
    expect(relations.data.length).toBe(0)

    vi.restoreAllMocks()
  })

  it('cascades: removes tags and pins referencing purged objects', async () => {
    const created = await client.objects.create({ title: 'Tagged', type_id: PAGE_TYPE_ID })
    const objectId = created.data!.id

    // Create a tag and attach it
    const tag = await client.tags.create({ name: 'test-tag' })
    await client.tags.addTagToObject(objectId, tag.data!.id)

    // Pin the object
    await client.pins.pin(objectId)

    // Soft-delete
    await client.objects.delete(objectId)

    // Move time forward 31 days
    const thirtyOneDays = 31 * 24 * 60 * 60 * 1000
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + thirtyOneDays)

    await client.objects.purgeExpired()

    // Object tags should be gone
    const objectTags = await client.tags.getObjectTags(objectId)
    expect(objectTags.data.length).toBe(0)

    // Pin should be gone
    const isPinned = await client.pins.isPinned(objectId)
    expect(isPinned).toBe(false)

    vi.restoreAllMocks()
  })
})
