'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { useGraphLayout } from '../lib/layouts/useGraphLayout'
import { useGraphStore } from '../lib/store'
import type { GraphNode as GraphNodeType, GraphEdge as GraphEdgeType } from '../lib/types'
import { GraphNode } from './GraphNode'
import { GraphEdge } from './GraphEdge'

interface GraphCanvasProps {
  nodes: GraphNodeType[]
  edges: GraphEdgeType[]
  width: number
  height: number
}

type Mode =
  | { type: 'idle' }
  | { type: 'drag'; nodeId: string; didMove: boolean }
  | { type: 'pan'; startX: number; startY: number; startTx: number; startTy: number }

export function GraphCanvas({ nodes, edges, width, height }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const modeRef = useRef<Mode>({ type: 'idle' })
  const transformRef = useRef({ x: 0, y: 0, k: 1 })

  const { enabledTypeIds, selectedNodeId, setSelectedNodeId, highlightedNodeIds } = useGraphStore()

  const filteredNodes = useMemo(
    () => enabledTypeIds.size === 0 ? nodes : nodes.filter(n => enabledTypeIds.has(n.typeId)),
    [nodes, enabledTypeIds],
  )
  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])
  const filteredEdges = useMemo(
    () => edges.filter(e => filteredNodeIds.has(e.sourceId) && filteredNodeIds.has(e.targetId)),
    [edges, filteredNodeIds],
  )

  const { simulatedNodes, simulatedEdges, getSimulation, moveNode } = useGraphLayout({
    nodes: filteredNodes,
    edges: filteredEdges,
    width,
    height,
  })

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    const s = new Set<string>([selectedNodeId])
    for (const e of simulatedEdges) {
      const src = typeof e.source === 'object' ? (e.source as GraphNodeType).id : e.source as string
      const tgt = typeof e.target === 'object' ? (e.target as GraphNodeType).id : e.target as string
      if (src === selectedNodeId) s.add(tgt)
      if (tgt === selectedNodeId) s.add(src)
    }
    return s
  }, [selectedNodeId, simulatedEdges])

  const hasSelection = selectedNodeId !== null

  // Apply transform to <g>
  const applyTransform = useCallback(() => {
    const { x, y, k } = transformRef.current
    gRef.current?.setAttribute('transform', `translate(${x},${y}) scale(${k})`)
  }, [])

  // Convert client coords → simulation coords
  const toSimCoords = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    const t = transformRef.current
    return {
      x: (clientX - rect.left - t.x) / t.k,
      y: (clientY - rect.top - t.y) / t.k,
    }
  }, [])

  const findSimNode = useCallback((nodeId: string) => {
    return getSimulation()?.nodes().find(n => n.id === nodeId) ?? null
  }, [getSimulation])

  // Wheel → zoom toward pointer
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const t = transformRef.current
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newK = Math.min(4, Math.max(0.1, t.k * factor))
      const rect = svg.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      t.x = mx - (mx - t.x) * (newK / t.k)
      t.y = my - (my - t.y) * (newK / t.k)
      t.k = newK
      applyTransform()
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [applyTransform])

  // Node drag start — called from GraphNode's onPointerDown (stopPropagation prevents SVG handler)
  const handleNodeDragStart = useCallback((nodeId: string, pointerId: number) => {
    modeRef.current = { type: 'drag', nodeId, didMove: false }
    svgRef.current?.setPointerCapture(pointerId)
    const sim = getSimulation()
    if (sim) {
      // Force layout: pin node
      const node = findSimNode(nodeId)
      if (node) { node.fx = node.x; node.fy = node.y }
    }
  }, [findSimNode, getSimulation])

  // Background pan start (only fires when node didn't stopPropagation)
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    svgRef.current?.setPointerCapture(e.pointerId)
    const t = transformRef.current
    modeRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, startTx: t.x, startTy: t.y }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const m = modeRef.current
    if (m.type === 'drag') {
      m.didMove = true
      const pt = toSimCoords(e.clientX, e.clientY)
      const sim = getSimulation()
      if (sim) {
        // Force layout: update fixed position
        const node = findSimNode(m.nodeId)
        if (node) { node.fx = pt.x; node.fy = pt.y }
        if (sim.alpha() < 0.1) sim.alphaTarget(0.3).restart()
      } else {
        // Static layout: directly move node
        moveNode(m.nodeId, pt.x, pt.y)
      }
    } else if (m.type === 'pan') {
      const t = transformRef.current
      t.x = m.startTx + (e.clientX - m.startX)
      t.y = m.startTy + (e.clientY - m.startY)
      applyTransform()
    }
  }, [toSimCoords, findSimNode, getSimulation, moveNode, applyTransform])

  const handlePointerUp = useCallback(() => {
    const m = modeRef.current
    modeRef.current = { type: 'idle' }

    if (m.type === 'drag') {
      const sim = getSimulation()
      if (sim) {
        // Force layout: release pinned node
        const node = findSimNode(m.nodeId)
        if (node) { node.fx = null; node.fy = null }
        sim.alphaTarget(0)
      }
      // Click (no movement) → select node
      if (!m.didMove) setSelectedNodeId(m.nodeId)
    } else if (m.type === 'pan') {
      // nothing
    } else {
      // Click on background → deselect
      setSelectedNodeId(null)
    }
  }, [findSimNode, getSimulation, setSelectedNodeId])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      role="img"
      aria-label="Relationship graph visualization"
      style={{ display: 'block' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <g ref={gRef}>
        {simulatedEdges.map(edge => {
          const srcId = typeof edge.source === 'object' ? (edge.source as GraphNodeType).id : edge.source as string
          const tgtId = typeof edge.target === 'object' ? (edge.target as GraphNodeType).id : edge.target as string
          const isDimmed = hasSelection && (!connectedNodeIds.has(srcId) || !connectedNodeIds.has(tgtId))
          return <GraphEdge key={edge.id} edge={edge} isDimmed={isDimmed} />
        })}
        {simulatedNodes.map(node => {
          const isSelected = node.id === selectedNodeId
          const isConnected = connectedNodeIds.has(node.id)
          const isHighlighted = highlightedNodeIds.has(node.id)
          const isDimmed = hasSelection && !isConnected
          return (
            <GraphNode
              key={node.id}
              node={node}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
              onDragStart={handleNodeDragStart}
            />
          )
        })}
      </g>
    </svg>
  )
}
