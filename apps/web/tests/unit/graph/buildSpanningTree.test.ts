import { describe, it, expect } from 'vitest'
import { buildSpanningTree } from '@/features/graph/lib/layouts/buildSpanningTree'
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

describe('buildSpanningTree', () => {
  it('returns virtual root for empty graph', () => {
    const result = buildSpanningTree([], [])
    expect(result.root.id).toBe('__virtual_root__')
    expect(result.root.children).toEqual([])
    expect(result.hasVirtualRoot).toBe(true)
    expect(result.crossEdgeIds.size).toBe(0)
  })

  it('builds tree from single node (no edges)', () => {
    const nodes = [makeNode('A')]
    const result = buildSpanningTree(nodes, [])
    expect(result.hasVirtualRoot).toBe(false)
    expect(result.root.id).toBe('A')
    expect(result.root.children).toEqual([])
  })

  it('builds tree from linear chain A—B—C', () => {
    const nodes = [makeNode('A', 1), makeNode('B', 2), makeNode('C', 1)]
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
    ]
    const result = buildSpanningTree(nodes, edges)

    // B has highest connectionCount → should be root
    expect(result.hasVirtualRoot).toBe(false)
    expect(result.root.id).toBe('B')

    const childIds = result.root.children.map((c) => c.id).sort()
    expect(childIds).toEqual(['A', 'C'])
    expect(result.crossEdgeIds.size).toBe(0)
  })

  it('identifies cross-edges in a triangle', () => {
    const nodes = [
      makeNode('A', 2),
      makeNode('B', 2),
      makeNode('C', 2),
    ]
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
      makeEdge('e3', 'A', 'C'),
    ]
    const result = buildSpanningTree(nodes, edges)

    // 3 nodes, 3 edges → spanning tree uses 2, leaves 1 cross-edge
    expect(result.crossEdgeIds.size).toBe(1)
    expect(result.hasVirtualRoot).toBe(false)
  })

  it('handles disconnected components with virtual root', () => {
    const nodes = [
      makeNode('A', 1),
      makeNode('B', 1),
      makeNode('C', 1),
      makeNode('D', 1),
    ]
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'C', 'D'),
    ]
    const result = buildSpanningTree(nodes, edges)

    expect(result.hasVirtualRoot).toBe(true)
    expect(result.root.id).toBe('__virtual_root__')
    expect(result.root.children).toHaveLength(2)
    expect(result.crossEdgeIds.size).toBe(0)
  })

  it('picks most-connected node as root', () => {
    const nodes = [
      makeNode('A', 1),
      makeNode('B', 5),
      makeNode('C', 3),
    ]
    const edges = [
      makeEdge('e1', 'A', 'B'),
      makeEdge('e2', 'B', 'C'),
    ]
    const result = buildSpanningTree(nodes, edges)
    expect(result.root.id).toBe('B')
  })

  it('includes all nodes in the tree', () => {
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
    const result = buildSpanningTree(nodes, edges)

    function collectIds(node: { id: string; children: { id: string; children: unknown[] }[] }): string[] {
      return [node.id, ...node.children.flatMap((c) => collectIds(c as typeof node))]
    }

    const ids = collectIds(result.root).sort()
    expect(ids).toEqual(['A', 'B', 'C', 'D'])
  })
})
