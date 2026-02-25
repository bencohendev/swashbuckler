import type { GraphNode, GraphEdge } from '../types'

/**
 * Clustered layout: group nodes by typeId in a circle-of-circles.
 * Cluster centers arranged in a large circle, nodes within each cluster in a smaller circle.
 */
export function clusteredLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] }

  const cx = width / 2
  const cy = height / 2

  // Group nodes by typeId
  const clusters = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    const group = clusters.get(node.typeId) ?? []
    group.push(node)
    clusters.set(node.typeId, group)
  }

  const clusterKeys = [...clusters.keys()]
  const clusterCount = clusterKeys.length

  // Outer radius for cluster centers
  const outerRadius = Math.min(width, height) / 2 * 0.55

  // If single cluster, all nodes in one circle centered in viewport
  const positionMap = new Map<string, { x: number; y: number }>()

  clusterKeys.forEach((typeId, clusterIndex) => {
    const clusterNodes = clusters.get(typeId)!

    // Position cluster center on outer circle
    let clusterCx: number, clusterCy: number
    if (clusterCount === 1) {
      clusterCx = cx
      clusterCy = cy
    } else {
      const angle = (2 * Math.PI * clusterIndex) / clusterCount - Math.PI / 2
      clusterCx = cx + outerRadius * Math.cos(angle)
      clusterCy = cy + outerRadius * Math.sin(angle)
    }

    // Arrange nodes in inner circle within their cluster
    if (clusterNodes.length === 1) {
      positionMap.set(clusterNodes[0].id, { x: clusterCx, y: clusterCy })
    } else {
      // Inner radius proportional to node count, clamped
      const innerRadius = Math.min(
        outerRadius * 0.6,
        Math.max(30, clusterNodes.length * 12),
      )
      clusterNodes.forEach((node, nodeIndex) => {
        const angle = (2 * Math.PI * nodeIndex) / clusterNodes.length - Math.PI / 2
        positionMap.set(node.id, {
          x: clusterCx + innerRadius * Math.cos(angle),
          y: clusterCy + innerRadius * Math.sin(angle),
        })
      })
    }
  })

  const positionedNodes = nodes.map((node) => {
    const pos = positionMap.get(node.id)!
    return { ...node, x: pos.x, y: pos.y }
  })

  const positionedEdges = edges.map((edge) => ({ ...edge }))

  return { nodes: positionedNodes, edges: positionedEdges }
}
