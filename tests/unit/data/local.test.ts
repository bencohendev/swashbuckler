import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'
const NOTE_TYPE_ID = '00000000-0000-0000-0000-000000000002'

describe('Local Data Client (IndexedDB)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()

    // Seed a Note type for tests that need it (clearLocalData only seeds Page)
    await client.objectTypes.create({
      name: 'Note',
      plural_name: 'Notes',
      slug: 'note',
      icon: 'sticky-note',
    })
  })

  describe('objects.create', () => {
    it('creates a new object with required fields', async () => {
      const result = await client.objects.create({
        title: 'Test Page',
        type_id: PAGE_TYPE_ID,
      })

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data!.title).toBe('Test Page')
      expect(result.data!.type_id).toBe(PAGE_TYPE_ID)
      expect(result.data!.id).toBeDefined()
      expect(result.data!.created_at).toBeDefined()
      expect(result.data!.updated_at).toBeDefined()
    })

    it('creates a note with content', async () => {
      const noteTypes = (await client.objectTypes.list()).data.filter(t => t.slug === 'note')
      const noteTypeId = noteTypes[0].id

      const content = { type: 'doc', content: [{ type: 'paragraph' }] }
      const result = await client.objects.create({
        title: 'Test Note',
        type_id: noteTypeId,
        content,
      })

      expect(result.error).toBeNull()
      expect(result.data!.type_id).toBe(noteTypeId)
      expect(result.data!.content).toEqual(content)
    })

    it('sets default values for optional fields', async () => {
      const result = await client.objects.create({
        title: 'Test',
        type_id: PAGE_TYPE_ID,
      })

      expect(result.data!.owner_id).toBeNull()
      expect(result.data!.parent_id).toBeNull()
      expect(result.data!.icon).toBeNull()
      expect(result.data!.properties).toEqual({})
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
      await client.objects.create({ title: 'Page 1', type_id: PAGE_TYPE_ID })
      await client.objects.create({ title: 'Page 2', type_id: PAGE_TYPE_ID })

      const result = await client.objects.list()

      expect(result.data.length).toBe(2)
    })

    it('filters by typeId', async () => {
      const noteTypes = (await client.objectTypes.list()).data.filter(t => t.slug === 'note')
      const noteTypeId = noteTypes[0].id

      await client.objects.create({ title: 'Page', type_id: PAGE_TYPE_ID })
      await client.objects.create({ title: 'Note', type_id: noteTypeId })

      const result = await client.objects.list({ typeId: noteTypeId })

      expect(result.data.length).toBe(1)
      expect(result.data[0].type_id).toBe(noteTypeId)
    })

    it('filters by parent_id', async () => {
      const parent = await client.objects.create({ title: 'Parent', type_id: PAGE_TYPE_ID })
      await client.objects.create({ title: 'Child', type_id: PAGE_TYPE_ID, parent_id: parent.data!.id })
      await client.objects.create({ title: 'Other', type_id: PAGE_TYPE_ID })

      const result = await client.objects.list({ parentId: parent.data!.id })

      expect(result.data.length).toBe(1)
      expect(result.data[0].title).toBe('Child')
    })

    it('filters out deleted objects', async () => {
      await client.objects.create({ title: 'Active', type_id: PAGE_TYPE_ID })
      const toDelete = await client.objects.create({ title: 'Deleted', type_id: PAGE_TYPE_ID })
      await client.objects.delete(toDelete.data!.id)

      const result = await client.objects.list({ isDeleted: false })

      expect(result.data.length).toBe(1)
      expect(result.data[0].title).toBe('Active')
    })

    it('sorts by updated_at descending', async () => {
      const first = await client.objects.create({ title: 'First', type_id: PAGE_TYPE_ID })
      await new Promise(resolve => setTimeout(resolve, 10))
      await client.objects.create({ title: 'Second', type_id: PAGE_TYPE_ID })
      await new Promise(resolve => setTimeout(resolve, 10))
      await client.objects.update(first.data!.id, { title: 'First Updated' })

      const result = await client.objects.list()

      expect(result.data[0].title).toBe('First Updated')
    })
  })

  describe('objects.get', () => {
    it('returns object by id', async () => {
      const created = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })

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
      const created = await client.objects.create({ title: 'Original', type_id: PAGE_TYPE_ID })

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
      const created = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })

      await client.objects.delete(created.data!.id)

      const result = await client.objects.get(created.data!.id)
      expect(result.data!.is_deleted).toBe(true)
      expect(result.data!.deleted_at).not.toBeNull()
    })

    it('permanently deletes when permanent=true', async () => {
      const created = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })

      await client.objects.delete(created.data!.id, true)

      const result = await client.objects.get(created.data!.id)
      expect(result.data).toBeNull()
    })
  })

  describe('objects.restore', () => {
    it('restores a soft-deleted object', async () => {
      const created = await client.objects.create({ title: 'Test', type_id: PAGE_TYPE_ID })
      await client.objects.delete(created.data!.id)

      const result = await client.objects.restore(created.data!.id)

      expect(result.error).toBeNull()
      expect(result.data!.is_deleted).toBe(false)
      expect(result.data!.deleted_at).toBeNull()
    })
  })

  describe('objects.search', () => {
    it('finds objects by title', async () => {
      const noteTypes = (await client.objectTypes.list()).data.filter(t => t.slug === 'note')
      const noteTypeId = noteTypes[0].id

      await client.objects.create({ title: 'Meeting Notes', type_id: noteTypeId })
      await client.objects.create({ title: 'Project Plan', type_id: PAGE_TYPE_ID })
      await client.objects.create({ title: 'Daily Notes', type_id: noteTypeId })

      const result = await client.objects.search('notes')

      expect(result.data.length).toBe(2)
    })

    it('excludes deleted objects', async () => {
      const noteTypes = (await client.objectTypes.list()).data.filter(t => t.slug === 'note')
      const noteTypeId = noteTypes[0].id

      const obj = await client.objects.create({ title: 'Deleted Notes', type_id: noteTypeId })
      await client.objects.delete(obj.data!.id)

      const result = await client.objects.search('notes')

      expect(result.data.length).toBe(0)
    })

    it('is case insensitive', async () => {
      await client.objects.create({ title: 'IMPORTANT', type_id: PAGE_TYPE_ID })

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
