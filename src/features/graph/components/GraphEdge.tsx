'use client'

import { memo } from 'react'
import type { GraphNode, GraphEdge as GraphEdgeType } from '../lib/types'

interface GraphEdgeProps {
  edge: GraphEdgeType
  isDimmed: boolean
}

export const GraphEdge = memo(function GraphEdge({ edge, isDimmed }: GraphEdgeProps) {
  const source = edge.source as GraphNode
  const target = edge.target as GraphNode

  const x1 = source.x ?? 0
  const y1 = source.y ?? 0
  const x2 = target.x ?? 0
  const y2 = target.y ?? 0

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="var(--muted-foreground)"
      strokeWidth={1}
      strokeOpacity={isDimmed ? 0.05 : 0.4}
    />
  )
})
