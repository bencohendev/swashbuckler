import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('Relations (local data layer)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  // Helper to create two objects and return their IDs
  async function createTwoObjects() {
    const a = await client.objects.create({ title: 'Object A', type_id: PAGE_TYPE_ID })
    const b = await client.objects.create({ title: 'Object B', type_id: PAGE_TYPE_ID })
    return { aId: a.data!.id, bId: b.data!.id }
  }

  describe('create', () => {
    it('creates a link relation between two objects', async () => {
      const { aId, bId } = await createTwoObjects()
      const result = await client.relations.create({
        source_id: aId,
        target_id: bId,
        relation_type: 'link',
      })
      expect(result.error).toBeNull()
      expect(result.data!.source_id).toBe(aId)
      expect(result.data!.target_id).toBe(bId)
      expect(result.data!.relation_type).toBe('link')
    })

    it('creates a mention relation', async () => {
      const { aId, bId } = await createTwoObjects()
      const result = await client.relations.create({
        source_id: aId,
        target_id: bId,
        relation_type: 'mention',
      })
      expect(result.error).toBeNull()
      expect(result.data!.relation_type).toBe('mention')
    })

    it('prevents self-referencing relation', async () => {
      const obj = await client.objects.create({ title: 'Self', type_id: PAGE_TYPE_ID })
      const id = obj.data!.id
      const result = await client.relations.create({
        source_id: id,
        target_id: id,
        relation_type: 'link',
      })
      expect(result.error).not.toBeNull()
      expect(result.data).toBeNull()
    })

    it('returns existing relation on duplicate', async () => {
      const { aId, bId } = await createTwoObjects()
      const first = await client.relations.create({
        source_id: aId,
        target_id: bId,
        relation_type: 'link',
      })
      const second = await client.relations.create({
        source_id: aId,
        target_id: bId,
        relation_type: 'link',
      })
      expect(second.data!.id).toBe(first.data!.id)
    })

    it('allows same source/target with different relation types', async () => {
      const { aId, bId } = await createTwoObjects()
      const link = await client.relations.create({
        source_id: aId,
        target_id: bId,
        relation_type: 'link',
      })
      const mention = await client.relations.create({
        source_id: aId,
        target_id: bId,
        relation_type: 'mention',
      })
      expect(link.data!.id).not.toBe(mention.data!.id)
    })
  })

  describe('list', () => {
    it('lists relations for an object (source and target)', async () => {
      const { aId, bId } = await createTwoObjects()
      const c = await client.objects.create({ title: 'Object C', type_id: PAGE_TYPE_ID })
      const cId = c.data!.id

      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'link' })
      await client.relations.create({ source_id: cId, target_id: aId, relation_type: 'link' })

      const result = await client.relations.list({ objectId: aId })
      expect(result.data.length).toBe(2)
    })

    it('filters by relation type', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'link' })
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'mention' })

      const result = await client.relations.list({ objectId: aId, relationType: 'link' })
      expect(result.data.length).toBe(1)
      expect(result.data[0].relation_type).toBe('link')
    })
  })

  describe('listAll', () => {
    it('returns all relations', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'link' })

      const result = await client.relations.listAll()
      expect(result.data.length).toBe(1)
    })

    it('filters by relation type', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'link' })
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'mention' })

      const result = await client.relations.listAll({ relationType: 'mention' })
      expect(result.data.length).toBe(1)
    })
  })

  describe('delete', () => {
    it('deletes a relation by id', async () => {
      const { aId, bId } = await createTwoObjects()
      const created = await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'link' })

      await client.relations.delete(created.data!.id)

      const result = await client.relations.list({ objectId: aId })
      expect(result.data.length).toBe(0)
    })
  })

  describe('deleteBySourceAndTarget', () => {
    it('deletes all relations between source and target', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'link' })
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'mention' })

      await client.relations.deleteBySourceAndTarget(aId, bId)

      const result = await client.relations.list({ objectId: aId })
      expect(result.data.length).toBe(0)
    })

    it('deletes only matching relation type when specified', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'link' })
      await client.relations.create({ source_id: aId, target_id: bId, relation_type: 'mention' })

      await client.relations.deleteBySourceAndTarget(aId, bId, 'link')

      const result = await client.relations.list({ objectId: aId })
      expect(result.data.length).toBe(1)
      expect(result.data[0].relation_type).toBe('mention')
    })
  })

  describe('syncMentions', () => {
    it('adds new mention relations', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.syncMentions(aId, [bId])

      const result = await client.relations.list({ objectId: aId, relationType: 'mention' })
      expect(result.data.length).toBe(1)
      expect(result.data[0].target_id).toBe(bId)
    })

    it('removes old mention relations not in new list', async () => {
      const { aId, bId } = await createTwoObjects()
      const c = await client.objects.create({ title: 'Object C', type_id: PAGE_TYPE_ID })
      const cId = c.data!.id

      await client.relations.syncMentions(aId, [bId, cId])
      await client.relations.syncMentions(aId, [cId]) // remove B

      const result = await client.relations.list({ objectId: aId, relationType: 'mention' })
      expect(result.data.length).toBe(1)
      expect(result.data[0].target_id).toBe(cId)
    })

    it('is idempotent', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.syncMentions(aId, [bId])
      await client.relations.syncMentions(aId, [bId])

      const result = await client.relations.list({ objectId: aId, relationType: 'mention' })
      expect(result.data.length).toBe(1)
    })

    it('skips self-references', async () => {
      const obj = await client.objects.create({ title: 'Self', type_id: PAGE_TYPE_ID })
      const id = obj.data!.id
      await client.relations.syncMentions(id, [id])

      const result = await client.relations.list({ objectId: id, relationType: 'mention' })
      expect(result.data.length).toBe(0)
    })

    it('clears all mentions when given empty array', async () => {
      const { aId, bId } = await createTwoObjects()
      await client.relations.syncMentions(aId, [bId])
      await client.relations.syncMentions(aId, [])

      const result = await client.relations.list({ objectId: aId, relationType: 'mention' })
      expect(result.data.length).toBe(0)
    })
  })
})
