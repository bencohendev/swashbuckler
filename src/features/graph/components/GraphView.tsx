'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGraphData } from '../hooks/useGraphData'
import { useGraphStore } from '../lib/store'
import { GraphCanvas } from './GraphCanvas'
import { GraphFilterPanel } from './GraphFilterPanel'
import { GraphLayoutToggle } from './GraphLayoutToggle'
import { GraphNodeDetail } from './GraphNodeDetail'

export function GraphView() {
  const router = useRouter()
  const { graphData, types, isLoading } = useGraphData()
  const reset = useGraphStore(s => s.reset)
  const selectedNodeId = useGraphStore(s => s.selectedNodeId)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Reset store state on mount
  useEffect(() => {
    reset()
  }, [reset])

  // Measure container with ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleNavigate = useCallback(
    (id: string) => router.push(`/objects/${id}`),
    [router],
  )

  const showGraph = !isLoading && graphData.nodes.length > 0

  const selectedNode = selectedNodeId
    ? graphData.nodes.find(n => n.id === selectedNodeId)
    : null
  const announcement = selectedNode
    ? `${selectedNode.title}, ${selectedNode.typeName}, ${selectedNode.connectionCount} connection${selectedNode.connectionCount !== 1 ? 's' : ''}`
    : ''

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      {isLoading && (
        <div role="status" className="flex items-center justify-center h-full text-muted-foreground">
          Loading graph...
        </div>
      )}
      {!isLoading && graphData.nodes.length === 0 && (
        <div role="status" className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">No entries to display</p>
            <p className="text-sm">Create some entries and link them to see the graph.</p>
          </div>
        </div>
      )}
      {showGraph && dimensions.width > 0 && dimensions.height > 0 && (
        <>
          <GraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            width={dimensions.width}
            height={dimensions.height}
            onNavigate={handleNavigate}
          />
          <GraphLayoutToggle />
          <GraphFilterPanel types={types} nodes={graphData.nodes} />
          <GraphNodeDetail nodes={graphData.nodes} onNavigate={handleNavigate} />
        </>
      )}
    </div>
  )
}
