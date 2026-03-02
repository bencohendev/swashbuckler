import { describe, it, expect } from 'vitest'
import { hierarchicalLayout } from '@/features/graph/lib/layouts/hierarchicalLayout'
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

describe('hierarchicalLayout', () => {
  it('returns empty arrays for empty input', () => {
    const result = hierarchicalLayout([], [], WIDTH, HEIGHT)
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('positions single node', () => {
    const result = hierarchicalLayout([makeNode('A')], [], WIDTH, HEIGHT)
    expect(result.nodes).toHaveLength(1)
    expect(typeof result.nodes[0].x).toBe('number')
    expect(typeof result.nodes[0].y).toBe('number')
  })

  it('assigns different y values to different depth levels', () => {
    const nodes = [
      makeNode('root', 2),
      makeNode('child1', 1),
      makeNode('child2', 1),
    ]
    const edges = [
      makeEdge('e1', 'root', 'child1'),
      makeEdge('e2', 'root', 'child2'),
    ]

    const result = hierarchicalLayout(nodes, edges, WIDTH, HEIGHT)
    const root = result.nodes.find((n) => n.id === 'root')!
    const child1 = result.nodes.find((n) => n.id === 'child1')!
    const child2 = result.nodes.find((n) => n.id === 'child2')!

    // Children should be at a deeper y than root
    expect(child1.y).toBeGreaterThan(root.y!)
    expect(child2.y).toBeGreaterThan(root.y!)
    // Siblings should be at the same depth
    expect(child1.y).toBe(child2.y)
  })

  it('preserves all nodes and edges', () => {
    const nodes = [makeNode('A', 2), makeNode('B'), makeNode('C')]
    const edges = [makeEdge('e1', 'A', 'B'), makeEdge('e2', 'A', 'C')]

    const result = hierarchicalLayout(nodes, edges, WIDTH, HEIGHT)

    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C'])
  })

  it('positions all nodes with finite coordinates', () => {
    const nodes = [
      makeNode('A', 3),
      makeNode('B', 1),
      makeNode('C', 1),
      makeNode('D', 1),
    ]
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'A', 'C'),
      makeEdge('e3', 'A', 'D'),
    ]

    const result = hierarchicalLayout(nodes, edges, WIDTH, HEIGHT)
    for (const node of result.nodes) {
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
    }
  })
})
