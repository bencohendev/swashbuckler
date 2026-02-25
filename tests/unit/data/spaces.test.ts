import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

describe('Spaces (local data layer)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  describe('create', () => {
    it('creates a space', async () => {
      const result = await client.spaces.create({ name: 'Work' })
      expect(result.error).toBeNull()
      expect(result.data!.name).toBe('Work')
      expect(result.data!.icon).toBe('📁') // default icon
    })

    it('creates a space with custom icon', async () => {
      const result = await client.spaces.create({ name: 'Fun', icon: '🎉' })
      expect(result.data!.icon).toBe('🎉')
    })

    it('rejects duplicate space name (exact match)', async () => {
      await client.spaces.create({ name: 'Work' })
      const result = await client.spaces.create({ name: 'Work' })
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('DUPLICATE')
    })

    it('rejects duplicate space name (case-insensitive)', async () => {
      await client.spaces.create({ name: 'My Space' })
      const result = await client.spaces.create({ name: 'my space' })
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('DUPLICATE')
    })
  })

  describe('list', () => {
    it('returns spaces sorted by created_at ascending', async () => {
      await client.spaces.create({ name: 'First' })
      await new Promise(r => setTimeout(r, 10))
      await client.spaces.create({ name: 'Second' })

      const result = await client.spaces.list()
      const names = result.data.map(s => s.name)
      expect(names.indexOf('First')).toBeLessThan(names.indexOf('Second'))
    })
  })

  describe('get', () => {
    it('returns space by id', async () => {
      const created = await client.spaces.create({ name: 'Find Me' })
      const result = await client.spaces.get(created.data!.id)
      expect(result.data!.name).toBe('Find Me')
    })

    it('returns error for non-existent id', async () => {
      const result = await client.spaces.get('non-existent')
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('NOT_FOUND')
    })
  })

  describe('update', () => {
    it('updates space name', async () => {
      const created = await client.spaces.create({ name: 'Old' })
      const result = await client.spaces.update(created.data!.id, { name: 'New' })
      expect(result.data!.name).toBe('New')
    })

    it('updates space icon', async () => {
      const created = await client.spaces.create({ name: 'Test' })
      const result = await client.spaces.update(created.data!.id, { icon: '🚀' })
      expect(result.data!.icon).toBe('🚀')
    })

    it('rejects rename to duplicate name', async () => {
      await client.spaces.create({ name: 'Alpha' })
      const beta = await client.spaces.create({ name: 'Beta' })
      const result = await client.spaces.update(beta.data!.id, { name: 'Alpha' })
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('DUPLICATE')
    })

    it('rejects rename to duplicate name (case-insensitive)', async () => {
      await client.spaces.create({ name: 'Alpha' })
      const beta = await client.spaces.create({ name: 'Beta' })
      const result = await client.spaces.update(beta.data!.id, { name: 'alpha' })
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('DUPLICATE')
    })

    it('allows updating to same name (self-check)', async () => {
      const created = await client.spaces.create({ name: 'Same' })
      const result = await client.spaces.update(created.data!.id, { name: 'Same' })
      expect(result.error).toBeNull()
      expect(result.data!.name).toBe('Same')
    })
  })

  describe('delete', () => {
    it('deletes a space', async () => {
      const created = await client.spaces.create({ name: 'Bye' })
      await client.spaces.delete(created.data!.id)

      const result = await client.spaces.get(created.data!.id)
      expect(result.error).not.toBeNull()
    })

    it('cascades delete to objects in the space', async () => {
      const space = await client.spaces.create({ name: 'Cascade' })
      const spaceId = space.data!.id
      const spacedClient = createLocalDataClient(spaceId)

      // Create a type in the space first so we can create objects
      const type = await spacedClient.objectTypes.create({
        name: 'Item', plural_name: 'Items', slug: 'item', icon: 'box',
      })
      await spacedClient.objects.create({ title: 'In Space', type_id: type.data!.id })

      await client.spaces.delete(spaceId)

      const objects = await spacedClient.objects.list()
      expect(objects.data.length).toBe(0)
    })

    it('cascades delete to types in the space', async () => {
      const space = await client.spaces.create({ name: 'CascadeTypes' })
      const spaceId = space.data!.id
      const spacedClient = createLocalDataClient(spaceId)

      await spacedClient.objectTypes.create({
        name: 'Custom', plural_name: 'Customs', slug: 'custom', icon: 'star',
      })

      await client.spaces.delete(spaceId)

      const types = await spacedClient.objectTypes.list()
      // Only the default types should remain (from the non-spaced default)
      expect(types.data.filter(t => t.space_id === spaceId).length).toBe(0)
    })

    it('cascades delete to templates in the space', async () => {
      const space = await client.spaces.create({ name: 'CascadeTemplates' })
      const spaceId = space.data!.id
      const spacedClient = createLocalDataClient(spaceId)

      const type = await spacedClient.objectTypes.create({
        name: 'Doc', plural_name: 'Docs', slug: 'doc', icon: 'file',
      })
      await spacedClient.templates.create({ name: 'Template', type_id: type.data!.id })

      await client.spaces.delete(spaceId)

      const templates = await spacedClient.templates.list()
      expect(templates.data.length).toBe(0)
    })

    it('cascades delete to tags in the space', async () => {
      const space = await client.spaces.create({ name: 'CascadeTags' })
      const spaceId = space.data!.id
      const spacedClient = createLocalDataClient(spaceId)

      await spacedClient.tags.create({ name: 'SpaceTag' })

      await client.spaces.delete(spaceId)

      const tags = await spacedClient.tags.list()
      expect(tags.data.length).toBe(0)
    })
  })
})
