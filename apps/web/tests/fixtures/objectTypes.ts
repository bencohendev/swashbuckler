import type { ObjectType, CreateObjectTypeInput } from '@/shared/lib/data'

export const PAGE_TYPE_ID = '7a9e3a69-dbcb-466d-8a5c-391ca99b9ba4'
export const NOTE_TYPE_ID = '4a89731b-f05a-4748-8f0e-4ee4dd76615b'
export const LOCAL_DEFAULT_SPACE_ID = '99b075ae-465d-4843-a324-cc3d48a80d6e'

export function createMockObjectType(overrides: Partial<ObjectType> = {}): ObjectType {
  return {
    id: crypto.randomUUID(),
    name: 'Custom Type',
    plural_name: 'Custom Types',
    slug: 'custom-type',
    icon: 'box',
    color: null,
    fields: [],
    is_built_in: false,
    owner_id: null,
    space_id: LOCAL_DEFAULT_SPACE_ID,
    sort_order: 0,
    is_archived: false,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as ObjectType
}

export function createObjectTypeInput(overrides: Partial<CreateObjectTypeInput> = {}): CreateObjectTypeInput {
  return {
    name: 'Task',
    plural_name: 'Tasks',
    slug: 'task',
    icon: 'check-square',
    ...overrides,
  }
}
