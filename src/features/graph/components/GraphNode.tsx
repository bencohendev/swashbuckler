'use client'

import { memo } from 'react'
import type { GraphNode as GraphNodeType } from '../lib/types'
import { getNodeRadius } from '../lib/useForceSimulation'

interface GraphNodeProps {
  node: GraphNodeType
  onDragStart: (nodeId: string, pointerId: number) => void
}

export const GraphNode = memo(function GraphNode({ node, onDragStart }: GraphNodeProps) {
  const radius = getNodeRadius(node.connectionCount)
  const fill = node.typeColor ?? 'var(--primary)'

  return (
    <g
      className="graph-node"
      data-node-id={node.id}
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDragStart(node.id, e.pointerId)
      }}
      style={{ cursor: 'grab', touchAction: 'none' }}
    >
      <circle r={radius} fill={fill} />
      {/* Invisible hit area for easier grabbing */}
      <circle r={Math.max(radius + 8, 16)} fill="transparent" />
      <text
        y={radius + 14}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={11}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.title.length > 24 ? node.title.slice(0, 22) + '...' : node.title}
      </text>
    </g>
  )
})
