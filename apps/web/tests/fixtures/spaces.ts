import type { Space } from '@/shared/lib/data'

export const LOCAL_DEFAULT_SPACE_ID = '99b075ae-465d-4843-a324-cc3d48a80d6e'

export function createMockSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: crypto.randomUUID(),
    name: 'Test Space',
    icon: '📁',
    owner_id: crypto.randomUUID(),
    is_archived: false,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Space
}
