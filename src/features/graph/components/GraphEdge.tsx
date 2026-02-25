'use client'

import { memo } from 'react'
import type { GraphNode, GraphEdge as GraphEdgeType } from '../lib/types'
import { getNodeRadius } from '../lib/useForceSimulation'

interface GraphEdgeProps {
  edge: GraphEdgeType
  isDimmed: boolean
}

export const GraphEdge = memo(function GraphEdge({ edge, isDimmed }: GraphEdgeProps) {
  const source = edge.source as GraphNode
  const target = edge.target as GraphNode

  const cx1 = source.x ?? 0
  const cy1 = source.y ?? 0
  const cx2 = target.x ?? 0
  const cy2 = target.y ?? 0

  const dx = cx2 - cx1
  const dy = cy2 - cy1
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len === 0) return null

  const ux = dx / len
  const uy = dy / len
  const sourceRadius = getNodeRadius(source.connectionCount)
  const targetRadius = getNodeRadius(target.connectionCount)

  const x1 = cx1 + ux * sourceRadius
  const y1 = cy1 + uy * sourceRadius
  const x2 = cx2 - ux * targetRadius
  const y2 = cy2 - uy * targetRadius

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="var(--muted-foreground)"
      strokeWidth={1}
      opacity={isDimmed ? 0.05 : 0.4}
      markerEnd="url(#arrowhead)"
    />
  )
})
