'use client'

import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { TypeIcon } from '@/features/object-types'
import { useGraphStore } from '../lib/store'
import type { GraphNode } from '../lib/types'

interface GraphNodeDetailProps {
  nodes: GraphNode[]
  onNavigate: (id: string) => void
}

export function GraphNodeDetail({ nodes, onNavigate }: GraphNodeDetailProps) {
  const { selectedNodeId, setSelectedNodeId } = useGraphStore()

  if (!selectedNodeId) return null

  const node = nodes.find(n => n.id === selectedNodeId)
  if (!node) return null

  return (
    <Card className="absolute bottom-9 right-9 w-64 shadow-lg bg-background/95 backdrop-blur-sm">
      <CardContent className="px-3 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <TypeIcon icon={node.typeIcon} className="h-4 w-4 shrink-0" />
          <span className="text-xs text-muted-foreground">{node.typeName}</span>
        </div>
        <p className="text-sm font-medium truncate">{node.title}</p>
        <p className="text-xs text-muted-foreground">
          {node.connectionCount} connection{node.connectionCount !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onNavigate(node.id)}>
            Open
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedNodeId(null)}
          >
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
