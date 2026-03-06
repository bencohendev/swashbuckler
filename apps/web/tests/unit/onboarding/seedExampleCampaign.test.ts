import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedExampleCampaign } from '@/features/onboarding/lib/seedExampleCampaign'
import { CAMPAIGN_TYPES, CAMPAIGN_ENTRIES } from '@/features/onboarding/lib/exampleCampaign'
import type { DataClient } from '@/shared/lib/data'

vi.mock('@/shared/lib/data/events', () => ({
  emit: vi.fn(),
}))

vi.mock('@/features/relations/lib/extractMentions', () => ({
  extractMentionIds: vi.fn().mockReturnValue(['fake-id']),
}))

function makeMockClient(): DataClient {
  const typeIdMap = new Map<string, string>()
  const objectIdMap = new Map<string, string>()
  let typeCallCount = 0
  let objectCallCount = 0

  return {
    objectTypes: {
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      get: vi.fn(),
      create: vi.fn().mockImplementation(async () => {
        const id = crypto.randomUUID()
        const key = CAMPAIGN_TYPES[typeCallCount]?.key
        if (key) typeIdMap.set(key, id)
        typeCallCount++
        return { data: { id }, error: null }
      }),
      update: vi.fn(),
      delete: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
    },
    objects: {
      list: vi.fn(),
      listContent: vi.fn(),
      get: vi.fn(),
      create: vi.fn().mockImplementation(async () => {
        const id = crypto.randomUUID()
        const key = CAMPAIGN_ENTRIES[objectCallCount]?.key
        if (key) objectIdMap.set(key, id)
        objectCallCount++
        return { data: { id }, error: null }
      }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn(),
      restore: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
      search: vi.fn(),
      batchGetSummary: vi.fn(),
      purgeExpired: vi.fn(),
    },
    relations: {
      list: vi.fn(),
      listAll: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteBySourceAndTarget: vi.fn(),
      syncMentions: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    templates: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    globalObjectTypes: {} as DataClient['globalObjectTypes'],
    spaces: {} as DataClient['spaces'],
    sharing: {} as DataClient['sharing'],
    tags: {} as DataClient['tags'],
    pins: {} as DataClient['pins'],
    savedViews: {} as DataClient['savedViews'],
    isLocal: true,
  }
}

describe('seedExampleCampaign', () => {
  let client: DataClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = makeMockClient()
  })

  it('creates all campaign types', async () => {
    await seedExampleCampaign(client)
    expect(client.objectTypes.create).toHaveBeenCalledTimes(CAMPAIGN_TYPES.length)
  })

  it('creates all campaign entries', async () => {
    await seedExampleCampaign(client)
    expect(client.objects.create).toHaveBeenCalledTimes(CAMPAIGN_ENTRIES.length)
  })

  it('returns the overview entry ID', async () => {
    const result = await seedExampleCampaign(client)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('reuses existing types instead of creating duplicates', async () => {
    const existingPageId = crypto.randomUUID()
    vi.mocked(client.objectTypes.list).mockResolvedValueOnce({
      data: [{ id: existingPageId, slug: 'page', name: 'Page' }] as never,
      error: null,
    })

    await seedExampleCampaign(client)

    // Page type already exists, so one fewer create call
    expect(client.objectTypes.create).toHaveBeenCalledTimes(CAMPAIGN_TYPES.length - 1)

    // Existing type should have its icon updated
    expect(client.objectTypes.update).toHaveBeenCalledWith(existingPageId, { icon: '📄' })

    // Entries with typeKey 'page' should use the existing type ID
    const createCalls = vi.mocked(client.objects.create).mock.calls
    const overviewCall = createCalls.find(([input]) => input.title === 'Campaign Overview')
    expect(overviewCall?.[0].type_id).toBe(existingPageId)
  })

  it('patches entries with real IDs and syncs mentions', async () => {
    await seedExampleCampaign(client)
    // Every entry with mentions gets an update + syncMentions call
    expect(client.objects.update).toHaveBeenCalled()
    expect(client.relations.syncMentions).toHaveBeenCalled()
  })
})

describe('campaign data integrity', () => {
  it('all entry typeKeys reference a valid type key', () => {
    const typeKeys = new Set(CAMPAIGN_TYPES.map(t => t.key))
    for (const entry of CAMPAIGN_ENTRIES) {
      expect(typeKeys.has(entry.typeKey)).toBe(true)
    }
  })

  it('has unique entry keys', () => {
    const keys = CAMPAIGN_ENTRIES.map(e => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('has unique type keys', () => {
    const keys = CAMPAIGN_TYPES.map(t => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('has a campaign overview entry', () => {
    expect(CAMPAIGN_ENTRIES.find(e => e.key === 'overview')).toBeTruthy()
  })
})
