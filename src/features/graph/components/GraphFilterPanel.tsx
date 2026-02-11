'use client'

import { useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { TypeIcon } from '@/features/object-types'
import { cn } from '@/shared/lib/utils'
import type { ObjectType } from '@/shared/lib/data'
import type { GraphNode } from '../lib/types'
import { useGraphStore } from '../lib/store'

interface GraphFilterPanelProps {
  types: ObjectType[]
  nodes: GraphNode[]
}

export function GraphFilterPanel({ types, nodes }: GraphFilterPanelProps) {
  const {
    disabledTypeIds,
    toggleType,
    enableAllTypes,
    searchQuery,
    setSearchQuery,
    setHighlightedNodeIds,
  } = useGraphStore()

  // Count nodes per type
  const countByType = new Map<string, number>()
  for (const node of nodes) {
    countByType.set(node.typeId, (countByType.get(node.typeId) ?? 0) + 1)
  }

  // Only show types that have nodes
  const typesWithNodes = types.filter(t => (countByType.get(t.id) ?? 0) > 0)

  // Update highlighted node IDs when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedNodeIds(new Set())
      return
    }
    const lower = searchQuery.toLowerCase()
    const matching = new Set(
      nodes.filter(n => n.title.toLowerCase().includes(lower)).map(n => n.id),
    )
    setHighlightedNodeIds(matching)
  }, [searchQuery, nodes, setHighlightedNodeIds])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [setSearchQuery],
  )

  const hasDisabled = disabledTypeIds.size > 0

  return (
    <Card className="absolute top-9 right-9 w-56 shadow-lg bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-sm font-medium">Filters</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        <Input
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="h-8 text-xs"
        />
        <div className="space-y-1">
          {typesWithNodes.map(t => {
            const isDisabled = disabledTypeIds.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleType(t.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-accent transition-colors',
                  isDisabled && 'opacity-40',
                )}
              >
                <TypeIcon icon={t.icon} className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1 text-left">{t.name}</span>
                <span className="text-muted-foreground tabular-nums">{countByType.get(t.id) ?? 0}</span>
              </button>
            )
          })}
        </div>
        {hasDisabled && (
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={enableAllTypes}>
            Show all
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
