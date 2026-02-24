import type { ListObjectsOptions } from './types'

export const queryKeys = {
  objects: {
    all: (spaceId?: string) => ['objects', spaceId] as const,
    list: (spaceId?: string, options?: ListObjectsOptions) => ['objects', spaceId, 'list', options] as const,
    detail: (id: string) => ['objects', 'detail', id] as const,
  },
  objectTypes: {
    all: (spaceId?: string) => ['objectTypes', spaceId] as const,
    list: (spaceId?: string) => ['objectTypes', spaceId, 'list'] as const,
    detail: (id: string) => ['objectTypes', 'detail', id] as const,
  },
  tags: {
    all: (spaceId?: string) => ['tags', spaceId] as const,
    list: (spaceId?: string) => ['tags', spaceId, 'list'] as const,
    objectTags: (objectId: string) => ['tags', 'objectTags', objectId] as const,
    objectTagsBatch: (objectIds: string[]) => ['tags', 'objectTagsBatch', objectIds] as const,
    objectsByTag: (tagId: string) => ['tags', 'objectsByTag', tagId] as const,
  },
  pins: {
    list: (spaceId?: string) => ['pins', spaceId] as const,
  },
  templates: {
    all: (spaceId?: string) => ['templates', spaceId] as const,
    list: (spaceId?: string, typeId?: string) => ['templates', spaceId, 'list', typeId] as const,
  },
  relations: {
    list: (objectId: string) => ['relations', objectId] as const,
  },
  shares: {
    list: (spaceId: string) => ['shares', spaceId] as const,
  },
}
