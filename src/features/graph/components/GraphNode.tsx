'use client'

import { memo } from 'react'
import type { GraphNode as GraphNodeType } from '../lib/types'
import { getNodeRadius } from '../lib/useForceSimulation'

function isEmoji(str: string): boolean {
  const codePoint = str.codePointAt(0)
  return codePoint !== undefined && codePoint > 255
}

interface GraphNodeProps {
  node: GraphNodeType
  isSelected: boolean
  isHighlighted: boolean
  isDimmed: boolean
  onDragStart: (nodeId: string, pointerId: number) => void
}

export const GraphNode = memo(function GraphNode({
  node,
  isSelected,
  isHighlighted,
  isDimmed,
  onDragStart,
}: GraphNodeProps) {
  const radius = getNodeRadius(node.connectionCount)
  const fill = node.typeColor ?? 'var(--primary)'

  // Entry emoji > type emoji > colored circle
  const emoji = (node.icon && isEmoji(node.icon)) ? node.icon
    : isEmoji(node.typeIcon) ? node.typeIcon
    : null

  return (
    <g
      className="graph-node"
      data-node-id={node.id}
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDragStart(node.id, e.pointerId)
      }}
      style={{ cursor: 'grab', opacity: isDimmed ? 0.15 : 1, touchAction: 'none' }}
    >
      {emoji ? (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={radius * 1.8}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {emoji}
        </text>
      ) : (
        <circle
          r={radius}
          fill={fill}
          stroke={isSelected ? 'var(--foreground)' : isHighlighted ? 'var(--primary)' : 'transparent'}
          strokeWidth={isSelected ? 2.5 : isHighlighted ? 2 : 0}
        />
      )}
      {/* Invisible hit area for easier grabbing */}
      <circle r={Math.max(radius + 8, 16)} fill="transparent" />
      <text
        y={radius + 14}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={11}
        fontWeight={isSelected ? 600 : 400}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.title.length > 24 ? node.title.slice(0, 22) + '...' : node.title}
      </text>
    </g>
  )
})
