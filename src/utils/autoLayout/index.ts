/**
 * Auto Layout Algorithm - Main Entry Point
 *
 * Implements a 6-stage pipeline:
 * 1. Preprocessing - Normalize graph data
 * 2. Structure Analysis - Analyze topology
 * 3. Layer Assignment - Assign nodes to layers (Sugiyama Phase 1)
 * 4. Crossing Reduction - Order nodes within layers (Sugiyama Phase 2)
 * 5. Coordinate Assignment - Calculate positions (Sugiyama Phase 3)
 * 6. Edge Routing - Calculate edge paths
 */

import type { GraphNode, GraphLink, Swimlane, FlowDirection } from '@/types'
import type { LayoutOptions, LayoutResult, NodeLayout } from './types'
import { preprocess } from './preprocess'
import { analyzeStructure } from './analyze'
import { runSugiyamaLayout } from './sugiyama'
import { findSwimlaneAndLaneForNode } from '../geometry'
// Edge routing is available but not used in the simple API
// import { routeEdges } from './edgeRouting'

export type { LayoutOptions, LayoutResult, NodeLayout }

/**
 * Main auto-layout function
 *
 * @param nodes - Array of graph nodes
 * @param links - Array of graph links
 * @param direction - Layout direction (TD, LR, BT, RL)
 * @param swimlanes - Array of swimlanes/containers
 * @param options - Optional layout configuration
 * @returns Array of nodes with updated positions
 */
export function applyAutoLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  direction: FlowDirection,
  swimlanes: Swimlane[] = [],
  options?: Partial<LayoutOptions>
): GraphNode[] {
  // Merge with default options
  const opts: LayoutOptions = {
    direction,
    spacing: {
      layer: options?.spacing?.layer ?? 80,
      node: options?.spacing?.node ?? 50,
      containerPadding: options?.spacing?.containerPadding ?? 30
    },
    edgeRouting: options?.edgeRouting ?? 'orthogonal',
    algorithm: {
      type: options?.algorithm?.type ?? 'auto',
      maxIterations: options?.algorithm?.maxIterations ?? 100,
      timeout: options?.algorithm?.timeout ?? 500
    },
    specialNodes: {
      treatStartAsFirst: options?.specialNodes?.treatStartAsFirst ?? true,
      treatEndAsLast: options?.specialNodes?.treatEndAsLast ?? true
    },
    gridSize: options?.gridSize ?? 20
  }

  // Handle empty input
  if (nodes.length === 0) {
    return nodes
  }

  // Handle single node
  if (nodes.length === 1) {
    return [{
      ...nodes[0],
      x: snapToGrid(nodes[0].x, opts.gridSize),
      y: snapToGrid(nodes[0].y, opts.gridSize)
    }]
  }

  try {
    // IMPORTANT: Recalculate swimlane associations based on current visual positions
    // This ensures the layout uses the actual position as source of truth
    const nodesWithUpdatedAssociations = swimlanes.length > 0
      ? nodes.map(node => {
          const { swimlaneId, laneId } = findSwimlaneAndLaneForNode(node, swimlanes)
          return { ...node, swimlaneId, laneId }
        })
      : nodes

    // Stage 1: Preprocessing
    const normalizedGraph = preprocess(nodesWithUpdatedAssociations, links, swimlanes)

    // Stage 2: Structure Analysis
    const analysis = analyzeStructure(normalizedGraph)

    // Stages 3-5: Sugiyama Layout (or fallback)
    const nodeLayouts = runSugiyamaLayout(normalizedGraph, analysis, opts)

    // Stage 6: Edge Routing (available for future use)
    // const edgeLayouts = routeEdges(normalizedGraph, nodeLayouts, opts)

    // Convert layout results back to GraphNode format
    // Use nodesWithUpdatedAssociations to preserve the recalculated swimlane assignments
    const result = nodesWithUpdatedAssociations.map(node => {
      const layout = nodeLayouts.get(node.id)
      if (layout) {
        return {
          ...node,
          x: layout.x,
          y: layout.y
        }
      }
      return node
    })

    return result

  } catch (error) {
    // Return original nodes on failure
    return nodes
  }
}

/**
 * Snap value to grid
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

/**
 * Get layout suggestions without applying
 */
export function suggestLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  swimlanes: Swimlane[] = []
): {
  suggestedDirection: FlowDirection
  suggestedAlgorithm: 'sugiyama' | 'force' | 'hybrid'
  isDAG: boolean
  hasContainers: boolean
} {
  const normalizedGraph = preprocess(nodes, links, swimlanes)
  const analysis = analyzeStructure(normalizedGraph)

  // Suggest direction based on graph shape
  let suggestedDirection: FlowDirection = 'TD'
  if (analysis.maxDepth > 5 && nodes.length > 10) {
    // Wide graph - suggest horizontal
    suggestedDirection = 'LR'
  }

  return {
    suggestedDirection,
    suggestedAlgorithm: analysis.suggestedAlgorithm,
    isDAG: analysis.isDAG,
    hasContainers: swimlanes.length > 0
  }
}
