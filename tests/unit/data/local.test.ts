import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

describe('Local Data Client (IndexedDB)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  describe('objects.create', () => {
    it('creates a new object with required fields', async () => {
      const result = await client.objects.create({
        title: 'Test Page',
        type: 'page',
      })

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data!.title).toBe('Test Page')
      expect(result.data!.type).toBe('page')
      expect(result.data!.id).toBeDefined()
      expect(result.data!.created_at).toBeDefined()
      expect(result.data!.updated_at).toBeDefined()
    })

    it('creates a note with content', async () => {
      const content = { type: 'doc', content: [{ type: 'paragraph' }] }
      const result = await client.objects.create({
        title: 'Test Note',
        type: 'note',
        content,
      })

      expect(result.error).toBeNull()
      expect(result.data!.type).toBe('note')
      expect(result.data!.content).toEqual(content)
    })

    it('sets default values for optional fields', async () => {
      const result = await client.objects.create({
        title: 'Test',
        type: 'page',
      })

      expect(result.data!.owner_id).toBeNull()
      expect(result.data!.parent_id).toBeNull()
      expect(result.data!.icon).toBeNull()
      expect(result.data!.properties).toEqual({})
      expect(result.data!.is_template).toBe(false)
      expect(result.data!.is_deleted).toBe(false)
    })
  })

  describe('objects.list', () => {
    it('returns empty array when no objects exist', async () => {
      const result = await client.objects.list()

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('returns all objects', async () => {
      await client.objects.create({ title: 'Page 1', type: 'page' })
      await client.objects.create({ title: 'Page 2', type: 'page' })

      const result = await client.objects.list()

      expect(result.data.length).toBe(2)
    })

    it('filters by type', async () => {
      await client.objects.create({ title: 'Page', type: 'page' })
      await client.objects.create({ title: 'Note', type: 'note' })

      const result = await client.objects.list({ type: 'note' })

      expect(result.data.length).toBe(1)
      expect(result.data[0].type).toBe('note')
    })

    it('filters by parent_id', async () => {
      const parent = await client.objects.create({ title: 'Parent', type: 'page' })
      await client.objects.create({ title: 'Child', type: 'page', parent_id: parent.data!.id })
      await client.objects.create({ title: 'Other', type: 'page' })

      const result = await client.objects.list({ parentId: parent.data!.id })

      expect(result.data.length).toBe(1)
      expect(result.data[0].title).toBe('Child')
    })

    it('filters out deleted objects', async () => {
      await client.objects.create({ title: 'Active', type: 'page' })
      const toDelete = await client.objects.create({ title: 'Deleted', type: 'page' })
      await client.objects.delete(toDelete.data!.id)

      const result = await client.objects.list({ isDeleted: false })

      expect(result.data.length).toBe(1)
      expect(result.data[0].title).toBe('Active')
    })

    it('sorts by updated_at descending', async () => {
      const first = await client.objects.create({ title: 'First', type: 'page' })
      await client.objects.create({ title: 'Second', type: 'page' })
      await client.objects.update(first.data!.id, { title: 'First Updated' })

      const result = await client.objects.list()

      expect(result.data[0].title).toBe('First Updated')
    })
  })

  describe('objects.get', () => {
    it('returns object by id', async () => {
      const created = await client.objects.create({ title: 'Test', type: 'page' })

      const result = await client.objects.get(created.data!.id)

      expect(result.error).toBeNull()
      expect(result.data!.title).toBe('Test')
    })

    it('returns error for non-existent id', async () => {
      const result = await client.objects.get('non-existent-id')

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('NOT_FOUND')
    })
  })

  describe('objects.update', () => {
    it('updates object fields', async () => {
      const created = await client.objects.create({ title: 'Original', type: 'page' })

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await client.objects.update(created.data!.id, { title: 'Updated' })

      expect(result.error).toBeNull()
      expect(result.data!.title).toBe('Updated')
      expect(new Date(result.data!.updated_at).getTime())
        .toBeGreaterThan(new Date(created.data!.updated_at).getTime())
    })

    it('returns error for non-existent id', async () => {
      const result = await client.objects.update('non-existent', { title: 'Test' })

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
    })
  })

  describe('objects.delete', () => {
    it('soft deletes by default', async () => {
      const created = await client.objects.create({ title: 'Test', type: 'page' })

      await client.objects.delete(created.data!.id)

      const result = await client.objects.get(created.data!.id)
      expect(result.data!.is_deleted).toBe(true)
      expect(result.data!.deleted_at).not.toBeNull()
    })

    it('permanently deletes when permanent=true', async () => {
      const created = await client.objects.create({ title: 'Test', type: 'page' })

      await client.objects.delete(created.data!.id, true)

      const result = await client.objects.get(created.data!.id)
      expect(result.data).toBeNull()
    })
  })

  describe('objects.restore', () => {
    it('restores a soft-deleted object', async () => {
      const created = await client.objects.create({ title: 'Test', type: 'page' })
      await client.objects.delete(created.data!.id)

      const result = await client.objects.restore(created.data!.id)

      expect(result.error).toBeNull()
      expect(result.data!.is_deleted).toBe(false)
      expect(result.data!.deleted_at).toBeNull()
    })
  })

  describe('objects.search', () => {
    it('finds objects by title', async () => {
      await client.objects.create({ title: 'Meeting Notes', type: 'note' })
      await client.objects.create({ title: 'Project Plan', type: 'page' })
      await client.objects.create({ title: 'Daily Notes', type: 'note' })

      const result = await client.objects.search('notes')

      expect(result.data.length).toBe(2)
    })

    it('excludes deleted objects', async () => {
      const obj = await client.objects.create({ title: 'Deleted Notes', type: 'note' })
      await client.objects.delete(obj.data!.id)

      const result = await client.objects.search('notes')

      expect(result.data.length).toBe(0)
    })

    it('is case insensitive', async () => {
      await client.objects.create({ title: 'IMPORTANT', type: 'page' })

      const result = await client.objects.search('important')

      expect(result.data.length).toBe(1)
    })
  })

  describe('isLocal', () => {
    it('returns true for local client', () => {
      expect(client.isLocal).toBe(true)
    })
  })
})
