import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'

export interface GraphNode extends SimulationNodeDatum {
  id: string
  title: string
  typeId: string
  typeName: string
  typeColor: string | null
  typeIcon: string
  icon: string | null
  connectionCount: number
}

export interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  id: string
  sourceId: string
  targetId: string
  relationType: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type GraphLayoutMode = 'force' | 'hierarchical' | 'radial' | 'clustered'
