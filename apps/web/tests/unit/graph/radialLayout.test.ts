import { describe, it, expect } from 'vitest'
import { radialLayout } from '@/features/graph/lib/layouts/radialLayout'
import type { GraphNode, GraphEdge } from '@/features/graph/lib/types'

function makeNode(id: string, connectionCount = 1): GraphNode {
  return {
    id,
    title: id,
    typeId: 'type-1',
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

describe('radialLayout', () => {
  it('returns empty arrays for empty input', () => {
    const result = radialLayout([], [], WIDTH, HEIGHT)
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('places root near center', () => {
    const nodes = [makeNode('root', 2), makeNode('child')]
    const edges = [makeEdge('e1', 'root', 'child')]

    const result = radialLayout(nodes, edges, WIDTH, HEIGHT)
    const root = result.nodes.find((n) => n.id === 'root')!

    // Root should be at or very near center
    expect(root.x).toBeCloseTo(WIDTH / 2, -1)
    expect(root.y).toBeCloseTo(HEIGHT / 2, -1)
  })

  it('places children farther from center than root', () => {
    const nodes = [makeNode('root', 2), makeNode('child1'), makeNode('child2')]
    const edges = [
      makeEdge('e1', 'root', 'child1'),
      makeEdge('e2', 'root', 'child2'),
    ]

    const result = radialLayout(nodes, edges, WIDTH, HEIGHT)
    const root = result.nodes.find((n) => n.id === 'root')!
    const child1 = result.nodes.find((n) => n.id === 'child1')!

    const rootDist = Math.sqrt((root.x! - WIDTH / 2) ** 2 + (root.y! - HEIGHT / 2) ** 2)
    const childDist = Math.sqrt((child1.x! - WIDTH / 2) ** 2 + (child1.y! - HEIGHT / 2) ** 2)

    expect(childDist).toBeGreaterThan(rootDist)
  })

  it('preserves all nodes and edges', () => {
    const nodes = [makeNode('A', 2), makeNode('B'), makeNode('C')]
    const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'A', 'C')]

    const result = radialLayout(nodes, edges, WIDTH, HEIGHT)
    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)
  })

  it('positions all nodes with finite coordinates', () => {
    const nodes = [
      makeNode('A', 3),
      makeNode('B'),
      makeNode('C'),
      makeNode('D'),
    ]
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'A', 'C'),
      makeEdge('e3', 'A', 'D'),
    ]

    const result = radialLayout(nodes, edges, WIDTH, HEIGHT)
    for (const node of result.nodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
    }
  })
})
