import { describe, it, expect } from 'vitest'
import { clusteredLayout } from '@/features/graph/lib/layouts/clusteredLayout'
import type { GraphNode, GraphEdge } from '@/features/graph/lib/types'

function makeNode(id: string, typeId: string, connectionCount = 1): GraphNode {
  return {
    id,
    title: id,
    typeId,
    typeName: 'Page',
    typeColor: null,
    typeIcon: '📄',
    icon: null,
    connectionCount,
    x: 0,
    y: 0,
  }
}

function makeEdge(id: string, sourceId: string, targetId: string): GraphEdge {
  return {
    id,
    sourceId,
    targetId,
    relationType: 'mention',
    source: sourceId,
    target: targetId,
  }
}

const WIDTH = 800
const HEIGHT = 600

describe('clusteredLayout', () => {
  it('returns empty arrays for empty input', () => {
    const result = clusteredLayout([], [], WIDTH, HEIGHT)
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('positions a single node at center', () => {
    const nodes = [makeNode('A', 'type-1')]
    const result = clusteredLayout(nodes, [], WIDTH, HEIGHT)

    expect(result.nodes).toHaveLength(1)
    // Single node in single cluster → should be at center
    expect(result.nodes[0].x).toBeCloseTo(WIDTH / 2, -1)
    expect(result.nodes[0].y).toBeCloseTo(HEIGHT / 2, -1)
  })

  it('groups nodes of the same type together', () => {
    const nodes = [
      makeNode('A1', 'type-a'),
      makeNode('A2', 'type-a'),
      makeNode('B1', 'type-b'),
      makeNode('B2', 'type-b'),
    ]
    const result = clusteredLayout(nodes, [], WIDTH, HEIGHT)

    const a1 = result.nodes.find((n) => n.id === 'A1')!
    const a2 = result.nodes.find((n) => n.id === 'A2')!
    const b1 = result.nodes.find((n) => n.id === 'B1')!

    // Nodes of same type should be closer to each other than to different type
    const distA1A2 = Math.sqrt((a1.x! - a2.x!) ** 2 + (a1.y! - a2.y!) ** 2)
    const distA1B1 = Math.sqrt((a1.x! - b1.x!) ** 2 + (a1.y! - b1.y!) ** 2)

    expect(distA1A2).toBeLessThan(distA1B1)
  })

  it('preserves all nodes and edges', () => {
    const nodes = [
      makeNode('A', 'type-1'),
      makeNode('B', 'type-2'),
    ]
    const edges = [makeEdge('e1', 'A', 'B')]

    const result = clusteredLayout(nodes, edges, WIDTH, HEIGHT)
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
  })

  it('positions all nodes with finite coordinates', () => {
    const nodes = [
      makeNode('A1', 'type-a'),
      makeNode('A2', 'type-a'),
      makeNode('B1', 'type-b'),
      makeNode('C1', 'type-c'),
      makeNode('C2', 'type-c'),
      makeNode('C3', 'type-c'),
    ]

    const result = clusteredLayout(nodes, [], WIDTH, HEIGHT)
    for (const node of result.nodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
    }
  })

  it('handles single cluster (all same type)', () => {
    const nodes = [
      makeNode('A', 'type-1'),
      makeNode('B', 'type-1'),
      makeNode('C', 'type-1'),
    ]
    const result = clusteredLayout(nodes, [], WIDTH, HEIGHT)

    // All nodes should be positioned (no NaN)
    for (const node of result.nodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
    }
  })
})
