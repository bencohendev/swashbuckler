import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('Tags (local data layer)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  describe('create', () => {
    it('creates a tag', async () => {
      const result = await client.tags.create({ name: 'Important' })
      expect(result.error).toBeNull()
      expect(result.data!.name).toBe('Important')
      expect(result.data!.id).toBeDefined()
    })

    it('creates a tag with color', async () => {
      const result = await client.tags.create({ name: 'Urgent', color: '#ff0000' })
      expect(result.data!.color).toBe('#ff0000')
    })

    it('rejects duplicate tag name in same space', async () => {
      await client.tags.create({ name: 'Work' })
      const result = await client.tags.create({ name: 'Work' })
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('DUPLICATE')
    })
  })

  describe('list', () => {
    it('returns empty array initially', async () => {
      const result = await client.tags.list()
      expect(result.data).toEqual([])
    })

    it('returns tags sorted by name', async () => {
      await client.tags.create({ name: 'Zebra' })
      await client.tags.create({ name: 'Alpha' })
      await client.tags.create({ name: 'Middle' })

      const result = await client.tags.list()
      expect(result.data.map(t => t.name)).toEqual(['Alpha', 'Middle', 'Zebra'])
    })
  })

  describe('update', () => {
    it('updates tag name', async () => {
      const created = await client.tags.create({ name: 'Old Name' })
      const result = await client.tags.update(created.data!.id, { name: 'New Name' })
      expect(result.data!.name).toBe('New Name')
    })

    it('updates tag color', async () => {
      const created = await client.tags.create({ name: 'Test' })
      const result = await client.tags.update(created.data!.id, { color: '#00ff00' })
      expect(result.data!.color).toBe('#00ff00')
    })
  })

  describe('delete', () => {
    it('deletes a tag', async () => {
      const created = await client.tags.create({ name: 'ToDelete' })
      await client.tags.delete(created.data!.id)

      const result = await client.tags.list()
      expect(result.data.length).toBe(0)
    })

    it('cascades to objectTags', async () => {
      const tag = await client.tags.create({ name: 'CascadeTest' })
      const obj = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })
      await client.tags.addTagToObject(obj.data!.id, tag.data!.id)

      await client.tags.delete(tag.data!.id)

      const objectTags = await client.tags.getObjectTags(obj.data!.id)
      expect(objectTags.data.length).toBe(0)
    })
  })

  describe('addTagToObject', () => {
    it('adds a tag to an object', async () => {
      const tag = await client.tags.create({ name: 'Tagged' })
      const obj = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })

      const result = await client.tags.addTagToObject(obj.data!.id, tag.data!.id)
      expect(result.error).toBeNull()
      expect(result.data!.object_id).toBe(obj.data!.id)
    })

    it('returns existing on duplicate', async () => {
      const tag = await client.tags.create({ name: 'Dup' })
      const obj = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })

      const first = await client.tags.addTagToObject(obj.data!.id, tag.data!.id)
      const second = await client.tags.addTagToObject(obj.data!.id, tag.data!.id)
      expect(second.data!.id).toBe(first.data!.id)
    })
  })

  describe('removeTagFromObject', () => {
    it('removes a tag from an object', async () => {
      const tag = await client.tags.create({ name: 'Remove' })
      const obj = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })
      await client.tags.addTagToObject(obj.data!.id, tag.data!.id)

      await client.tags.removeTagFromObject(obj.data!.id, tag.data!.id)

      const tags = await client.tags.getObjectTags(obj.data!.id)
      expect(tags.data.length).toBe(0)
    })
  })

  describe('getObjectTags', () => {
    it('returns tags for an object', async () => {
      const tag1 = await client.tags.create({ name: 'Tag1' })
      const tag2 = await client.tags.create({ name: 'Tag2' })
      const obj = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })

      await client.tags.addTagToObject(obj.data!.id, tag1.data!.id)
      await client.tags.addTagToObject(obj.data!.id, tag2.data!.id)

      const result = await client.tags.getObjectTags(obj.data!.id)
      expect(result.data.length).toBe(2)
    })
  })

  describe('getObjectsByTag', () => {
    it('returns objects with a given tag', async () => {
      const tag = await client.tags.create({ name: 'Shared' })
      const obj1 = await client.objects.create({ title: 'Obj1', type_id: PAGE_TYPE_ID })
      const obj2 = await client.objects.create({ title: 'Obj2', type_id: PAGE_TYPE_ID })

      await client.tags.addTagToObject(obj1.data!.id, tag.data!.id)
      await client.tags.addTagToObject(obj2.data!.id, tag.data!.id)

      const result = await client.tags.getObjectsByTag(tag.data!.id)
      expect(result.data.length).toBe(2)
    })

    it('excludes deleted objects', async () => {
      const tag = await client.tags.create({ name: 'Filter' })
      const obj = await client.objects.create({ title: 'Deleted', type_id: PAGE_TYPE_ID })
      await client.tags.addTagToObject(obj.data!.id, tag.data!.id)
      await client.objects.delete(obj.data!.id)

      const result = await client.tags.getObjectsByTag(tag.data!.id)
      expect(result.data.length).toBe(0)
    })
  })
})
