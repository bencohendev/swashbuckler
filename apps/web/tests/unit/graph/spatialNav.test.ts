import { describe, it, expect } from 'vitest'
import { findNearestInDirection, findCenterNode } from '@/features/graph/lib/spatialNav'
import type { GraphNode } from '@/features/graph/lib/types'

function makeNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    title: `Node ${id}`,
    typeId: 'type-1',
    typeName: 'Page',
    typeColor: null,
    typeIcon: 'file',
    icon: null,
    connectionCount: 0,
    x,
    y,
    index: 0,
    vx: 0,
    vy: 0,
  }
}

describe('findNearestInDirection', () => {
  const center = makeNode('center', 0, 0)
  const right = makeNode('right', 100, 0)
  const left = makeNode('left', -100, 0)
  const up = makeNode('up', 0, -100) // SVG: y increases downward
  const down = makeNode('down', 0, 100)
  const crossNodes = [center, right, left, up, down]

  it('finds the node to the right', () => {
    const result = findNearestInDirection(crossNodes, 'center', 'right')
    expect(result?.id).toBe('right')
  })

  it('finds the node to the left', () => {
    const result = findNearestInDirection(crossNodes, 'center', 'left')
    expect(result?.id).toBe('left')
  })

  it('finds the node above (lower y in SVG)', () => {
    const result = findNearestInDirection(crossNodes, 'center', 'up')
    expect(result?.id).toBe('up')
  })

  it('finds the node below (higher y in SVG)', () => {
    const result = findNearestInDirection(crossNodes, 'center', 'down')
    expect(result?.id).toBe('down')
  })

  it('picks the nearest node within the cone', () => {
    const near = makeNode('near', 50, 10) // slightly off-axis right, but close
    const far = makeNode('far', 200, 0) // exactly right, but far
    const nodes = [center, near, far]
    const result = findNearestInDirection(nodes, 'center', 'right')
    expect(result?.id).toBe('near')
  })

  it('falls back to nearest overall when cone is empty', () => {
    // All nodes are to the right; pressing left should fall back
    const a = makeNode('a', 50, 0)
    const b = makeNode('b', 100, 0)
    const nodes = [center, a, b]
    const result = findNearestInDirection(nodes, 'center', 'left')
    expect(result?.id).toBe('a') // nearest overall
  })

  it('excludes nodes outside the 90° cone', () => {
    // Node at ~54° from right axis — outside the 45° half-angle
    const outsideCone = makeNode('outside', 50, 70) // atan2(70,50) ≈ 54°
    const insideCone = makeNode('inside', 100, 30) // atan2(30,100) ≈ 17°
    const nodes = [center, outsideCone, insideCone]
    const result = findNearestInDirection(nodes, 'center', 'right')
    expect(result?.id).toBe('inside')
  })

  it('returns null for empty nodes array', () => {
    const result = findNearestInDirection([], 'center', 'right')
    expect(result).toBeNull()
  })

  it('returns null when fromId is the only node', () => {
    const result = findNearestInDirection([center], 'center', 'right')
    expect(result).toBeNull()
  })

  it('returns null when fromId is not in the array', () => {
    const result = findNearestInDirection([right, left], 'missing', 'right')
    expect(result).toBeNull()
  })

  it('skips nodes with missing x/y', () => {
    const noPos: GraphNode = {
      id: 'nopos',
      title: 'No Position',
      typeId: 'type-1',
      typeName: 'Page',
      typeColor: null,
      typeIcon: 'file',
      icon: null,
      connectionCount: 0,
      index: 0,
    }
    const nodes = [center, noPos, right]
    const result = findNearestInDirection(nodes, 'center', 'right')
    expect(result?.id).toBe('right')
  })

  it('works from a non-origin position', () => {
    const a = makeNode('a', 200, 200)
    const b = makeNode('b', 300, 200) // to the right of a
    const c = makeNode('c', 200, 100) // above a
    const nodes = [a, b, c]
    const result = findNearestInDirection(nodes, 'a', 'right')
    expect(result?.id).toBe('b')
  })
})

describe('findCenterNode', () => {
  it('finds the node nearest to center', () => {
    const nodes = [
      makeNode('a', -200, -200),
      makeNode('b', 10, 5),
      makeNode('c', 300, 300),
    ]
    const result = findCenterNode(nodes, 0, 0)
    expect(result?.id).toBe('b')
  })

  it('returns null for empty array', () => {
    const result = findCenterNode([], 0, 0)
    expect(result).toBeNull()
  })

  it('handles single node', () => {
    const nodes = [makeNode('only', 500, 500)]
    const result = findCenterNode(nodes, 0, 0)
    expect(result?.id).toBe('only')
  })

  it('skips nodes with missing x/y', () => {
    const noPos: GraphNode = {
      id: 'nopos',
      title: 'No Position',
      typeId: 'type-1',
      typeName: 'Page',
      typeColor: null,
      typeIcon: 'file',
      icon: null,
      connectionCount: 0,
      index: 0,
    }
    const positioned = makeNode('ok', 100, 100)
    const result = findCenterNode([noPos, positioned], 0, 0)
    expect(result?.id).toBe('ok')
  })

  it('uses custom center coordinates', () => {
    const nodes = [
      makeNode('a', 0, 0),
      makeNode('b', 500, 500),
    ]
    const result = findCenterNode(nodes, 490, 490)
    expect(result?.id).toBe('b')
  })
})
