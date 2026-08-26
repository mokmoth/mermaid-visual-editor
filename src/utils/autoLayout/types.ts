/**
 * Auto Layout Algorithm - Type Definitions
 * Based on the 6-stage pipeline design
 */

import type { GraphNode, GraphLink, Swimlane, FlowDirection } from '@/types'

// ============ Input Types ============

export interface LayoutInput {
  nodes: GraphNode[]
  links: GraphLink[]
  swimlanes: Swimlane[]
  direction: FlowDirection
}

// ============ Normalized Graph (Stage 1 Output) ============

export interface NormalizedNode {
  id: string
  type: string
  width: number
  height: number
  originalX: number
  originalY: number
  isStart: boolean
  isEnd: boolean
  swimlaneId?: string
  laneId?: string
  parentId?: string
}

export interface NormalizedEdge {
  id: string
  source: string
  target: string
  label?: string
  type: 'solid' | 'dotted' | 'thick'
  isSelfLoop: boolean
  isBackEdge?: boolean
}

export interface ContainerInfo {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  orientation: 'horizontal' | 'vertical'
  lanes: { id: string; name: string }[]
  childNodeIds: string[]
}

export interface NormalizedGraph {
  nodes: NormalizedNode[]
  edges: NormalizedEdge[]
  containers: ContainerInfo[]
  startNodes: string[]
  endNodes: string[]
  isolatedNodes: string[]
}

// ============ Graph Analysis (Stage 2 Output) ============

export interface GraphAnalysis {
  components: string[][]           // Connected components
  isDAG: boolean                   // Is Directed Acyclic Graph
  backEdges: string[]              // Edge IDs that form cycles
  maxDepth: number                 // Maximum path length
  density: number                  // edges/nodes ratio
  suggestedAlgorithm: 'sugiyama' | 'force' | 'hybrid'
}

// ============ Layer Assignment (Stage 3 Output) ============

export interface VirtualNode {
  id: string
  edgeId: string                   // Original edge this belongs to
  layer: number
  isVirtual: true
}

export interface LayerAssignment {
  layers: string[][]               // layers[i] = node IDs in layer i
  nodeToLayer: Map<string, number>
  virtualNodes: VirtualNode[]
  layerCount: number
}

// ============ Layout Result (Final Output) ============

export interface NodeLayout {
  id: string
  x: number
  y: number
  width: number
  height: number
  layer?: number
}

export interface EdgeRoute {
  sourcePort: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }
  targetPort: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }
  bendPoints: { x: number; y: number }[]
  routeType: 'orthogonal' | 'bezier' | 'straight'
}

export interface EdgeLayout {
  id: string
  route: EdgeRoute
}

export interface LayoutMetrics {
  crossingCount: number
  totalEdgeLength: number
  executionTime: number
  algorithm: string
}

export interface LayoutResult {
  success: boolean
  nodes: Map<string, NodeLayout>
  edges: Map<string, EdgeLayout>
  containers: Map<string, ContainerInfo>
  metrics: LayoutMetrics
}

// ============ Configuration ============

export interface LayoutOptions {
  direction: FlowDirection
  spacing: {
    layer: number              // Layer spacing (default: 80)
    node: number               // Node spacing (default: 50)
    containerPadding: number   // Container padding (default: 30)
  }
  edgeRouting: 'orthogonal' | 'bezier' | 'straight' | 'auto'
  algorithm: {
    type: 'sugiyama' | 'force' | 'auto'
    maxIterations: number
    timeout: number
  }
  specialNodes: {
    treatStartAsFirst: boolean
    treatEndAsLast: boolean
  }
  gridSize: number
}

export const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'TD',
  spacing: {
    layer: 80,
    node: 50,
    containerPadding: 30
  },
  edgeRouting: 'orthogonal',
  algorithm: {
    type: 'auto',
    maxIterations: 100,
    timeout: 500
  },
  specialNodes: {
    treatStartAsFirst: true,
    treatEndAsLast: true
  },
  gridSize: 20
}
