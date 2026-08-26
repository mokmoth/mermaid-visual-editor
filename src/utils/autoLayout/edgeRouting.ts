/**
 * Stage 6: Edge Routing
 * Calculate edge paths with proper connection points
 */

import type { NormalizedGraph, NodeLayout, EdgeLayout, EdgeRoute, LayoutOptions } from './types'

/**
 * Calculate edge routes based on node positions
 */
export function routeEdges(
  graph: NormalizedGraph,
  nodeLayouts: Map<string, NodeLayout>,
  options: LayoutOptions
): Map<string, EdgeLayout> {
  const result = new Map<string, EdgeLayout>()
  const { edges } = graph

  edges.forEach(edge => {
    if (edge.isSelfLoop) {
      // Self-loop handling
      const route = routeSelfLoop(edge.source, nodeLayouts, options)
      if (route) {
        result.set(edge.id, { id: edge.id, route })
      }
    } else {
      const route = routeEdge(
        edge.source,
        edge.target,
        nodeLayouts,
        options,
        edge.isBackEdge
      )
      if (route) {
        result.set(edge.id, { id: edge.id, route })
      }
    }
  })

  return result
}

/**
 * Route a single edge between two nodes
 */
function routeEdge(
  sourceId: string,
  targetId: string,
  nodeLayouts: Map<string, NodeLayout>,
  options: LayoutOptions,
  isBackEdge?: boolean
): EdgeRoute | null {
  const source = nodeLayouts.get(sourceId)
  const target = nodeLayouts.get(targetId)

  if (!source || !target) return null

  // Calculate node centers
  const sourceCenterX = source.x + source.width / 2
  const sourceCenterY = source.y + source.height / 2
  const targetCenterX = target.x + target.width / 2
  const targetCenterY = target.y + target.height / 2

  // Determine connection sides based on relative positions
  const dx = targetCenterX - sourceCenterX
  const dy = targetCenterY - sourceCenterY

  let sourceSide: 'top' | 'bottom' | 'left' | 'right'
  let targetSide: 'top' | 'bottom' | 'left' | 'right'

  const direction = options.direction

  // Choose sides based on layout direction and relative positions
  if (direction === 'TD' || direction === 'BT') {
    // Vertical layout - prefer top/bottom connections
    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      if (dy > 0) {
        sourceSide = 'bottom'
        targetSide = 'top'
      } else {
        sourceSide = 'top'
        targetSide = 'bottom'
      }
    } else {
      // Horizontal connection for nodes on same level
      if (dx > 0) {
        sourceSide = 'right'
        targetSide = 'left'
      } else {
        sourceSide = 'left'
        targetSide = 'right'
      }
    }
  } else {
    // Horizontal layout - prefer left/right connections
    if (Math.abs(dx) > Math.abs(dy) * 0.5) {
      if (dx > 0) {
        sourceSide = 'right'
        targetSide = 'left'
      } else {
        sourceSide = 'left'
        targetSide = 'right'
      }
    } else {
      // Vertical connection for nodes on same level
      if (dy > 0) {
        sourceSide = 'bottom'
        targetSide = 'top'
      } else {
        sourceSide = 'top'
        targetSide = 'bottom'
      }
    }
  }

  // Calculate port positions
  const sourcePort = getPortPosition(source, sourceSide)
  const targetPort = getPortPosition(target, targetSide)

  // Calculate bend points based on routing type
  let bendPoints: { x: number; y: number }[] = []
  let routeType: 'orthogonal' | 'bezier' | 'straight' = 'straight'

  if (options.edgeRouting === 'orthogonal' || options.edgeRouting === 'auto') {
    bendPoints = calculateOrthogonalPath(sourcePort, sourceSide, targetPort, targetSide, isBackEdge)
    routeType = 'orthogonal'
  } else if (options.edgeRouting === 'bezier') {
    bendPoints = calculateBezierControlPoints(sourcePort, sourceSide, targetPort, targetSide)
    routeType = 'bezier'
  }

  return {
    sourcePort: { ...sourcePort, side: sourceSide },
    targetPort: { ...targetPort, side: targetSide },
    bendPoints,
    routeType
  }
}

/**
 * Get the position of a port on a node side
 */
function getPortPosition(
  node: NodeLayout,
  side: 'top' | 'bottom' | 'left' | 'right'
): { x: number; y: number } {
  const centerX = node.x + node.width / 2
  const centerY = node.y + node.height / 2

  switch (side) {
    case 'top':
      return { x: centerX, y: node.y }
    case 'bottom':
      return { x: centerX, y: node.y + node.height }
    case 'left':
      return { x: node.x, y: centerY }
    case 'right':
      return { x: node.x + node.width, y: centerY }
  }
}

/**
 * Calculate orthogonal (right-angle) path between two points
 */
function calculateOrthogonalPath(
  source: { x: number; y: number },
  sourceSide: 'top' | 'bottom' | 'left' | 'right',
  target: { x: number; y: number },
  targetSide: 'top' | 'bottom' | 'left' | 'right',
  isBackEdge?: boolean
): { x: number; y: number }[] {
  const bendPoints: { x: number; y: number }[] = []
  const gap = 20 // Gap from node

  // For back edges, route around
  if (isBackEdge) {
    if (sourceSide === 'bottom' && targetSide === 'top') {
      // Loop on the right side
      const midX = Math.max(source.x, target.x) + 60
      bendPoints.push({ x: source.x, y: source.y + gap })
      bendPoints.push({ x: midX, y: source.y + gap })
      bendPoints.push({ x: midX, y: target.y - gap })
      bendPoints.push({ x: target.x, y: target.y - gap })
    }
    return bendPoints
  }

  // Simple orthogonal routing
  if (sourceSide === 'bottom' && targetSide === 'top') {
    // Vertical connection
    const midY = (source.y + target.y) / 2
    if (Math.abs(source.x - target.x) < 5) {
      // Direct vertical line, no bends needed
    } else {
      bendPoints.push({ x: source.x, y: midY })
      bendPoints.push({ x: target.x, y: midY })
    }
  } else if (sourceSide === 'top' && targetSide === 'bottom') {
    const midY = (source.y + target.y) / 2
    if (Math.abs(source.x - target.x) < 5) {
      // Direct vertical line
    } else {
      bendPoints.push({ x: source.x, y: midY })
      bendPoints.push({ x: target.x, y: midY })
    }
  } else if (sourceSide === 'right' && targetSide === 'left') {
    // Horizontal connection
    const midX = (source.x + target.x) / 2
    if (Math.abs(source.y - target.y) < 5) {
      // Direct horizontal line
    } else {
      bendPoints.push({ x: midX, y: source.y })
      bendPoints.push({ x: midX, y: target.y })
    }
  } else if (sourceSide === 'left' && targetSide === 'right') {
    const midX = (source.x + target.x) / 2
    if (Math.abs(source.y - target.y) < 5) {
      // Direct horizontal line
    } else {
      bendPoints.push({ x: midX, y: source.y })
      bendPoints.push({ x: midX, y: target.y })
    }
  } else {
    // Mixed direction - need corner
    if ((sourceSide === 'bottom' || sourceSide === 'top') &&
        (targetSide === 'left' || targetSide === 'right')) {
      bendPoints.push({ x: source.x, y: target.y })
    } else if ((sourceSide === 'left' || sourceSide === 'right') &&
               (targetSide === 'top' || targetSide === 'bottom')) {
      bendPoints.push({ x: target.x, y: source.y })
    }
  }

  return bendPoints
}

/**
 * Calculate Bezier curve control points
 */
function calculateBezierControlPoints(
  source: { x: number; y: number },
  sourceSide: 'top' | 'bottom' | 'left' | 'right',
  target: { x: number; y: number },
  targetSide: 'top' | 'bottom' | 'left' | 'right'
): { x: number; y: number }[] {
  const distance = Math.sqrt(
    Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)
  )
  const curvature = Math.min(distance * 0.3, 50)

  // Calculate control point offset based on side
  const getOffset = (side: 'top' | 'bottom' | 'left' | 'right') => {
    switch (side) {
      case 'top': return { x: 0, y: -curvature }
      case 'bottom': return { x: 0, y: curvature }
      case 'left': return { x: -curvature, y: 0 }
      case 'right': return { x: curvature, y: 0 }
    }
  }

  const sourceOffset = getOffset(sourceSide)
  const targetOffset = getOffset(targetSide)

  return [
    { x: source.x + sourceOffset.x, y: source.y + sourceOffset.y },
    { x: target.x + targetOffset.x, y: target.y + targetOffset.y }
  ]
}

/**
 * Route a self-loop edge
 */
function routeSelfLoop(
  nodeId: string,
  nodeLayouts: Map<string, NodeLayout>,
  _options: LayoutOptions
): EdgeRoute | null {
  const node = nodeLayouts.get(nodeId)
  if (!node) return null

  // Self-loop on the right side of the node
  const loopSize = 30
  const sourcePort = { x: node.x + node.width, y: node.y + node.height * 0.3 }
  const targetPort = { x: node.x + node.width, y: node.y + node.height * 0.7 }

  return {
    sourcePort: { ...sourcePort, side: 'right' },
    targetPort: { ...targetPort, side: 'right' },
    bendPoints: [
      { x: sourcePort.x + loopSize, y: sourcePort.y },
      { x: sourcePort.x + loopSize, y: targetPort.y }
    ],
    routeType: 'orthogonal'
  }
}
