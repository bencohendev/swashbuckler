import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('Templates (local data layer)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  describe('create', () => {
    it('creates a template', async () => {
      const result = await client.templates.create({
        name: 'Meeting Notes',
        type_id: PAGE_TYPE_ID,
      })
      expect(result.error).toBeNull()
      expect(result.data!.name).toBe('Meeting Notes')
      expect(result.data!.type_id).toBe(PAGE_TYPE_ID)
    })

    it('creates a template with content and properties', async () => {
      const content = [{ type: 'p', children: [{ text: 'Template content' }] }]
      const result = await client.templates.create({
        name: 'With Content',
        type_id: PAGE_TYPE_ID,
        content,
        properties: { status: 'draft' },
      })
      expect(result.data!.content).toEqual(content)
      expect(result.data!.properties).toEqual({ status: 'draft' })
    })
  })

  describe('list', () => {
    it('returns empty array initially', async () => {
      const result = await client.templates.list()
      expect(result.data).toEqual([])
    })

    it('returns all templates', async () => {
      await client.templates.create({ name: 'Template 1', type_id: PAGE_TYPE_ID })
      await client.templates.create({ name: 'Template 2', type_id: PAGE_TYPE_ID })

      const result = await client.templates.list()
      expect(result.data.length).toBe(2)
    })

    it('filters by typeId', async () => {
      const noteType = await client.objectTypes.create({
        name: 'Note', plural_name: 'Notes', slug: 'note', icon: 'sticky-note',
      })

      await client.templates.create({ name: 'Page Template', type_id: PAGE_TYPE_ID })
      await client.templates.create({ name: 'Note Template', type_id: noteType.data!.id })

      const result = await client.templates.list({ typeId: noteType.data!.id })
      expect(result.data.length).toBe(1)
      expect(result.data[0].name).toBe('Note Template')
    })
  })

  describe('get', () => {
    it('returns template by id', async () => {
      const created = await client.templates.create({ name: 'Find Me', type_id: PAGE_TYPE_ID })
      const result = await client.templates.get(created.data!.id)
      expect(result.data!.name).toBe('Find Me')
    })

    it('returns error for non-existent id', async () => {
      const result = await client.templates.get('non-existent')
      expect(result.error).not.toBeNull()
    })
  })

  describe('update', () => {
    it('updates template name', async () => {
      const created = await client.templates.create({ name: 'Old', type_id: PAGE_TYPE_ID })
      const result = await client.templates.update(created.data!.id, { name: 'New' })
      expect(result.data!.name).toBe('New')
    })
  })

  describe('delete', () => {
    it('deletes a template', async () => {
      const created = await client.templates.create({ name: 'Bye', type_id: PAGE_TYPE_ID })
      await client.templates.delete(created.data!.id)

      const result = await client.templates.get(created.data!.id)
      expect(result.error).not.toBeNull()
    })
  })
})
