'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Simulation } from 'd3-force'
import { useForceSimulation } from '../useForceSimulation'
import { useGraphStore } from '../store'
import type { GraphNode, GraphEdge, GraphLayoutMode } from '../types'
import { hierarchicalLayout } from './hierarchicalLayout'
import { radialLayout } from './radialLayout'
import { clusteredLayout } from './clusteredLayout'

const TRANSITION_DURATION = 400

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

interface UseGraphLayoutOptions {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

interface UseGraphLayoutReturn {
  simulatedNodes: GraphNode[]
  simulatedEdges: GraphEdge[]
  getSimulation: () => Simulation<GraphNode, GraphEdge> | null
  moveNode: (id: string, x: number, y: number) => void
}

export function useGraphLayout({
  nodes,
  edges,
  width,
  height,
}: UseGraphLayoutOptions): UseGraphLayoutReturn {
  const layoutMode = useGraphStore((s) => s.layoutMode)

  // Force simulation — always runs so it can be seamlessly switched to
  const force = useForceSimulation({ nodes, edges, width, height })

  // Static layout positions
  const [staticNodes, setStaticNodes] = useState<GraphNode[]>([])
  const [staticEdges, setStaticEdges] = useState<GraphEdge[]>([])

  // Animation state
  const [animatingNodes, setAnimatingNodes] = useState<GraphNode[] | null>(null)
  const animFrameRef = useRef<number>(0)
  const prevModeRef = useRef<GraphLayoutMode>(layoutMode)

  // Compute static layout when mode or data changes
  const computeStaticLayout = useCallback(
    (mode: GraphLayoutMode) => {
      if (mode === 'force' || nodes.length === 0 || width === 0 || height === 0) {
        return null
      }
      const layoutFn =
        mode === 'hierarchical'
          ? hierarchicalLayout
          : mode === 'radial'
            ? radialLayout
            : clusteredLayout
      return layoutFn(nodes, edges, width, height)
    },
    [nodes, edges, width, height],
  )

  // Handle layout changes (including animations)
  useEffect(() => {
    const prevMode = prevModeRef.current
    prevModeRef.current = layoutMode

    if (layoutMode === 'force') {
      // Transitioning TO force — seed simulation from current positions
      if (prevMode !== 'force' && staticNodes.length > 0) {
        const sim = force.getSimulation()
        if (sim) {
          const simNodes = sim.nodes()
          for (const sn of simNodes) {
            const fromNode = staticNodes.find((n) => n.id === sn.id)
            if (fromNode) {
              sn.x = fromNode.x
              sn.y = fromNode.y
            }
          }
          sim.alpha(0.3).restart()
        }
      }
      setStaticNodes([]) // eslint-disable-line react-hooks/set-state-in-effect -- reset on layout mode change
      setStaticEdges([])
      setAnimatingNodes(null)
      return
    }

    // Compute target positions for static layout
    const result = computeStaticLayout(layoutMode)
    if (!result) return

    // Determine source positions for animation
    let sourceNodes: GraphNode[]
    if (prevMode === 'force') {
      sourceNodes = force.simulatedNodes
    } else if (staticNodes.length > 0) {
      sourceNodes = staticNodes
    } else {
      // No animation source — snap immediately
      setStaticNodes(result.nodes)
      setStaticEdges(result.edges)
      return
    }

    // Build position map for source
    const sourceMap = new Map<string, { x: number; y: number }>()
    for (const n of sourceNodes) {
      if (n.x != null && n.y != null) {
        sourceMap.set(n.id, { x: n.x, y: n.y })
      }
    }

    // Animate from source to target
    cancelAnimationFrame(animFrameRef.current)
    const startTime = performance.now()
    const targetNodes = result.nodes

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / TRANSITION_DURATION)
      const t = easeOut(progress)

      const interpolated = targetNodes.map((target) => {
        const source = sourceMap.get(target.id)
        if (!source) return target
        return {
          ...target,
          x: source.x + (target.x! - source.x) * t,
          y: source.y + (target.y! - source.y) * t,
        }
      })

      if (progress < 1) {
        setAnimatingNodes(interpolated)
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setAnimatingNodes(null)
        setStaticNodes(result.nodes)
        setStaticEdges(result.edges)
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [layoutMode, computeStaticLayout]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute static layout when data changes (without animation)
  useEffect(() => {
    if (layoutMode === 'force') return
    const result = computeStaticLayout(layoutMode)
    if (result) {
      setStaticNodes(result.nodes) // eslint-disable-line react-hooks/set-state-in-effect -- sync layout computation
      setStaticEdges(result.edges)
      setAnimatingNodes(null)
    }
  }, [nodes, edges, width, height, layoutMode, computeStaticLayout])

  // Move node for static layout drag
  const moveNode = useCallback(
    (id: string, x: number, y: number) => {
      setStaticNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
      )
    },
    [],
  )

  const getSimulation = useCallback(() => {
    if (layoutMode === 'force') return force.getSimulation()
    return null
  }, [layoutMode, force])

  // Select output
  const outputNodes = useMemo(() => {
    if (animatingNodes) return animatingNodes
    if (layoutMode === 'force') return force.simulatedNodes
    return staticNodes
  }, [animatingNodes, layoutMode, force.simulatedNodes, staticNodes])

  // For static layouts, resolve edge source/target to node objects so
  // GraphEdge can read .x/.y (D3 force does this automatically, but
  // static layouts only clone the raw edges with string IDs).
  const outputEdges = useMemo(() => {
    if (layoutMode === 'force') return force.simulatedEdges

    const nodeMap = new Map<string, GraphNode>()
    for (const n of outputNodes) {
      nodeMap.set(n.id, n)
    }
    return staticEdges.map((edge) => ({
      ...edge,
      source: nodeMap.get(edge.sourceId) ?? edge.sourceId,
      target: nodeMap.get(edge.targetId) ?? edge.targetId,
    }))
  }, [layoutMode, force.simulatedEdges, staticEdges, outputNodes])

  return {
    simulatedNodes: outputNodes,
    simulatedEdges: outputEdges,
    getSimulation,
    moveNode,
  }
}
