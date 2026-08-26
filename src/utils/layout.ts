import dagre from 'dagre'
import type { GraphNode, GraphLink, FlowDirection, Swimlane } from '@/types'
import { getNodeSize } from './nodeSize'
import { findSwimlaneAndLaneForNode } from './geometry'

const GRID_SIZE = 20
const MIN_SPACING = 40 // Minimum spacing between nodes

/**
 * Apply automatic layout with smart alignment
 * - Aligns nodes to grid
 * - Finds horizontal/vertical alignment opportunities
 * - Maintains proper spacing between nodes
 */
export function applyAutoLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  direction: FlowDirection,
  swimlanes: Swimlane[] = []
): GraphNode[] {
  if (nodes.length === 0) return nodes

  // If no swimlanes, use smart layout
  if (swimlanes.length === 0) {
    return smartLayout(nodes, links, direction)
  }

  // IMPORTANT: Recalculate swimlane associations based on current visual positions
  // This ensures the layout uses the actual position as source of truth
  const nodesWithUpdatedAssociations = nodes.map(node => {
    const { swimlaneId, laneId } = findSwimlaneAndLaneForNode(node, swimlanes)
    return { ...node, swimlaneId, laneId }
  })

  // Group nodes by swimlane and lane
  const nodesOutsideSwimlanes: GraphNode[] = []
  const nodesBySwimlane = new Map<string, Map<string | null, GraphNode[]>>()

  nodesWithUpdatedAssociations.forEach(node => {
    if (node.swimlaneId && swimlanes.some(s => s.id === node.swimlaneId)) {
      if (!nodesBySwimlane.has(node.swimlaneId)) {
        nodesBySwimlane.set(node.swimlaneId, new Map())
      }
      const laneMap = nodesBySwimlane.get(node.swimlaneId)!
      const laneKey = node.laneId || null
      if (!laneMap.has(laneKey)) {
        laneMap.set(laneKey, [])
      }
      laneMap.get(laneKey)!.push(node)
    } else {
      nodesOutsideSwimlanes.push(node)
    }
  })

  const result: GraphNode[] = []

  // Layout nodes within each swimlane/lane
  swimlanes.forEach(swimlane => {
    const laneMap = nodesBySwimlane.get(swimlane.id)
    if (!laneMap) return

    const headerHeight = 36
    const lanes = swimlane.lanes || []
    const laneCount = lanes.length || 1
    const isHorizontal = swimlane.orientation === 'horizontal'
    const contentHeight = swimlane.height - headerHeight
    const contentWidth = swimlane.width

    // Layout nodes in each lane
    lanes.forEach((lane, laneIndex) => {
      const laneNodes = laneMap.get(lane.id) || []
      if (laneNodes.length === 0) return

      // Calculate lane bounds
      let laneX = swimlane.x
      let laneY = swimlane.y + headerHeight
      let laneWidth = contentWidth
      let laneHeight = contentHeight

      if (isHorizontal) {
        laneHeight = contentHeight / laneCount
        laneY = swimlane.y + headerHeight + laneIndex * laneHeight
      } else {
        laneWidth = contentWidth / laneCount
        laneX = swimlane.x + laneIndex * laneWidth
      }

      // Smart layout within lane bounds
      const layoutedLaneNodes = smartLayoutInArea(
        laneNodes,
        links,
        laneX + 20,
        laneY + 30,
        laneWidth - 40,
        laneHeight - 50
      )

      result.push(...layoutedLaneNodes)
    })

    // Layout nodes in swimlane but not in specific lane
    const swimlaneOnlyNodes = laneMap.get(null) || []
    if (swimlaneOnlyNodes.length > 0) {
      const layoutedSwimlaneNodes = smartLayoutInArea(
        swimlaneOnlyNodes,
        links,
        swimlane.x + 20,
        swimlane.y + headerHeight + 20,
        swimlane.width - 40,
        swimlane.height - headerHeight - 40
      )
      result.push(...layoutedSwimlaneNodes)
    }
  })

  // Layout nodes outside swimlanes
  if (nodesOutsideSwimlanes.length > 0) {
    // Calculate the bounding box of outside nodes based on their current positions
    // This preserves the general area where the user placed them
    let minX = Infinity, minY = Infinity
    nodesOutsideSwimlanes.forEach(node => {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
    })

    // Use the top-left of the bounding box as the starting position
    const outsideX = isFinite(minX) ? Math.max(50, minX) : 50
    const outsideY = isFinite(minY) ? Math.max(50, minY) : 50

    const layoutedOutsideNodes = smartLayout(nodesOutsideSwimlanes, links, direction, outsideX, outsideY)
    result.push(...layoutedOutsideNodes)
  }

  return result
}

/**
 * Smart layout algorithm:
 * 1. Use dagre for initial layout based on connections
 * 2. Snap to grid
 * 3. Find alignment opportunities
 * 4. Resolve overlaps while maintaining alignment
 */
function smartLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  direction: FlowDirection,
  offsetX: number = 50,
  offsetY: number = 50
): GraphNode[] {
  if (nodes.length === 0) return nodes
  if (nodes.length === 1) {
    const node = nodes[0]
    return [{
      ...node,
      x: snapToGrid(node.x),
      y: snapToGrid(node.y)
    }]
  }

  // Step 1: Get initial layout from dagre
  const initialLayout = dagreLayout(nodes, links, direction, offsetX, offsetY)

  // Step 2: Snap all nodes to grid
  let layoutedNodes = initialLayout.map(node => ({
    ...node,
    x: snapToGrid(node.x),
    y: snapToGrid(node.y)
  }))

  // Step 3: Find and apply smart alignments
  layoutedNodes = applySmartAlignments(layoutedNodes)

  // Step 4: Resolve any overlaps
  layoutedNodes = resolveOverlaps(layoutedNodes)

  return layoutedNodes
}

/**
 * Smart layout within a constrained area
 */
function smartLayoutInArea(
  nodes: GraphNode[],
  links: GraphLink[],
  areaX: number,
  areaY: number,
  areaWidth: number,
  areaHeight: number
): GraphNode[] {
  if (nodes.length === 0) return nodes

  // For single node, center it in the area
  if (nodes.length === 1) {
    const node = nodes[0]
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    return [{
      ...node,
      x: snapToGrid(areaX + (areaWidth - width) / 2),
      y: snapToGrid(areaY + (areaHeight - height) / 2)
    }]
  }

  // Use dagre for initial layout
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: MIN_SPACING, ranksep: MIN_SPACING })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeIds = new Set(nodes.map(n => n.id))
  nodes.forEach(node => {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    g.setNode(node.id, { width, height })
  })

  links.forEach(link => {
    if (nodeIds.has(link.source) && nodeIds.has(link.target)) {
      g.setEdge(link.source, link.target)
    }
  })

  dagre.layout(g)

  // Calculate bounds and scale to fit area
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.forEach(node => {
    const pos = g.node(node.id)
    if (pos) {
      const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
      minX = Math.min(minX, pos.x - width / 2)
      minY = Math.min(minY, pos.y - height / 2)
      maxX = Math.max(maxX, pos.x + width / 2)
      maxY = Math.max(maxY, pos.y + height / 2)
    }
  })

  const layoutWidth = maxX - minX
  const layoutHeight = maxY - minY
  const scaleX = layoutWidth > 0 ? Math.min(1, (areaWidth - 20) / layoutWidth) : 1
  const scaleY = layoutHeight > 0 ? Math.min(1, (areaHeight - 20) / layoutHeight) : 1
  const scale = Math.min(scaleX, scaleY)

  const scaledWidth = layoutWidth * scale
  const scaledHeight = layoutHeight * scale
  const baseOffsetX = areaX + (areaWidth - scaledWidth) / 2
  const baseOffsetY = areaY + (areaHeight - scaledHeight) / 2

  let layoutedNodes = nodes.map(node => {
    const pos = g.node(node.id)
    if (!pos) return node

    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    const x = (pos.x - width / 2 - minX) * scale + baseOffsetX
    const y = (pos.y - height / 2 - minY) * scale + baseOffsetY

    return {
      ...node,
      x: snapToGrid(x),
      y: snapToGrid(y)
    }
  })

  // Apply smart alignments and resolve overlaps
  layoutedNodes = applySmartAlignments(layoutedNodes)
  layoutedNodes = resolveOverlaps(layoutedNodes)

  // Ensure nodes stay within area bounds
  return layoutedNodes.map(node => {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    return {
      ...node,
      x: Math.max(areaX + 10, Math.min(areaX + areaWidth - width - 10, node.x)),
      y: Math.max(areaY + 10, Math.min(areaY + areaHeight - height - 10, node.y))
    }
  })
}

/**
 * Use dagre for initial layout
 */
function dagreLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  direction: FlowDirection,
  offsetX: number,
  offsetY: number
): GraphNode[] {
  const g = new dagre.graphlib.Graph()
  const rankdir = direction === 'TD' ? 'TB' : direction
  g.setGraph({
    rankdir,
    marginx: 20,
    marginy: 20,
    nodesep: MIN_SPACING,
    ranksep: MIN_SPACING + 20
  })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeIds = new Set(nodes.map(n => n.id))

  nodes.forEach(node => {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    g.setNode(node.id, { width, height })
  })

  links.forEach(link => {
    if (nodeIds.has(link.source) && nodeIds.has(link.target)) {
      g.setEdge(link.source, link.target)
    }
  })

  dagre.layout(g)

  return nodes.map(node => {
    const pos = g.node(node.id)
    if (!pos) return node

    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    return {
      ...node,
      x: pos.x - width / 2 + offsetX,
      y: pos.y - height / 2 + offsetY
    }
  })
}

/**
 * Snap value to grid
 */
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

/**
 * Find and apply smart alignments
 * - Group nodes that are close horizontally (similar Y) and align their Y
 * - Group nodes that are close vertically (similar X) and align their X
 */
function applySmartAlignments(nodes: GraphNode[]): GraphNode[] {
  if (nodes.length <= 1) return nodes

  const ALIGNMENT_THRESHOLD = GRID_SIZE * 3 // 60px threshold for alignment
  const result = nodes.map(n => ({ ...n }))

  // Find horizontal alignment groups (nodes with similar Y)
  const horizontalGroups: number[][] = []
  const usedInHGroup = new Set<number>()

  for (let i = 0; i < result.length; i++) {
    if (usedInHGroup.has(i)) continue

    const group = [i]
    const { height: h1 } = getNodeSize(result[i].type, result[i].label, result[i].customWidth, result[i].customHeight)
    const centerY1 = result[i].y + h1 / 2

    for (let j = i + 1; j < result.length; j++) {
      if (usedInHGroup.has(j)) continue

      const { height: h2 } = getNodeSize(result[j].type, result[j].label, result[j].customWidth, result[j].customHeight)
      const centerY2 = result[j].y + h2 / 2

      if (Math.abs(centerY1 - centerY2) < ALIGNMENT_THRESHOLD) {
        group.push(j)
        usedInHGroup.add(j)
      }
    }

    if (group.length > 1) {
      horizontalGroups.push(group)
      group.forEach(idx => usedInHGroup.add(idx))
    }
  }

  // Align Y for horizontal groups
  horizontalGroups.forEach(group => {
    // Calculate average center Y
    let sumCenterY = 0
    group.forEach(idx => {
      const { height } = getNodeSize(result[idx].type, result[idx].label, result[idx].customWidth, result[idx].customHeight)
      sumCenterY += result[idx].y + height / 2
    })
    const avgCenterY = sumCenterY / group.length
    const alignedY = snapToGrid(avgCenterY)

    // Apply aligned Y
    group.forEach(idx => {
      const { height } = getNodeSize(result[idx].type, result[idx].label, result[idx].customWidth, result[idx].customHeight)
      result[idx].y = alignedY - height / 2
    })
  })

  // Find vertical alignment groups (nodes with similar X)
  const verticalGroups: number[][] = []
  const usedInVGroup = new Set<number>()

  for (let i = 0; i < result.length; i++) {
    if (usedInVGroup.has(i)) continue

    const group = [i]
    const { width: w1 } = getNodeSize(result[i].type, result[i].label, result[i].customWidth, result[i].customHeight)
    const centerX1 = result[i].x + w1 / 2

    for (let j = i + 1; j < result.length; j++) {
      if (usedInVGroup.has(j)) continue

      const { width: w2 } = getNodeSize(result[j].type, result[j].label, result[j].customWidth, result[j].customHeight)
      const centerX2 = result[j].x + w2 / 2

      if (Math.abs(centerX1 - centerX2) < ALIGNMENT_THRESHOLD) {
        group.push(j)
        usedInVGroup.add(j)
      }
    }

    if (group.length > 1) {
      verticalGroups.push(group)
      group.forEach(idx => usedInVGroup.add(idx))
    }
  }

  // Align X for vertical groups
  verticalGroups.forEach(group => {
    // Calculate average center X
    let sumCenterX = 0
    group.forEach(idx => {
      const { width } = getNodeSize(result[idx].type, result[idx].label, result[idx].customWidth, result[idx].customHeight)
      sumCenterX += result[idx].x + width / 2
    })
    const avgCenterX = sumCenterX / group.length
    const alignedX = snapToGrid(avgCenterX)

    // Apply aligned X
    group.forEach(idx => {
      const { width } = getNodeSize(result[idx].type, result[idx].label, result[idx].customWidth, result[idx].customHeight)
      result[idx].x = alignedX - width / 2
    })
  })

  return result
}

/**
 * Resolve overlaps between nodes while maintaining alignments
 */
function resolveOverlaps(nodes: GraphNode[]): GraphNode[] {
  if (nodes.length <= 1) return nodes

  const result = nodes.map(n => ({ ...n }))
  const MAX_ITERATIONS = 50
  let iteration = 0

  while (iteration < MAX_ITERATIONS) {
    let hasOverlap = false

    for (let i = 0; i < result.length; i++) {
      const { width: w1, height: h1 } = getNodeSize(result[i].type, result[i].label, result[i].customWidth, result[i].customHeight)

      for (let j = i + 1; j < result.length; j++) {
        const { width: w2, height: h2 } = getNodeSize(result[j].type, result[j].label, result[j].customWidth, result[j].customHeight)

        // Check for overlap with minimum spacing
        const overlapX = (result[i].x + w1 + MIN_SPACING) - result[j].x
        const overlapY = (result[i].y + h1 + MIN_SPACING) - result[j].y
        const overlapXRev = (result[j].x + w2 + MIN_SPACING) - result[i].x
        const overlapYRev = (result[j].y + h2 + MIN_SPACING) - result[i].y

        // Check if boxes actually overlap
        const xOverlap = result[i].x < result[j].x + w2 + MIN_SPACING && result[j].x < result[i].x + w1 + MIN_SPACING
        const yOverlap = result[i].y < result[j].y + h2 + MIN_SPACING && result[j].y < result[i].y + h1 + MIN_SPACING

        if (xOverlap && yOverlap) {
          hasOverlap = true

          // Determine which direction to push (minimum displacement)
          const pushRight = overlapX
          const pushDown = overlapY
          const pushLeft = overlapXRev
          const pushUp = overlapYRev

          const minPush = Math.min(pushRight, pushDown, pushLeft, pushUp)

          if (minPush === pushRight && result[i].x <= result[j].x) {
            result[j].x = snapToGrid(result[i].x + w1 + MIN_SPACING)
          } else if (minPush === pushLeft && result[j].x <= result[i].x) {
            result[i].x = snapToGrid(result[j].x + w2 + MIN_SPACING)
          } else if (minPush === pushDown && result[i].y <= result[j].y) {
            result[j].y = snapToGrid(result[i].y + h1 + MIN_SPACING)
          } else if (minPush === pushUp && result[j].y <= result[i].y) {
            result[i].y = snapToGrid(result[j].y + h2 + MIN_SPACING)
          } else {
            // Default: push the second node right
            result[j].x = snapToGrid(result[i].x + w1 + MIN_SPACING)
          }
        }
      }
    }

    if (!hasOverlap) break
    iteration++
  }

  return result
}
