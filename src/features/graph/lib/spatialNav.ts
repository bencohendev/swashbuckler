import type { GraphNode } from './types'

export type Direction = 'up' | 'down' | 'left' | 'right'

// Direction vectors (SVG coordinate system: y increases downward)
const DIRECTION_ANGLES: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
}

const CONE_HALF_ANGLE = Math.PI / 4 // 45° each side = 90° cone

/**
 * Find the nearest node in a spatial direction from the selected node.
 * Uses a 90° cone; falls back to nearest overall if the cone is empty.
 */
export function findNearestInDirection(
  nodes: GraphNode[],
  fromId: string,
  direction: Direction,
): GraphNode | null {
  const from = nodes.find(n => n.id === fromId)
  if (!from || from.x == null || from.y == null) return null

  const dirAngle = DIRECTION_ANGLES[direction]
  let bestInCone: GraphNode | null = null
  let bestInConeDist = Infinity
  let bestOverall: GraphNode | null = null
  let bestOverallDist = Infinity

  for (const node of nodes) {
    if (node.id === fromId) continue
    if (node.x == null || node.y == null) continue

    const dx = node.x - from.x
    const dy = node.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) continue

    const angle = Math.atan2(dy, dx)
    let angleDiff = angle - dirAngle
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

    if (Math.abs(angleDiff) <= CONE_HALF_ANGLE) {
      if (dist < bestInConeDist) {
        bestInCone = node
        bestInConeDist = dist
      }
    }

    if (dist < bestOverallDist) {
      bestOverall = node
      bestOverallDist = dist
    }
  }

  return bestInCone ?? bestOverall
}

/**
 * Find the node nearest to a viewport center point (for initial selection on Tab).
 */
export function findCenterNode(
  nodes: GraphNode[],
  centerX: number,
  centerY: number,
): GraphNode | null {
  let best: GraphNode | null = null
  let bestDist = Infinity

  for (const node of nodes) {
    if (node.x == null || node.y == null) continue
    const dx = node.x - centerX
    const dy = node.y - centerY
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      best = node
      bestDist = dist
    }
  }

  return best
}
