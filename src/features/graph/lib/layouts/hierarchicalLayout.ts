import { hierarchy, tree } from 'd3-hierarchy'
import type { GraphNode, GraphEdge } from '../types'
import { buildSpanningTree, type TreeNode } from './buildSpanningTree'

const NODE_SPACING_X = 160
const NODE_SPACING_Y = 100

/**
 * Top-down tree layout using d3.tree() on a BFS spanning tree.
 * Uses nodeSize for consistent spacing regardless of tree width.
 */
export function hierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] }

  const { root, hasVirtualRoot } = buildSpanningTree(nodes, edges)

  const root_h = hierarchy<TreeNode>(root, (d) => d.children)
  const treeLayout = tree<TreeNode>()
    .nodeSize([NODE_SPACING_X, NODE_SPACING_Y])
    .separation((a, b) => a.parent === b.parent ? 1 : 1.2)
  treeLayout(root_h)

  // Build position map from tree layout
  const positionMap = new Map<string, { x: number; y: number }>()
  root_h.each((treeNode) => {
    if (treeNode.data.id === '__virtual_root__') return
    // d3.tree: x = horizontal spread, y = depth
    positionMap.set(treeNode.data.id, {
      x: treeNode.x!,
      y: treeNode.y!,
    })
  })

  // Center the layout in the viewport
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const pos of positionMap.values()) {
    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x)
    minY = Math.min(minY, pos.y)
    maxY = Math.max(maxY, pos.y)
  }

  const layoutWidth = maxX - minX
  const layoutHeight = maxY - minY
  const offsetX = width / 2 - (minX + layoutWidth / 2)
  // If virtual root, shift tree down since root depth is hidden
  const offsetY = hasVirtualRoot
    ? height / 2 - (minY + layoutHeight / 2)
    : 40

  const positionedNodes = nodes.map((node) => {
    const pos = positionMap.get(node.id)
    return {
      ...node,
      x: pos ? pos.x + offsetX : width / 2,
      y: pos ? pos.y + offsetY : height / 2,
    }
  })

  // Edges keep their original data; source/target positions come from nodes
  const positionedEdges = edges.map((edge) => ({ ...edge }))

  return { nodes: positionedNodes, edges: positionedEdges }
}
