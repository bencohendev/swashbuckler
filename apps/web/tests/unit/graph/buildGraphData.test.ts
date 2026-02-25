import { describe, it, expect } from 'vitest'
import { buildGraphData } from '@/features/graph/lib/buildGraphData'
import { buildTypeColorMap } from '@/features/graph/lib/colors'
import type { DataObject, ObjectType, ObjectRelation } from '@/shared/lib/data'

function createObject(overrides: Partial<DataObject> = {}): DataObject {
  return {
    id: crypto.randomUUID(),
    title: 'Test Object',
    type_id: 'type-1',
    owner_id: null,
    space_id: 'space-1',
    parent_id: null,
    icon: null,
    cover_image: null,
    properties: {},
    content: null,
    is_deleted: false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as DataObject
}

function createObjectType(overrides: Partial<ObjectType> = {}): ObjectType {
  return {
    id: crypto.randomUUID(),
    name: 'Page',
    plural_name: 'Pages',
    slug: 'page',
    icon: 'file',
    color: null,
    fields: [],
    is_built_in: false,
    owner_id: null,
    space_id: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as ObjectType
}

function createRelation(overrides: Partial<ObjectRelation> = {}): ObjectRelation {
  return {
    id: crypto.randomUUID(),
    source_id: '',
    target_id: '',
    relation_type: 'link',
    source_property: null,
    context: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as ObjectRelation
}

// ---------------------------------------------------------------------------
// buildTypeColorMap
// ---------------------------------------------------------------------------

describe('buildTypeColorMap', () => {
  it('returns empty map for empty iterable', () => {
    const result = buildTypeColorMap([])
    expect(result.size).toBe(0)
  })

  it('uses explicit color when set on type', () => {
    const types = [{ id: 'type-a', color: '#ff0000' }]
    const result = buildTypeColorMap(types)
    expect(result.get('type-a')).toBe('#ff0000')
  })

  it('assigns a palette color when type has no explicit color', () => {
    const types = [{ id: 'type-b', color: null }]
    const result = buildTypeColorMap(types)
    const color = result.get('type-b')
    expect(color).toBeDefined()
    expect(color).not.toBeNull()
    // Should be a hex color from the palette
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('is deterministic: same id always gets the same color', () => {
    const types = [{ id: 'stable-id', color: null }]
    const result1 = buildTypeColorMap(types)
    const result2 = buildTypeColorMap(types)
    expect(result1.get('stable-id')).toBe(result2.get('stable-id'))
  })

  it('handles a mix of explicit and palette colors', () => {
    const types = [
      { id: 'explicit-type', color: '#abcdef' },
      { id: 'palette-type', color: null },
    ]
    const result = buildTypeColorMap(types)
    expect(result.get('explicit-type')).toBe('#abcdef')
    expect(result.get('palette-type')).toMatch(/^#[0-9a-f]{6}$/i)
    expect(result.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// buildGraphData
// ---------------------------------------------------------------------------

describe('buildGraphData', () => {
  it('returns empty nodes and edges for empty inputs', () => {
    const result = buildGraphData([], [], new Map())
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('creates nodes from objects with correct properties', () => {
    const typeId = crypto.randomUUID()
    const objType = createObjectType({
      id: typeId,
      plural_name: 'Tasks',
      icon: 'check-square',
    })
    const obj = createObject({
      title: 'My Task',
      type_id: typeId,
      icon: 'star',
    })
    const typeMap = new Map([[typeId, objType]])
    const result = buildGraphData([obj], [], typeMap)

    expect(result.nodes).toHaveLength(1)
    const node = result.nodes[0]
    expect(node.id).toBe(obj.id)
    expect(node.title).toBe('My Task')
    expect(node.typeId).toBe(typeId)
    expect(node.typeName).toBe('Tasks')
    expect(node.typeIcon).toBe('check-square')
    expect(node.icon).toBe('star')
  })

  it('sets connectionCount to 0 when there are no relations', () => {
    const typeId = crypto.randomUUID()
    const objType = createObjectType({ id: typeId })
    const obj = createObject({ type_id: typeId })
    const typeMap = new Map([[typeId, objType]])
    const result = buildGraphData([obj], [], typeMap)

    expect(result.nodes[0].connectionCount).toBe(0)
  })

  it('filters out relations with dangling source_id', () => {
    const typeId = crypto.randomUUID()
    const objType = createObjectType({ id: typeId })
    const obj = createObject({ type_id: typeId })
    const typeMap = new Map([[typeId, objType]])

    const danglingRelation = createRelation({
      source_id: crypto.randomUUID(), // not in objects
      target_id: obj.id,
    })

    const result = buildGraphData([obj], [danglingRelation], typeMap)
    expect(result.edges).toHaveLength(0)
  })

  it('filters out relations with dangling target_id', () => {
    const typeId = crypto.randomUUID()
    const objType = createObjectType({ id: typeId })
    const obj = createObject({ type_id: typeId })
    const typeMap = new Map([[typeId, objType]])

    const danglingRelation = createRelation({
      source_id: obj.id,
      target_id: crypto.randomUUID(), // not in objects
    })

    const result = buildGraphData([obj], [danglingRelation], typeMap)
    expect(result.edges).toHaveLength(0)
  })

  it('creates an edge with correct source and target for valid relation', () => {
    const typeId = crypto.randomUUID()
    const objType = createObjectType({ id: typeId })
    const objA = createObject({ type_id: typeId })
    const objB = createObject({ type_id: typeId })
    const typeMap = new Map([[typeId, objType]])

    const relation = createRelation({
      source_id: objA.id,
      target_id: objB.id,
      relation_type: 'mention',
    })

    const result = buildGraphData([objA, objB], [relation], typeMap)
    expect(result.edges).toHaveLength(1)
    const edge = result.edges[0]
    expect(edge.id).toBe(relation.id)
    expect(edge.source).toBe(objA.id)
    expect(edge.target).toBe(objB.id)
    expect(edge.sourceId).toBe(objA.id)
    expect(edge.targetId).toBe(objB.id)
    expect(edge.relationType).toBe('mention')
  })

  it('increments connectionCount for both endpoints of a relation', () => {
    const typeId = crypto.randomUUID()
    const objType = createObjectType({ id: typeId })
    const objA = createObject({ type_id: typeId })
    const objB = createObject({ type_id: typeId })
    const objC = createObject({ type_id: typeId })
    const typeMap = new Map([[typeId, objType]])

    const relations = [
      createRelation({ source_id: objA.id, target_id: objB.id }),
      createRelation({ source_id: objA.id, target_id: objC.id }),
    ]

    const result = buildGraphData([objA, objB, objC], relations, typeMap)
    const nodeMap = new Map(result.nodes.map(n => [n.id, n]))

    // objA is source in both relations => 2
    expect(nodeMap.get(objA.id)!.connectionCount).toBe(2)
    // objB is target in one relation => 1
    expect(nodeMap.get(objB.id)!.connectionCount).toBe(1)
    // objC is target in one relation => 1
    expect(nodeMap.get(objC.id)!.connectionCount).toBe(1)
  })

  it('uses "Unknown" for typeName when type_id is not in typeMap', () => {
    const missingTypeId = crypto.randomUUID()
    const obj = createObject({ type_id: missingTypeId })
    const result = buildGraphData([obj], [], new Map())

    expect(result.nodes[0].typeName).toBe('Unknown')
  })

  it('uses "file" for typeIcon when type_id is not in typeMap', () => {
    const missingTypeId = crypto.randomUUID()
    const obj = createObject({ type_id: missingTypeId })
    const result = buildGraphData([obj], [], new Map())

    expect(result.nodes[0].typeIcon).toBe('file')
  })

  it('assigns typeColor from buildTypeColorMap', () => {
    const typeId = crypto.randomUUID()
    const objType = createObjectType({ id: typeId, color: '#123456' })
    const obj = createObject({ type_id: typeId })
    const typeMap = new Map([[typeId, objType]])

    const result = buildGraphData([obj], [], typeMap)
    expect(result.nodes[0].typeColor).toBe('#123456')
  })
})
