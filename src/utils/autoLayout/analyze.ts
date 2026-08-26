/**
 * Stage 2: Structure Analysis
 * Analyze graph topology and select optimal algorithm
 */

import type { NormalizedGraph, GraphAnalysis } from './types'

/**
 * Analyze the graph structure
 */
export function analyzeStructure(graph: NormalizedGraph): GraphAnalysis {
  const { nodes, edges } = graph

  // 2.1 Find connected components using Union-Find
  const components = findConnectedComponents(nodes, edges)

  // 2.2 Detect cycles and back edges using DFS
  const { isDAG, backEdges } = detectCycles(nodes, edges)

  // 2.3 Calculate max depth (longest path)
  const maxDepth = calculateMaxDepth(nodes, edges, backEdges)

  // 2.4 Calculate density
  const density = nodes.length > 0 ? edges.length / nodes.length : 0

  // 2.5 Suggest algorithm based on analysis
  const suggestedAlgorithm = selectAlgorithm(isDAG, density, nodes.length)

  return {
    components,
    isDAG,
    backEdges,
    maxDepth,
    density,
    suggestedAlgorithm
  }
}

/**
 * Find connected components using Union-Find
 */
function findConnectedComponents(
  nodes: { id: string }[],
  edges: { source: string; target: string; isSelfLoop: boolean }[]
): string[][] {
  const parent = new Map<string, string>()
  const rank = new Map<string, number>()

  // Initialize
  nodes.forEach(n => {
    parent.set(n.id, n.id)
    rank.set(n.id, 0)
  })

  // Find with path compression
  function find(x: string): string {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!))
    }
    return parent.get(x)!
  }

  // Union by rank
  function union(x: string, y: string) {
    const px = find(x)
    const py = find(y)
    if (px === py) return

    const rx = rank.get(px)!
    const ry = rank.get(py)!

    if (rx < ry) {
      parent.set(px, py)
    } else if (rx > ry) {
      parent.set(py, px)
    } else {
      parent.set(py, px)
      rank.set(px, rx + 1)
    }
  }

  // Process edges (treat as undirected for connectivity)
  edges.forEach(e => {
    if (!e.isSelfLoop) {
      union(e.source, e.target)
    }
  })

  // Group nodes by their root
  const componentMap = new Map<string, string[]>()
  nodes.forEach(n => {
    const root = find(n.id)
    if (!componentMap.has(root)) {
      componentMap.set(root, [])
    }
    componentMap.get(root)!.push(n.id)
  })

  return Array.from(componentMap.values())
}

/**
 * Detect cycles using DFS and identify back edges
 */
function detectCycles(
  nodes: { id: string }[],
  edges: { id: string; source: string; target: string; isSelfLoop: boolean }[]
): { isDAG: boolean; backEdges: string[] } {
  const WHITE = 0  // Not visited
  const GRAY = 1   // Being processed
  const BLACK = 2  // Finished

  const color = new Map<string, number>()
  const backEdges: string[] = []

  // Build adjacency list
  const adj = new Map<string, { target: string; edgeId: string }[]>()
  nodes.forEach(n => {
    color.set(n.id, WHITE)
    adj.set(n.id, [])
  })

  edges.forEach(e => {
    if (!e.isSelfLoop && adj.has(e.source)) {
      adj.get(e.source)!.push({ target: e.target, edgeId: e.id })
    }
  })

  // DFS
  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY)

    for (const { target, edgeId } of adj.get(nodeId) || []) {
      const targetColor = color.get(target)

      if (targetColor === GRAY) {
        // Back edge found (cycle)
        backEdges.push(edgeId)
      } else if (targetColor === WHITE) {
        if (dfs(target)) {
          // Cycle found in subtree
        }
      }
    }

    color.set(nodeId, BLACK)
    return false
  }

  // Run DFS from all unvisited nodes
  nodes.forEach(n => {
    if (color.get(n.id) === WHITE) {
      dfs(n.id)
    }
  })

  return {
    isDAG: backEdges.length === 0,
    backEdges
  }
}

/**
 * Calculate the maximum depth (longest path) in the graph
 */
function calculateMaxDepth(
  nodes: { id: string }[],
  edges: { id: string; source: string; target: string; isSelfLoop: boolean }[],
  backEdges: string[]
): number {
  const backEdgeSet = new Set(backEdges)

  // Build adjacency list (excluding back edges)
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  nodes.forEach(n => {
    adj.set(n.id, [])
    inDegree.set(n.id, 0)
  })

  edges.forEach(e => {
    if (!e.isSelfLoop && !backEdgeSet.has(e.id) && adj.has(e.source)) {
      adj.get(e.source)!.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    }
  })

  // Topological sort with level tracking
  const depth = new Map<string, number>()
  const queue: string[] = []

  // Initialize with source nodes
  nodes.forEach(n => {
    depth.set(n.id, 0)
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push(n.id)
    }
  })

  let maxDepth = 0

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentDepth = depth.get(current) || 0
    maxDepth = Math.max(maxDepth, currentDepth)

    for (const neighbor of adj.get(current) || []) {
      const newDepth = currentDepth + 1
      if (newDepth > (depth.get(neighbor) || 0)) {
        depth.set(neighbor, newDepth)
      }

      const newInDegree = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newInDegree)

      if (newInDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  return maxDepth
}

/**
 * Select the best algorithm based on graph characteristics
 */
function selectAlgorithm(
  isDAG: boolean,
  density: number,
  nodeCount: number
): 'sugiyama' | 'force' | 'hybrid' {
  // Very dense graphs or graphs with many cycles -> force-directed
  if (density > 3.0 || (!isDAG && density > 1.5)) {
    return 'force'
  }

  // Small graphs with cycles -> hybrid
  if (!isDAG && nodeCount < 50) {
    return 'hybrid'
  }

  // Default to Sugiyama for hierarchical layout
  return 'sugiyama'
}
