import { describe, it, expect } from 'vitest'
import { queryKeys } from '@/shared/lib/data/queryKeys'

describe('queryKeys', () => {
  const spaceId = 'abc123'

  describe('objects', () => {
    it('all() includes spaceId', () => {
      expect(queryKeys.objects.all(spaceId)).toEqual(['objects', spaceId])
    })

    it('list() includes spaceId and options', () => {
      const options = { typeId: 'type-1' }
      expect(queryKeys.objects.list(spaceId, options)).toEqual([
        'objects', spaceId, 'list', options,
      ])
    })

    it('detail() includes id', () => {
      expect(queryKeys.objects.detail('obj-1')).toEqual(['objects', 'detail', 'obj-1'])
    })
  })

  describe('objectTypes', () => {
    it('all() includes spaceId', () => {
      expect(queryKeys.objectTypes.all(spaceId)).toEqual(['objectTypes', spaceId])
    })

    it('list() includes spaceId', () => {
      expect(queryKeys.objectTypes.list(spaceId)).toEqual(['objectTypes', spaceId, 'list'])
    })

    it('detail() includes id', () => {
      expect(queryKeys.objectTypes.detail('type-1')).toEqual(['objectTypes', 'detail', 'type-1'])
    })
  })

  describe('tags', () => {
    it('all() includes spaceId', () => {
      expect(queryKeys.tags.all(spaceId)).toEqual(['tags', spaceId])
    })

    it('objectTags() includes objectId', () => {
      expect(queryKeys.tags.objectTags('obj-1')).toEqual(['tags', 'objectTags', 'obj-1'])
    })

    it('objectTagsBatch() includes objectIds', () => {
      const ids = ['obj-1', 'obj-2']
      expect(queryKeys.tags.objectTagsBatch(ids)).toEqual(['tags', 'objectTagsBatch', ids])
    })

    it('objectsByTag() includes tagId', () => {
      expect(queryKeys.tags.objectsByTag('tag-1')).toEqual(['tags', 'objectsByTag', 'tag-1'])
    })
  })

  describe('pins', () => {
    it('list() includes spaceId', () => {
      expect(queryKeys.pins.list(spaceId)).toEqual(['pins', spaceId])
    })
  })

  describe('templates', () => {
    it('all() includes spaceId', () => {
      expect(queryKeys.templates.all(spaceId)).toEqual(['templates', spaceId])
    })

    it('list() includes spaceId and typeId', () => {
      expect(queryKeys.templates.list(spaceId, 'type-1')).toEqual([
        'templates', spaceId, 'list', 'type-1',
      ])
    })
  })

  describe('relations', () => {
    it('list() includes objectId', () => {
      expect(queryKeys.relations.list('obj-1')).toEqual(['relations', 'obj-1'])
    })
  })

  describe('key uniqueness', () => {
    it('different entities produce different keys', () => {
      const objAll = queryKeys.objects.all(spaceId)
      const typeAll = queryKeys.objectTypes.all(spaceId)
      const tagAll = queryKeys.tags.all(spaceId)

      expect(objAll).not.toEqual(typeAll)
      expect(objAll).not.toEqual(tagAll)
      expect(typeAll).not.toEqual(tagAll)
    })

    it('different spaceIds produce different keys', () => {
      const key1 = queryKeys.objects.all('space-1')
      const key2 = queryKeys.objects.all('space-2')
      expect(key1).not.toEqual(key2)
    })

    it('different options produce different keys', () => {
      const key1 = queryKeys.objects.list(spaceId, { typeId: 'type-1' })
      const key2 = queryKeys.objects.list(spaceId, { typeId: 'type-2' })
      expect(key1).not.toEqual(key2)
    })
  })
})
