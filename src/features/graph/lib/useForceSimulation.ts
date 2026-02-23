'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import type { Simulation } from 'd3-force'
import type { GraphNode, GraphEdge } from './types'

interface UseForceSimulationOptions {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

interface UseForceSimulationReturn {
  simulatedNodes: GraphNode[]
  simulatedEdges: GraphEdge[]
  /** Increments each time a new simulation is created. Use as a dependency for drag setup. */
  simulationVersion: number
  /** Get the current simulation instance (may be null). */
  getSimulation: () => Simulation<GraphNode, GraphEdge> | null
}

export function getNodeRadius(connectionCount: number): number {
  return Math.min(22, Math.max(6, 6 + connectionCount * 2))
}

export function useForceSimulation({
  nodes,
  edges,
  width,
  height,
}: UseForceSimulationOptions): UseForceSimulationReturn {
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([])
  const [simulatedEdges, setSimulatedEdges] = useState<GraphEdge[]>([])
  const [simulationVersion, setSimulationVersion] = useState(0)
  const simulationRef = useRef<Simulation<GraphNode, GraphEdge> | null>(null)

  const getSimulation = useCallback(
    () => simulationRef.current,
    [],
  )

  useEffect(() => {
    if (nodes.length === 0 || width === 0 || height === 0) {
      setSimulatedNodes([]) // eslint-disable-line react-hooks/set-state-in-effect -- clear when no data
      setSimulatedEdges([])
      return
    }

    // Clone input data to avoid mutating props
    const clonedNodes: GraphNode[] = nodes.map(n => ({ ...n }))
    const clonedEdges: GraphEdge[] = edges.map(e => ({
      ...e,
      source: e.sourceId,
      target: e.targetId,
    }))

    // Stop previous simulation
    simulationRef.current?.stop()

    const simulation = forceSimulation<GraphNode>(clonedNodes)
      .force(
        'link',
        forceLink<GraphNode, GraphEdge>(clonedEdges)
          .id(d => d.id)
          .distance(100),
      )
      .force('charge', forceManyBody<GraphNode>().strength(-200))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<GraphNode>().radius(d => getNodeRadius(d.connectionCount) + 4))

    simulationRef.current = simulation
    setSimulationVersion(v => v + 1)

    simulation.on('tick', () => {
      // Spread each node/edge into a new object so React memo sees new references
      // (d3-force mutates objects in place, which memo would otherwise skip)
      setSimulatedNodes(clonedNodes.map(n => ({ ...n })))
      setSimulatedEdges(clonedEdges.map(e => ({ ...e })))
    })

    return () => {
      simulation.stop()
      simulationRef.current = null
    }
  }, [nodes, edges, width, height])

  return { simulatedNodes, simulatedEdges, simulationVersion, getSimulation }
}
