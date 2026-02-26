import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importKit } from '@/features/starter-kits/lib/importKit'
import type { StarterKit } from '@/features/starter-kits/data/kits'
import type { DataClient, ObjectType } from '@/shared/lib/data'

vi.mock('@/shared/lib/data/events', () => ({
  emit: vi.fn(),
}))

import { emit } from '@/shared/lib/data/events'

const mockedEmit = vi.mocked(emit)

function makeKit(overrides: Partial<StarterKit> = {}): StarterKit {
  return {
    id: 'test-kit',
    name: 'Test Kit',
    description: 'A test kit',
    icon: '🧪',
    category: 'Testing',
    types: [
      {
        name: 'Widget',
        plural_name: 'Widgets',
        slug: 'widget',
        icon: '⚙️',
        color: null,
        fields: [
          { name: 'Label', type: 'text', sort_order: 0 },
          { name: 'Count', type: 'number', sort_order: 1 },
        ],
      },
      {
        name: 'Gadget',
        plural_name: 'Gadgets',
        slug: 'gadget',
        icon: '🔧',
        color: null,
        fields: [
          { name: 'Size', type: 'select', options: ['Small', 'Large'], sort_order: 0 },
        ],
      },
    ],
    templates: [],
    ...overrides,
  }
}

function makeMockClient(): DataClient {
  return {
    objectTypes: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn().mockImplementation(async (input) => {
        return {
          data: { id: crypto.randomUUID(), ...input },
          error: null,
        }
      }),
      update: vi.fn(),
      delete: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
    },
    templates: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn().mockImplementation(async (input) => ({
        data: { id: crypto.randomUUID(), ...input },
        error: null,
      })),
      update: vi.fn(),
      delete: vi.fn(),
    },
    objects: {} as DataClient['objects'],
    globalObjectTypes: {} as DataClient['globalObjectTypes'],
    relations: {} as DataClient['relations'],
    spaces: {} as DataClient['spaces'],
    sharing: {} as DataClient['sharing'],
    tags: {} as DataClient['tags'],
    pins: {} as DataClient['pins'],
    isLocal: true,
  }
}

describe('importKit', () => {
  let client: DataClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = makeMockClient()
  })

  it('creates all types into an empty space', async () => {
    const kit = makeKit()
    const result = await importKit(kit, client, [])

    expect(result.created).toEqual(['Widget', 'Gadget'])
    expect(result.skipped).toEqual([])
    expect(result.errors).toEqual([])
    expect(client.objectTypes.create).toHaveBeenCalledTimes(2)
  })

  it('skips types with conflicting slugs', async () => {
    const kit = makeKit()
    const existingTypes = [
      { slug: 'widget' } as ObjectType,
    ]

    const result = await importKit(kit, client, existingTypes)

    expect(result.created).toEqual(['Gadget'])
    expect(result.skipped).toEqual(['Widget'])
    expect(client.objectTypes.create).toHaveBeenCalledTimes(1)
  })

  it('generates fresh field UUIDs', async () => {
    const kit = makeKit()
    await importKit(kit, client, [])

    const firstCall = vi.mocked(client.objectTypes.create).mock.calls[0][0]
    const secondCall = vi.mocked(client.objectTypes.create).mock.calls[1][0]

    // Fields should have UUID ids
    for (const field of firstCall.fields ?? []) {
      expect(field.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    }

    // Different types should have different field UUIDs
    const allIds = [
      ...(firstCall.fields ?? []).map((f) => f.id),
      ...(secondCall.fields ?? []).map((f) => f.id),
    ]
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('emits objectTypes when types are created', async () => {
    const kit = makeKit()
    await importKit(kit, client, [])

    expect(mockedEmit).toHaveBeenCalledWith('objectTypes')
  })

  it('does not emit when all types are skipped', async () => {
    const kit = makeKit()
    const existingTypes = [
      { slug: 'widget' } as ObjectType,
      { slug: 'gadget' } as ObjectType,
    ]

    await importKit(kit, client, existingTypes)

    expect(mockedEmit).not.toHaveBeenCalled()
  })

  it('remaps template type_slug to real type IDs', async () => {
    const kit = makeKit({
      templates: [
        {
          name: 'Default Widget',
          type_slug: 'widget',
          icon: null,
          properties: { Label: 'Default' },
          content: null,
        },
      ],
    })

    await importKit(kit, client, [])

    expect(client.templates.create).toHaveBeenCalledTimes(1)
    const templateInput = vi.mocked(client.templates.create).mock.calls[0][0]
    // type_id should be a UUID (from the created type), not the slug
    expect(templateInput.type_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(templateInput.name).toBe('Default Widget')
  })

  it('skips templates for skipped types', async () => {
    const kit = makeKit({
      templates: [
        {
          name: 'Default Widget',
          type_slug: 'widget',
          icon: null,
          properties: {},
          content: null,
        },
      ],
    })
    const existingTypes = [{ slug: 'widget' } as ObjectType]

    await importKit(kit, client, existingTypes)

    expect(client.templates.create).not.toHaveBeenCalled()
  })

  it('emits templates when kit has templates and types were created', async () => {
    const kit = makeKit({
      templates: [
        {
          name: 'Default Widget',
          type_slug: 'widget',
          icon: null,
          properties: {},
          content: null,
        },
      ],
    })

    await importKit(kit, client, [])

    expect(mockedEmit).toHaveBeenCalledWith('objectTypes')
    expect(mockedEmit).toHaveBeenCalledWith('templates')
  })

  it('records errors from failed type creation', async () => {
    vi.mocked(client.objectTypes.create).mockResolvedValueOnce({
      data: null,
      error: { message: 'Something went wrong' },
    })

    const kit = makeKit()
    const result = await importKit(kit, client, [])

    expect(result.errors).toEqual(['Widget: Something went wrong'])
    expect(result.created).toEqual(['Gadget'])
  })
})
