export const mockObject = {
  id: 'obj-1',
  title: 'Test Object',
  type: 'page',
  owner_id: 'test-user-id',
  parent_id: null,
  icon: '📄',
  cover_image: null,
  properties: {},
  content: null,
  is_template: false,
  is_deleted: false,
  deleted_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockObjects = [
  mockObject,
  {
    ...mockObject,
    id: 'obj-2',
    title: 'Second Object',
    type: 'note',
  },
  {
    ...mockObject,
    id: 'obj-3',
    title: 'Third Object',
    type: 'page',
    parent_id: 'obj-1',
  },
]

export const mockNote = {
  ...mockObject,
  id: 'note-1',
  title: 'Test Note',
  type: 'note',
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

export function createMockObject(overrides = {}) {
  return {
    ...mockObject,
    id: `obj-${Math.random().toString(36).slice(2, 9)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}
