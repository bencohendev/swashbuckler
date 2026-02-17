import { hierarchy, tree } from 'd3-hierarchy'
import type { GraphNode, GraphEdge } from '../types'
import { buildSpanningTree, type TreeNode } from './buildSpanningTree'

const RING_SPACING = 120
const MIN_ARC_DISTANCE = 60

/**
 * Radial tree layout: spanning tree projected onto concentric circles.
 * Root at center, each depth level at a larger radius.
 *
 * Uses nodeSize for consistent spacing, then normalizes angles to fill
 * the full circle. Ring spacing is fixed so labels don't overlap vertically.
 */
export function radialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] }

  const { root, hasVirtualRoot } = buildSpanningTree(nodes, edges)

  const root_h = hierarchy<TreeNode>(root, (d) => d.children)

  // Use nodeSize so each node gets consistent horizontal space in the
  // "linearised" tree, then we'll map that to angle.
  const treeLayout = tree<TreeNode>()
    .nodeSize([MIN_ARC_DISTANCE, RING_SPACING])
    .separation((a, b) => a.parent === b.parent ? 1 : 1.5)
  treeLayout(root_h)

  // Collect layout positions (x = linear spread, y = depth * spacing)
  // Use natural depth from d3 — virtual root (depth 0) is excluded,
  // so component roots sit on ring 1 instead of all stacking at center.
  const layoutNodes: { id: string; lx: number; depth: number }[] = []
  root_h.each((treeNode) => {
    if (treeNode.data.id === '__virtual_root__') return
    layoutNodes.push({
      id: treeNode.data.id,
      lx: treeNode.x!,
      depth: treeNode.depth,
    })
  })

  // Map the linear x range to [0, 2*PI)
  let minLx = Infinity, maxLx = -Infinity
  for (const ln of layoutNodes) {
    minLx = Math.min(minLx, ln.lx)
    maxLx = Math.max(maxLx, ln.lx)
  }
  const lxRange = maxLx - minLx

  const cx = width / 2
  const cy = height / 2

  const positionMap = new Map<string, { x: number; y: number }>()
  for (const ln of layoutNodes) {
    if (ln.depth === 0) {
      // Root at center
      positionMap.set(ln.id, { x: cx, y: cy })
      continue
    }

    const r = ln.depth * RING_SPACING
    // Spread across full circle; offset so the layout doesn't start at 3 o'clock
    const angle = lxRange > 0
      ? ((ln.lx - minLx) / lxRange) * 2 * Math.PI - Math.PI / 2
      : -Math.PI / 2

    positionMap.set(ln.id, {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    })
  }

  const positionedNodes = nodes.map((node) => {
    const pos = positionMap.get(node.id)
    return {
      ...node,
      x: pos ? pos.x : cx,
      y: pos ? pos.y : cy,
    }
  })

  const positionedEdges = edges.map((edge) => ({ ...edge }))

  return { nodes: positionedNodes, edges: positionedEdges }
}
