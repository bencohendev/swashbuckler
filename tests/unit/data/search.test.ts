import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalDataClient, clearLocalData } from '@/shared/lib/data/local'
import type { DataClient } from '@/shared/lib/data/types'

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

describe('Search (local data layer)', () => {
  let client: DataClient

  beforeEach(async () => {
    client = createLocalDataClient()
    await clearLocalData()
  })

  it('finds objects by title', async () => {
    await client.objects.create({ title: 'Meeting Notes', type_id: PAGE_TYPE_ID })
    await client.objects.create({ title: 'Project Plan', type_id: PAGE_TYPE_ID })

    const result = await client.objects.search('meeting')
    expect(result.data.length).toBe(1)
    expect(result.data[0].title).toBe('Meeting Notes')
  })

  it('searches content text (not just title)', async () => {
    await client.objects.create({
      title: 'Untitled',
      type_id: PAGE_TYPE_ID,
      content: [{ type: 'p', children: [{ text: 'secret keyword here' }] }],
    })

    const result = await client.objects.search('secret')
    expect(result.data.length).toBe(1)
  })

  it('is case insensitive', async () => {
    await client.objects.create({ title: 'UPPERCASE Title', type_id: PAGE_TYPE_ID })

    const result = await client.objects.search('uppercase')
    expect(result.data.length).toBe(1)
  })

  it('excludes deleted objects', async () => {
    const obj = await client.objects.create({ title: 'Deleted Item', type_id: PAGE_TYPE_ID })
    await client.objects.delete(obj.data!.id)

    const result = await client.objects.search('deleted')
    expect(result.data.length).toBe(0)
  })

  it('filters by typeIds when provided', async () => {
    const noteType = await client.objectTypes.create({
      name: 'Note', plural_name: 'Notes', slug: 'note', icon: 'sticky-note',
    })
    await client.objects.create({ title: 'Page Match', type_id: PAGE_TYPE_ID })
    await client.objects.create({ title: 'Note Match', type_id: noteType.data!.id })

    const result = await client.objects.search('match', { typeIds: [PAGE_TYPE_ID] })
    expect(result.data.length).toBe(1)
    expect(result.data[0].title).toBe('Page Match')
  })

  it('returns results sorted by updated_at descending', async () => {
    const first = await client.objects.create({ title: 'Alpha Search', type_id: PAGE_TYPE_ID })
    await new Promise(r => setTimeout(r, 10))
    await client.objects.create({ title: 'Beta Search', type_id: PAGE_TYPE_ID })
    await new Promise(r => setTimeout(r, 10))
    await client.objects.update(first.data!.id, { title: 'Alpha Search Updated' })

    const result = await client.objects.search('search')
    expect(result.data[0].title).toBe('Alpha Search Updated')
  })

  it('returns empty for no matches', async () => {
    await client.objects.create({ title: 'Something Else', type_id: PAGE_TYPE_ID })

    const result = await client.objects.search('nonexistent')
    expect(result.data.length).toBe(0)
  })

  it('limits results', async () => {
    // Create many objects
    for (let i = 0; i < 55; i++) {
      await client.objects.create({ title: `Bulk Item ${i}`, type_id: PAGE_TYPE_ID })
    }

    const result = await client.objects.search('bulk')
    expect(result.data.length).toBeLessThanOrEqual(50) // max 50 results
  })
})
