import type { Tag } from '@/shared/lib/data'

export const LOCAL_DEFAULT_SPACE_ID = '99b075ae-465d-4843-a324-cc3d48a80d6e'

export function createMockTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: crypto.randomUUID(),
    space_id: LOCAL_DEFAULT_SPACE_ID,
    name: 'Test Tag',
    color: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Tag
}
