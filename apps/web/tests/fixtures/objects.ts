// Valid RFC4122 UUIDs for testing (must pass Zod 4 strict UUID validation)
const PAGE_TYPE_ID = '7a9e3a69-dbcb-466d-8a5c-391ca99b9ba4'
const NOTE_TYPE_ID = '4a89731b-f05a-4748-8f0e-4ee4dd76615b'
const LOCAL_DEFAULT_SPACE_ID = '99b075ae-465d-4843-a324-cc3d48a80d6e'

export const mockObject = {
  id: '94679fd3-108a-4cbb-892b-aa3366b20061',
  title: 'Test Object',
  type_id: PAGE_TYPE_ID,
  owner_id: null,
  space_id: LOCAL_DEFAULT_SPACE_ID,
  parent_id: null,
  icon: '📄',
  cover_image: null,
  properties: {},
  content: null,
  is_deleted: false,
  deleted_at: null,
  is_archived: false,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockObjects = [
  mockObject,
  {
    ...mockObject,
    id: 'c6c6f62c-3061-4692-9aac-7ac65be12230',
    title: 'Second Object',
    type_id: NOTE_TYPE_ID,
  },
  {
    ...mockObject,
    id: 'b1d2e3f4-5678-4abc-9def-012345678901',
    title: 'Third Object',
    type_id: PAGE_TYPE_ID,
    parent_id: '94679fd3-108a-4cbb-892b-aa3366b20061',
  },
]

export const mockNote = {
  ...mockObject,
  id: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
  title: 'Test Note',
  type_id: NOTE_TYPE_ID,
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      },
    ],
  },
}

export function createMockObject(overrides: Record<string, unknown> = {}) {
  return {
    ...mockObject,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export { PAGE_TYPE_ID, NOTE_TYPE_ID, LOCAL_DEFAULT_SPACE_ID }
