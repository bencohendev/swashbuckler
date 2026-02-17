import type { GraphNode, GraphEdge } from '../types'

export interface TreeNode {
  id: string
  children: TreeNode[]
}

export interface SpanningTreeResult {
  root: TreeNode
  /** Edge IDs that are in the graph but not part of the spanning tree */
  crossEdgeIds: Set<string>
  /** Whether a virtual root was inserted (multiple connected components) */
  hasVirtualRoot: boolean
}

/**
 * Build a spanning tree from a general graph via BFS.
 *
 * 1. Build undirected adjacency list from edges
 * 2. BFS from the most-connected node (best root for a balanced tree)
 * 3. For disconnected components: BFS again from next most-connected unvisited node
 * 4. Join multiple roots under a virtual root (not rendered)
 * 5. Return d3-hierarchy-compatible tree + set of cross-edge IDs
 */
export function buildSpanningTree(
  nodes: GraphNode[],
  edges: GraphEdge[],
): SpanningTreeResult {
  if (nodes.length === 0) {
    return {
      root: { id: '__virtual_root__', children: [] },
      crossEdgeIds: new Set(),
      hasVirtualRoot: true,
    }
  }

  // Build undirected adjacency list
  const adj = new Map<string, Set<string>>()
  for (const node of nodes) {
    adj.set(node.id, new Set())
  }
  for (const edge of edges) {
    adj.get(edge.sourceId)?.add(edge.targetId)
    adj.get(edge.targetId)?.add(edge.sourceId)
  }

  // Sort nodes by connection count descending to pick best root
  const sortedNodes = [...nodes].sort((a, b) => b.connectionCount - a.connectionCount)

  const visited = new Set<string>()
  const treeEdgeKeys = new Set<string>()
  const componentRoots: TreeNode[] = []

  // BFS to build a tree from a starting node
  function bfs(startId: string): TreeNode {
    const treeNodeMap = new Map<string, TreeNode>()
    const root: TreeNode = { id: startId, children: [] }
    treeNodeMap.set(startId, root)
    visited.add(startId)

    const queue = [startId]
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const current = treeNodeMap.get(currentId)!
      const neighbors = adj.get(currentId) ?? new Set()

      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue
        visited.add(neighborId)

        const child: TreeNode = { id: neighborId, children: [] }
        current.children.push(child)
        treeNodeMap.set(neighborId, child)
        queue.push(neighborId)

        // Track this as a tree edge (both directions)
        treeEdgeKeys.add(`${currentId}:${neighborId}`)
        treeEdgeKeys.add(`${neighborId}:${currentId}`)
      }
    }

    return root
  }

  // Process all connected components
  for (const node of sortedNodes) {
    if (!visited.has(node.id)) {
      componentRoots.push(bfs(node.id))
    }
  }

  // Find cross-edges (edges not in the spanning tree)
  const crossEdgeIds = new Set<string>()
  for (const edge of edges) {
    const key = `${edge.sourceId}:${edge.targetId}`
    if (!treeEdgeKeys.has(key)) {
      crossEdgeIds.add(edge.id)
    }
  }

  // Single component: return its root directly
  if (componentRoots.length === 1) {
    return {
      root: componentRoots[0],
      crossEdgeIds,
      hasVirtualRoot: false,
    }
  }

  // Multiple components: join under virtual root
  return {
    root: { id: '__virtual_root__', children: componentRoots },
    crossEdgeIds,
    hasVirtualRoot: true,
  }
}
