import type { ObjectRelation } from '@/shared/lib/data'

export function createMockRelation(overrides: Partial<ObjectRelation> = {}): ObjectRelation {
  return {
    id: crypto.randomUUID(),
    source_id: crypto.randomUUID(),
    target_id: crypto.randomUUID(),
    relation_type: 'link',
    source_property: null,
    context: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as ObjectRelation
}

export function createMockMentionRelation(sourceId: string, targetId: string): ObjectRelation {
  return createMockRelation({
    source_id: sourceId,
    target_id: targetId,
    relation_type: 'mention',
  })
}

export function createMockLinkRelation(sourceId: string, targetId: string): ObjectRelation {
  return createMockRelation({
    source_id: sourceId,
    target_id: targetId,
    relation_type: 'link',
  })
}
