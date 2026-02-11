'use client'

import { useEffect, useRef, useState } from 'react'
import { useGraphData } from '../hooks/useGraphData'
import { useGraphStore } from '../lib/store'
import { GraphCanvas } from './GraphCanvas'
import { GraphFilterPanel } from './GraphFilterPanel'

export function GraphView() {
  const { graphData, types, isLoading } = useGraphData()
  const reset = useGraphStore(s => s.reset)

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

  const showGraph = !isLoading && graphData.nodes.length > 0

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {isLoading && (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading graph...
        </div>
      )}
      {!isLoading && graphData.nodes.length === 0 && (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">No objects to display</p>
            <p className="text-sm">Create some objects and link them to see the graph.</p>
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
          />
          <GraphFilterPanel types={types} nodes={graphData.nodes} />
        </>
      )}
    </div>
  )
}
