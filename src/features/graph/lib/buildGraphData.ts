import type { DataObject, ObjectType, ObjectRelation } from '@/shared/lib/data'
import type { GraphData, GraphNode, GraphEdge } from './types'

export function buildGraphData(
  objects: DataObject[],
  relations: ObjectRelation[],
  typeMap: Map<string, ObjectType>,
): GraphData {
  const objectIds = new Set(objects.map(o => o.id))

  // Filter relations to only include pairs where both endpoints exist
  const validRelations = relations.filter(
    r => objectIds.has(r.source_id) && objectIds.has(r.target_id)
  )

  // Count connections per node
  const connectionCounts = new Map<string, number>()
  for (const r of validRelations) {
    connectionCounts.set(r.source_id, (connectionCounts.get(r.source_id) ?? 0) + 1)
    connectionCounts.set(r.target_id, (connectionCounts.get(r.target_id) ?? 0) + 1)
  }

  const nodes: GraphNode[] = objects.map(obj => {
    const objectType = typeMap.get(obj.type_id)
    return {
      id: obj.id,
      title: obj.title,
      typeId: obj.type_id,
      typeName: objectType?.name ?? 'Unknown',
      typeColor: objectType?.color ?? null,
      typeIcon: objectType?.icon ?? 'file',
      connectionCount: connectionCounts.get(obj.id) ?? 0,
    }
  })

  const edges: GraphEdge[] = validRelations.map(r => ({
    id: r.id,
    source: r.source_id,
    target: r.target_id,
    sourceId: r.source_id,
    targetId: r.target_id,
    relationType: r.relation_type,
  }))

  return { nodes, edges }
}
