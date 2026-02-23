import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('Pins (local data layer)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  describe('pin', () => {
    it('pins an object', async () => {
      const obj = await client.objects.create({ title: 'Pinned', type_id: PAGE_TYPE_ID })
      const result = await client.pins.pin(obj.data!.id)
      expect(result.error).toBeNull()
      expect(result.data!.object_id).toBe(obj.data!.id)
    })

    it('returns existing pin on duplicate', async () => {
      const obj = await client.objects.create({ title: 'Dup Pin', type_id: PAGE_TYPE_ID })
      const first = await client.pins.pin(obj.data!.id)
      const second = await client.pins.pin(obj.data!.id)
      expect(second.data!.id).toBe(first.data!.id)
    })
  })

  describe('unpin', () => {
    it('unpins an object', async () => {
      const obj = await client.objects.create({ title: 'Unpin', type_id: PAGE_TYPE_ID })
      await client.pins.pin(obj.data!.id)
      await client.pins.unpin(obj.data!.id)

      const isPinned = await client.pins.isPinned(obj.data!.id)
      expect(isPinned).toBe(false)
    })
  })

  describe('list', () => {
    it('returns empty list initially', async () => {
      const result = await client.pins.list()
      expect(result.data).toEqual([])
    })

    it('returns pins sorted by created_at descending', async () => {
      const obj1 = await client.objects.create({ title: 'First', type_id: PAGE_TYPE_ID })
      const obj2 = await client.objects.create({ title: 'Second', type_id: PAGE_TYPE_ID })

      await client.pins.pin(obj1.data!.id)
      await new Promise(r => setTimeout(r, 10))
      await client.pins.pin(obj2.data!.id)

      const result = await client.pins.list()
      expect(result.data.length).toBe(2)
      expect(result.data[0].object_id).toBe(obj2.data!.id) // most recent first
    })
  })

  describe('isPinned', () => {
    it('returns true for pinned object', async () => {
      const obj = await client.objects.create({ title: 'Check', type_id: PAGE_TYPE_ID })
      await client.pins.pin(obj.data!.id)

      expect(await client.pins.isPinned(obj.data!.id)).toBe(true)
    })

    it('returns false for unpinned object', async () => {
      const obj = await client.objects.create({ title: 'Check', type_id: PAGE_TYPE_ID })

      expect(await client.pins.isPinned(obj.data!.id)).toBe(false)
    })

    it('returns false after unpin', async () => {
      const obj = await client.objects.create({ title: 'Check', type_id: PAGE_TYPE_ID })
      await client.pins.pin(obj.data!.id)
      await client.pins.unpin(obj.data!.id)

      expect(await client.pins.isPinned(obj.data!.id)).toBe(false)
    })
  })
})
