'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { useGraphLayout } from '../lib/layouts/useGraphLayout'
import { findNearestInDirection, findCenterNode } from '../lib/spatialNav'
import type { Direction } from '../lib/spatialNav'
import { useGraphStore } from '../lib/store'
import type { GraphNode as GraphNodeType, GraphEdge as GraphEdgeType } from '../lib/types'
import { GraphNode } from './GraphNode'
import { GraphEdge } from './GraphEdge'

interface GraphCanvasProps {
  nodes: GraphNodeType[]
  edges: GraphEdgeType[]
  width: number
  height: number
  onNavigate: (id: string) => void
}

type Mode =
  | { type: 'idle' }
  | { type: 'drag'; nodeId: string; pointerId: number; didMove: boolean; startX: number; startY: number }
  | { type: 'pan'; pointerId: number; startX: number; startY: number; startTx: number; startTy: number }
  | { type: 'pinch'; prevDist: number | null; prevMidX: number; prevMidY: number }

const DIRECTION_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

export function GraphCanvas({ nodes, edges, width, height, onNavigate }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const modeRef = useRef<Mode>({ type: 'idle' })
  const transformRef = useRef({ x: 0, y: 0, k: 1 })
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())

  const { enabledTypeIds, selectedNodeId, setSelectedNodeId, highlightedNodeIds, searchQuery } = useGraphStore()

  const filteredNodes = useMemo(() => {
    let result = enabledTypeIds.size === 0 ? nodes : nodes.filter(n => enabledTypeIds.has(n.typeId))
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter(n => n.title.toLowerCase().includes(query))
    }
    return result
  }, [nodes, enabledTypeIds, searchQuery])
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

  // Release a pinned force-layout node and cool down the simulation
  const releaseNode = useCallback((nodeId: string) => {
    const sim = getSimulation()
    if (sim) {
      const node = findSimNode(nodeId)
      if (node) { node.fx = null; node.fy = null }
      sim.alphaTarget(0)
    }
  }, [findSimNode, getSimulation])

  // Compute distance between two pointers
  const getPointerDist = useCallback(() => {
    const ptrs = [...pointersRef.current.values()]
    if (ptrs.length < 2) return null
    const dx = ptrs[1].x - ptrs[0].x
    const dy = ptrs[1].y - ptrs[0].y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Compute midpoint between two pointers
  const getPointerMid = useCallback(() => {
    const ptrs = [...pointersRef.current.values()]
    if (ptrs.length < 2) return null
    return {
      x: (ptrs[0].x + ptrs[1].x) / 2,
      y: (ptrs[0].y + ptrs[1].y) / 2,
    }
  }, [])

  // Switch to pinch mode from current mode
  const transitionToPinch = useCallback(() => {
    const mid = getPointerMid()
    const dist = getPointerDist()
    modeRef.current = {
      type: 'pinch',
      prevDist: dist,
      prevMidX: mid?.x ?? 0,
      prevMidY: mid?.y ?? 0,
    }
  }, [getPointerDist, getPointerMid])

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
  const handleNodeDragStart = useCallback((nodeId: string, pointerId: number, clientX: number, clientY: number) => {
    pointersRef.current.set(pointerId, { x: clientX, y: clientY })

    // If a second pointer arrives during a drag or pan, transition to pinch
    if (pointersRef.current.size >= 2) {
      const m = modeRef.current
      if (m.type === 'drag') {
        releaseNode(m.nodeId)
        try { svgRef.current?.releasePointerCapture(m.pointerId) } catch { /* already released */ }
      }
      transitionToPinch()
      return
    }

    modeRef.current = { type: 'drag', nodeId, pointerId, didMove: false, startX: clientX, startY: clientY }
    svgRef.current?.setPointerCapture(pointerId)
    const sim = getSimulation()
    if (sim) {
      // Force layout: pin node
      const node = findSimNode(nodeId)
      if (node) { node.fx = node.x; node.fy = node.y }
    }
  }, [findSimNode, getSimulation, releaseNode, transitionToPinch])

  // Background pan start (only fires when node didn't stopPropagation)
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // If a second pointer arrives during drag or pan, transition to pinch
    if (pointersRef.current.size >= 2) {
      const m = modeRef.current
      if (m.type === 'drag') {
        releaseNode(m.nodeId)
        try { svgRef.current?.releasePointerCapture(m.pointerId) } catch { /* already released */ }
      } else if (m.type === 'pan') {
        try { svgRef.current?.releasePointerCapture(m.pointerId) } catch { /* already released */ }
      }
      transitionToPinch()
      return
    }

    svgRef.current?.setPointerCapture(e.pointerId)
    const t = transformRef.current
    modeRef.current = { type: 'pan', pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startTx: t.x, startTy: t.y }
  }, [releaseNode, transitionToPinch])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Always update pointer tracking
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const m = modeRef.current
    if (m.type === 'drag') {
      // Only respond to the pointer that started the drag
      if (e.pointerId !== m.pointerId) return
      // Require 5px movement before treating as drag (touch jitter tolerance)
      if (!m.didMove) {
        const dx = e.clientX - m.startX
        const dy = e.clientY - m.startY
        if (dx * dx + dy * dy < 25) return
        m.didMove = true
      }
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
      // Only respond to the pointer that started the pan
      if (e.pointerId !== m.pointerId) return
      const t = transformRef.current
      t.x = m.startTx + (e.clientX - m.startX)
      t.y = m.startTy + (e.clientY - m.startY)
      applyTransform()
    } else if (m.type === 'pinch') {
      // Only compute pinch with exactly 2 pointers tracked
      if (pointersRef.current.size < 2) return

      const dist = getPointerDist()
      const mid = getPointerMid()
      if (dist == null || mid == null) return

      const t = transformRef.current
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return

      // Zoom toward finger midpoint
      if (m.prevDist != null && m.prevDist > 0) {
        const factor = dist / m.prevDist
        const newK = Math.min(4, Math.max(0.1, t.k * factor))
        const svgMidX = mid.x - rect.left
        const svgMidY = mid.y - rect.top
        t.x = svgMidX - (svgMidX - t.x) * (newK / t.k)
        t.y = svgMidY - (svgMidY - t.y) * (newK / t.k)
        t.k = newK
      }

      // Simultaneous pan from midpoint movement
      t.x += mid.x - m.prevMidX
      t.y += mid.y - m.prevMidY

      m.prevDist = dist
      m.prevMidX = mid.x
      m.prevMidY = mid.y

      applyTransform()
    }
  }, [toSimCoords, findSimNode, getSimulation, moveNode, applyTransform, getPointerDist, getPointerMid])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)

    const m = modeRef.current

    if (m.type === 'pinch') {
      // If one finger remains after pinch, transition to pan with that finger
      if (pointersRef.current.size === 1) {
        const [remainingId, remainingPos] = [...pointersRef.current.entries()][0]
        const t = transformRef.current
        svgRef.current?.setPointerCapture(remainingId)
        modeRef.current = { type: 'pan', pointerId: remainingId, startX: remainingPos.x, startY: remainingPos.y, startTx: t.x, startTy: t.y }
      } else if (pointersRef.current.size === 0) {
        modeRef.current = { type: 'idle' }
      }
      // If still 2+ pointers, stay in pinch
      return
    }

    modeRef.current = { type: 'idle' }

    if (m.type === 'drag') {
      releaseNode(m.nodeId)
      // Click (no movement) → select node
      if (!m.didMove) setSelectedNodeId(m.nodeId)
    } else if (m.type === 'pan') {
      // nothing
    } else {
      // Click on background → deselect
      setSelectedNodeId(null)
    }
  }, [releaseNode, setSelectedNodeId])

  const handlePointerCancel = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)

    const m = modeRef.current

    if (m.type === 'drag') {
      releaseNode(m.nodeId)
      modeRef.current = { type: 'idle' }
    } else if (m.type === 'pinch') {
      if (pointersRef.current.size === 1) {
        const [remainingId, remainingPos] = [...pointersRef.current.entries()][0]
        const t = transformRef.current
        svgRef.current?.setPointerCapture(remainingId)
        modeRef.current = { type: 'pan', pointerId: remainingId, startX: remainingPos.x, startY: remainingPos.y, startTx: t.x, startTy: t.y }
      } else {
        modeRef.current = { type: 'idle' }
      }
    } else {
      modeRef.current = { type: 'idle' }
    }
  }, [releaseNode])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<SVGSVGElement>) => {
    const direction = DIRECTION_MAP[e.key]

    if (direction) {
      e.preventDefault()
      if (!selectedNodeId) {
        // No selection: pick node nearest viewport center
        const t = transformRef.current
        const centerX = (width / 2 - t.x) / t.k
        const centerY = (height / 2 - t.y) / t.k
        const center = findCenterNode(simulatedNodes, centerX, centerY)
        if (center) setSelectedNodeId(center.id)
        return
      }
      const next = findNearestInDirection(simulatedNodes, selectedNodeId, direction)
      if (next) setSelectedNodeId(next.id)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedNodeId) onNavigate(selectedNodeId)
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      if (selectedNodeId) {
        setSelectedNodeId(null)
      } else {
        svgRef.current?.blur()
      }
    }
  }, [selectedNodeId, setSelectedNodeId, simulatedNodes, width, height, onNavigate])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      role="application"
      aria-roledescription="graph"
      aria-label="Relationship graph. Use arrow keys to navigate between nodes."
      tabIndex={0}
      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ display: 'block', touchAction: 'none', outline: 'none' }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 8 3, 0 6" fill="var(--muted-foreground)" />
        </marker>
      </defs>
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
