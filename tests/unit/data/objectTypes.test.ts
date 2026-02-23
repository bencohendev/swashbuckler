import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('Object Types (local data layer)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  describe('list', () => {
    it('returns seeded Page type', async () => {
      const result = await client.objectTypes.list()
      expect(result.data.length).toBeGreaterThanOrEqual(1)
      expect(result.data.some(t => t.slug === 'page')).toBe(true)
    })

    it('sorts by sort_order', async () => {
      await client.objectTypes.create({
        name: 'Zeta', plural_name: 'Zetas', slug: 'zeta', icon: 'z', sort_order: 99,
      })
      await client.objectTypes.create({
        name: 'Alpha', plural_name: 'Alphas', slug: 'alpha', icon: 'a', sort_order: 1,
      })

      const result = await client.objectTypes.list()
      const sortOrders = result.data.map(t => t.sort_order)
      for (let i = 1; i < sortOrders.length; i++) {
        expect(sortOrders[i]).toBeGreaterThanOrEqual(sortOrders[i - 1])
      }
    })
  })

  describe('create', () => {
    it('creates a new type', async () => {
      const result = await client.objectTypes.create({
        name: 'Task', plural_name: 'Tasks', slug: 'task', icon: 'check-square',
      })
      expect(result.error).toBeNull()
      expect(result.data!.name).toBe('Task')
      expect(result.data!.slug).toBe('task')
    })

    it('auto-calculates sort_order when not provided', async () => {
      const result = await client.objectTypes.create({
        name: 'Auto Sort', plural_name: 'Auto Sorts', slug: 'auto-sort', icon: 'list',
      })
      expect(result.data!.sort_order).toBeGreaterThan(0)
    })

    it('creates type with space_id from client', async () => {
      const space = await client.spaces.create({ name: 'Test Space' })
      const spacedClient = createLocalDataClient(space.data!.id)
      const result = await spacedClient.objectTypes.create({
        name: 'Scoped', plural_name: 'Scoped', slug: 'scoped', icon: 'box',
      })
      expect(result.data!.space_id).toBe(space.data!.id)
    })
  })

  describe('get', () => {
    it('returns type by id', async () => {
      const result = await client.objectTypes.get(PAGE_TYPE_ID)
      expect(result.data!.slug).toBe('page')
    })

    it('returns error for non-existent id', async () => {
      const result = await client.objectTypes.get('non-existent')
      expect(result.error).not.toBeNull()
    })
  })

  describe('update', () => {
    it('updates type name', async () => {
      const created = await client.objectTypes.create({
        name: 'Original', plural_name: 'Originals', slug: 'original', icon: 'edit',
      })
      const result = await client.objectTypes.update(created.data!.id, { name: 'Renamed' })
      expect(result.data!.name).toBe('Renamed')
    })

    it('updates type slug', async () => {
      const created = await client.objectTypes.create({
        name: 'Test', plural_name: 'Tests', slug: 'test-slug', icon: 'edit',
      })
      const result = await client.objectTypes.update(created.data!.id, { slug: 'new-slug' })
      expect(result.data!.slug).toBe('new-slug')
    })
  })

  describe('delete', () => {
    it('deletes a type', async () => {
      const created = await client.objectTypes.create({
        name: 'ToDelete', plural_name: 'ToDeletes', slug: 'to-delete', icon: 'trash',
      })
      await client.objectTypes.delete(created.data!.id)

      const result = await client.objectTypes.get(created.data!.id)
      expect(result.error).not.toBeNull()
    })
  })
})
