'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/utils'
import type { ObjectType } from '@/shared/lib/data'
import type { GraphNode } from '../lib/types'
import { useGraphStore } from '../lib/store'
import { buildTypeColorMap } from '../lib/colors'

function isEmoji(str: string): boolean {
  const codePoint = str.codePointAt(0)
  return codePoint !== undefined && codePoint > 255
}

interface GraphFilterPanelProps {
  types: ObjectType[]
  nodes: GraphNode[]
}

export function GraphFilterPanel({ types, nodes }: GraphFilterPanelProps) {
  const {
    enabledTypeIds,
    toggleType,
    showAllTypes,
    searchQuery,
    setSearchQuery,
    setHighlightedNodeIds,
  } = useGraphStore()

  const typeColorMap = useMemo(() => buildTypeColorMap(types), [types])

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

  const hasFilter = enabledTypeIds.size > 0

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
            const isActive = enabledTypeIds.size === 0 || enabledTypeIds.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleType(t.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-accent transition-colors',
                  !isActive && 'opacity-40',
                )}
              >
                {isEmoji(t.icon) ? (
                  <span className="shrink-0 text-sm leading-none">{t.icon}</span>
                ) : (
                  <span
                    className="inline-block size-3 rounded-full shrink-0"
                    style={{ backgroundColor: typeColorMap.get(t.id) ?? 'var(--primary)' }}
                  />
                )}
                <span className="truncate flex-1 text-left">{t.plural_name}</span>
                <span className="text-muted-foreground tabular-nums">{countByType.get(t.id) ?? 0}</span>
              </button>
            )
          })}
        </div>
        {hasFilter && (
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={showAllTypes}>
            Show all
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
