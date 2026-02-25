'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, FilterIcon } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/utils'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
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

  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(true)

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

  if (isMobile) {
    return (
      <div className={cn(
        'absolute top-2 right-2',
        collapsed
          ? 'flex items-center rounded-lg border bg-muted/50 p-0.5 backdrop-blur'
          : 'w-40 rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg',
      )}>
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'flex items-center gap-1.5',
            collapsed
              ? 'rounded-md px-2.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors'
              : 'justify-between w-full px-2 py-1.5',
          )}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <FilterIcon className={cn(collapsed ? 'size-4' : 'size-3')} />
            {!collapsed && 'Filters'}
            {hasFilter && (
              <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {enabledTypeIds.size}
              </span>
            )}
          </span>
          {!collapsed && <ChevronDownIcon className="size-3.5 text-muted-foreground rotate-180" />}
        </button>
        {!collapsed && (
          <div className="px-2 pb-2 space-y-1.5">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-6 text-xs"
            />
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {typesWithNodes.map(t => {
                const isActive = enabledTypeIds.size === 0 || enabledTypeIds.has(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleType(t.id)}
                    aria-pressed={isActive}
                    className={cn(
                      'flex items-center gap-1.5 w-full px-1 py-0.5 rounded text-xs hover:bg-accent transition-colors',
                      !isActive && 'opacity-40',
                    )}
                  >
                    {isEmoji(t.icon) ? (
                      <span className="shrink-0 text-xs leading-none">{t.icon}</span>
                    ) : (
                      <span
                        className="inline-block size-2.5 rounded-full shrink-0"
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
              <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={showAllTypes}>
                Show all
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="absolute top-9 right-9 w-48 rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg">
      <div className="px-2.5 pt-2.5 pb-1 text-xs font-medium">Filters</div>
      <div className="px-2.5 pb-2.5 space-y-2">
        <Input
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="h-7 text-xs"
        />
        <div className="space-y-0.5">
          {typesWithNodes.map(t => {
            const isActive = enabledTypeIds.size === 0 || enabledTypeIds.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleType(t.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded text-xs hover:bg-accent transition-colors',
                  !isActive && 'opacity-40',
                )}
              >
                {isEmoji(t.icon) ? (
                  <span className="shrink-0 text-sm leading-none">{t.icon}</span>
                ) : (
                  <span
                    className="inline-block size-2.5 rounded-full shrink-0"
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
          <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={showAllTypes}>
            Show all
          </Button>
        )}
      </div>
    </div>
  )
}
