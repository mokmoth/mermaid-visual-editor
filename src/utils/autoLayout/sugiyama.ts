/**
 * Stages 3-5: Sugiyama Layout Algorithm
 * - Stage 3: Layer Assignment
 * - Stage 4: Crossing Reduction (Layer Ordering)
 * - Stage 5: Coordinate Assignment
 */

import type {
  NormalizedGraph,
  NormalizedNode,
  GraphAnalysis,
  LayoutOptions,
  NodeLayout
} from './types'

/**
 * Run Sugiyama-style layout using Dagre
 * Returns node positions
 */
export function runSugiyamaLayout(
  graph: NormalizedGraph,
  analysis: GraphAnalysis,
  options: LayoutOptions
): Map<string, NodeLayout> {
  const { nodes, edges, containers } = graph

  // Handle empty graph
  if (nodes.length === 0) {
    return new Map()
  }

  // Validate node dimensions to prevent layout failures
  const validatedNodes = nodes.map(node => ({
    ...node,
    width: isFinite(node.width) && node.width > 0 ? node.width : 100,
    height: isFinite(node.height) && node.height > 0 ? node.height : 40
  }))

  // Group nodes by container (swimlane/lane)
  const nodesByContainer = groupNodesByContainer(validatedNodes, containers)

  const result = new Map<string, NodeLayout>()

  // Layout nodes inside each container
  for (const container of containers) {
    // Get all nodes for this container (including those in lanes)
    let containerNodes = [...(nodesByContainer.get(container.id) || [])]
    container.lanes?.forEach(lane => {
      const laneKey = `${container.id}:${lane.id}`
      const laneNodes = nodesByContainer.get(laneKey) || []
      containerNodes.push(...laneNodes)
    })

    if (containerNodes.length === 0) continue

    // Layout within container bounds
    const layouted = layoutNodesInContainer(
      containerNodes,
      edges,
      container,
      analysis,
      options
    )

    layouted.forEach((layout, id) => result.set(id, layout))
  }

  // Layout nodes outside containers
  const outsideNodes = nodesByContainer.get('__outside__') || []
  if (outsideNodes.length > 0) {
    // Calculate the bounding box of outside nodes based on their current positions
    let minX = Infinity, minY = Infinity
    outsideNodes.forEach(node => {
      minX = Math.min(minX, node.originalX)
      minY = Math.min(minY, node.originalY)
    })

    // Use the top-left of the bounding box as the starting position
    let outsideX = isFinite(minX) ? Math.max(50, minX) : 50
    let outsideY = isFinite(minY) ? Math.max(50, minY) : 50

    // Run layout at the calculated position
    let layouted = layoutNodesGlobal(
      outsideNodes,
      edges,
      analysis,
      options,
      outsideX,
      outsideY
    )

    // Check if layout result overlaps with any container and shift if needed
    if (containers.length > 0) {
      // Calculate bounding box of layout result
      let resultMinX = Infinity, resultMinY = Infinity
      let resultMaxX = -Infinity, resultMaxY = -Infinity
      layouted.forEach(layout => {
        resultMinX = Math.min(resultMinX, layout.x)
        resultMinY = Math.min(resultMinY, layout.y)
        resultMaxX = Math.max(resultMaxX, layout.x + layout.width)
        resultMaxY = Math.max(resultMaxY, layout.y + layout.height)
      })

      // Check for overlap with any container
      let overlapShiftX = 0
      for (const container of containers) {
        // Check if result bounding box overlaps with container
        const overlapsX = resultMaxX > container.x && resultMinX < container.x + container.width
        const overlapsY = resultMaxY > container.y && resultMinY < container.y + container.height

        if (overlapsX && overlapsY) {
          // Calculate how much to shift to avoid overlap
          const shiftRight = container.x + container.width - resultMinX + options.spacing.node
          overlapShiftX = Math.max(overlapShiftX, shiftRight)
        }
      }

      // Apply shift if needed
      if (overlapShiftX > 0) {
        layouted.forEach(layout => {
          layout.x += overlapShiftX
        })
      }
    }

    layouted.forEach((layout, id) => result.set(id, layout))
  }

  // Handle isolated nodes
  layoutIsolatedNodes(graph.isolatedNodes, validatedNodes, result, options)

  return result
}

/**
 * Group nodes by their container (swimlane + lane)
 */
function groupNodesByContainer(
  nodes: NormalizedNode[],
  containers: { id: string; lanes: { id: string }[] }[]
): Map<string, NormalizedNode[]> {
  const groups = new Map<string, NormalizedNode[]>()
  groups.set('__outside__', [])

  // Initialize groups for each container and lane
  containers.forEach(c => {
    groups.set(c.id, [])
    c.lanes?.forEach(lane => {
      groups.set(`${c.id}:${lane.id}`, [])
    })
  })

  // Assign nodes to groups
  nodes.forEach(node => {
    if (node.swimlaneId && containers.some(c => c.id === node.swimlaneId)) {
      if (node.laneId) {
        const key = `${node.swimlaneId}:${node.laneId}`
        if (groups.has(key)) {
          groups.get(key)!.push(node)
        } else {
          groups.get(node.swimlaneId)!.push(node)
        }
      } else {
        groups.get(node.swimlaneId)!.push(node)
      }
    } else {
      groups.get('__outside__')!.push(node)
    }
  })

  return groups
}

/**
 * Layout nodes within a container (swimlane)
 *
 * PHILOSOPHY: Preserve relative positions, only beautify
 * 1. Keep nodes in their current lanes (based on visual position)
 * 2. Preserve relative order between nodes (if A was above B, keep it that way)
 * 3. Only optimize alignment and spacing
 */
function layoutNodesInContainer(
  nodes: NormalizedNode[],
  _edges: { source: string; target: string; isSelfLoop: boolean; id: string }[],
  container: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    orientation: 'horizontal' | 'vertical';
    lanes: { id: string }[]
  },
  _analysis: GraphAnalysis,
  options: LayoutOptions
): Map<string, NodeLayout> {

  const result = new Map<string, NodeLayout>()
  const headerHeight = 36
  const padding = options.spacing.containerPadding
  const isHorizontal = container.orientation === 'horizontal'
  const lanes = container.lanes || []
  const laneCount = Math.max(1, lanes.length)

  if (nodes.length === 0) return result

  // Calculate lane boundaries
  const contentWidth = container.width
  const contentHeight = container.height - headerHeight
  const laneHeaderHeight = 20

  // Build lane info map
  // Per type definition: horizontal = lanes are rows (stacked), vertical = lanes are columns (side by side)
  const laneInfoMap = new Map<string, { x: number; y: number; width: number; height: number; index: number }>()
  lanes.forEach((lane, index) => {
    let laneX = container.x
    let laneY = container.y + headerHeight
    let laneWidth = contentWidth
    let laneHeight = contentHeight

    if (isHorizontal) {
      // Horizontal swimlane: lanes are ROWS (stacked vertically)
      laneHeight = contentHeight / laneCount
      laneY = container.y + headerHeight + index * laneHeight
    } else {
      // Vertical swimlane: lanes are COLUMNS (side by side)
      laneWidth = contentWidth / laneCount
      laneX = container.x + index * laneWidth
    }

    laneInfoMap.set(lane.id, {
      x: laneX + padding,
      y: laneY + padding + laneHeaderHeight,
      width: laneWidth - padding * 2,
      height: laneHeight - padding * 2 - laneHeaderHeight,
      index
    })
  })

  // Group nodes by lane (based on their current laneId which was set from visual position)
  const nodesByLane = new Map<string, NormalizedNode[]>()
  lanes.forEach(lane => nodesByLane.set(lane.id, []))
  nodesByLane.set('__no_lane__', [])

  nodes.forEach(node => {
    const laneId = node.laneId && laneInfoMap.has(node.laneId) ? node.laneId : '__no_lane__'
    nodesByLane.get(laneId)!.push(node)
  })

  // STEP 1: For vertical swimlanes, identify rows across all lanes for alignment
  // For horizontal swimlanes, identify columns across all lanes for alignment
  // Use a more generous threshold for alignment (based on typical node height)
  const avgNodeHeight = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + n.height, 0) / nodes.length
    : 40
  const avgNodeWidth = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + n.width, 0) / nodes.length
    : 100
  const alignmentThreshold = Math.max(avgNodeHeight * 1.5, options.gridSize * 4)

  if (!isHorizontal) {
    // Vertical swimlane: lanes are columns, need to align Y positions across lanes
    // Identify rows based on Y position across ALL nodes
    const allLaneNodes = lanes.flatMap(lane => nodesByLane.get(lane.id) || [])
    const sortedByY = [...allLaneNodes].sort((a, b) => a.originalY - b.originalY)

    const rows: NormalizedNode[][] = []
    let currentRow: NormalizedNode[] = []
    let rowCenterY = -Infinity

    sortedByY.forEach(node => {
      const nodeCenterY = node.originalY + node.height / 2
      if (currentRow.length === 0 || Math.abs(nodeCenterY - rowCenterY) <= alignmentThreshold) {
        currentRow.push(node)
        rowCenterY = currentRow.reduce((sum, n) => sum + n.originalY + n.height / 2, 0) / currentRow.length
      } else {
        rows.push(currentRow)
        currentRow = [node]
        rowCenterY = nodeCenterY
      }
    })
    if (currentRow.length > 0) rows.push(currentRow)

    // Calculate Y position for each row
    const contentStartY = container.y + headerHeight + padding + laneHeaderHeight
    const rowYPositions: number[] = []
    let currentY = contentStartY

    rows.forEach((row, rowIndex) => {
      const maxHeight = Math.max(...row.map(n => n.height))
      rowYPositions[rowIndex] = currentY + maxHeight / 2
      currentY += maxHeight + options.spacing.node
    })

    // Map nodes to their row index
    const nodeRowIndex = new Map<string, number>()
    rows.forEach((row, rowIndex) => {
      row.forEach(node => nodeRowIndex.set(node.id, rowIndex))
    })

    // Calculate the center X for each lane (for vertical alignment within lane)
    const laneCenterX = new Map<string, number>()
    lanes.forEach(lane => {
      const laneInfo = laneInfoMap.get(lane.id)!
      laneCenterX.set(lane.id, laneInfo.x + laneInfo.width / 2)
    })

    // Layout each lane using the global row positions
    // All nodes in a lane share the same X center (perfect vertical alignment)
    lanes.forEach(lane => {
      const laneNodes = nodesByLane.get(lane.id) || []
      if (laneNodes.length === 0) return

      const laneInfo = laneInfoMap.get(lane.id)!
      const centerX = laneCenterX.get(lane.id)!

      laneNodes.forEach(node => {
        const rowIndex = nodeRowIndex.get(node.id) ?? 0
        const rowCenterY = rowYPositions[rowIndex] ?? laneInfo.y

        // Use exact center X for the lane (no grid snapping for X to ensure alignment)
        const x = centerX - node.width / 2
        const y = rowCenterY - node.height / 2

        // Snap Y to grid, but keep X precisely aligned
        result.set(node.id, {
          id: node.id,
          x: Math.max(laneInfo.x, Math.min(laneInfo.x + laneInfo.width - node.width, x)),
          y: snapToGrid(Math.max(laneInfo.y, Math.min(laneInfo.y + laneInfo.height - node.height, y)), options.gridSize),
          width: node.width,
          height: node.height
        })
      })
    })

    // Post-process: ensure nodes in the same row have exactly the same Y
    rows.forEach(row => {
      if (row.length <= 1) return
      // Find the Y position that was actually assigned (after grid snapping)
      const yValues = row.map(node => {
        const layout = result.get(node.id)
        return layout ? layout.y + layout.height / 2 : 0
      })
      // Use the most common Y value (mode) or the first one
      const targetY = yValues[0]
      row.forEach(node => {
        const layout = result.get(node.id)
        if (layout) {
          layout.y = targetY - layout.height / 2
        }
      })
    })
  } else {
    // Horizontal swimlane: lanes are rows, need to align X positions across lanes
    // Identify columns based on X position across ALL nodes
    const allLaneNodes = lanes.flatMap(lane => nodesByLane.get(lane.id) || [])
    const sortedByX = [...allLaneNodes].sort((a, b) => a.originalX - b.originalX)

    const colAlignThreshold = Math.max(avgNodeWidth * 1.5, options.gridSize * 4)
    const cols: NormalizedNode[][] = []
    let currentCol: NormalizedNode[] = []
    let colCenterX = -Infinity

    sortedByX.forEach(node => {
      const nodeCenterX = node.originalX + node.width / 2
      if (currentCol.length === 0 || Math.abs(nodeCenterX - colCenterX) <= colAlignThreshold) {
        currentCol.push(node)
        colCenterX = currentCol.reduce((sum, n) => sum + n.originalX + n.width / 2, 0) / currentCol.length
      } else {
        cols.push(currentCol)
        currentCol = [node]
        colCenterX = nodeCenterX
      }
    })
    if (currentCol.length > 0) cols.push(currentCol)

    // Calculate X position for each column
    const contentStartX = container.x + padding
    const colXPositions: number[] = []
    let currentX = contentStartX

    cols.forEach((col, colIndex) => {
      const maxWidth = Math.max(...col.map(n => n.width))
      colXPositions[colIndex] = currentX + maxWidth / 2
      currentX += maxWidth + options.spacing.node
    })

    // Map nodes to their column index
    const nodeColIndex = new Map<string, number>()
    cols.forEach((col, colIndex) => {
      col.forEach(node => nodeColIndex.set(node.id, colIndex))
    })

    // Calculate the center Y for each lane
    const laneCenterY = new Map<string, number>()
    lanes.forEach(lane => {
      const laneInfo = laneInfoMap.get(lane.id)!
      laneCenterY.set(lane.id, laneInfo.y + laneInfo.height / 2)
    })

    // Layout each lane using the global column positions
    lanes.forEach(lane => {
      const laneNodes = nodesByLane.get(lane.id) || []
      if (laneNodes.length === 0) return

      const laneInfo = laneInfoMap.get(lane.id)!
      const centerY = laneCenterY.get(lane.id)!

      laneNodes.forEach(node => {
        const colIndex = nodeColIndex.get(node.id) ?? 0
        const colCenterX = colXPositions[colIndex] ?? laneInfo.x

        const x = colCenterX - node.width / 2
        const y = centerY - node.height / 2

        // Snap X to grid, but keep Y precisely aligned
        result.set(node.id, {
          id: node.id,
          x: snapToGrid(Math.max(laneInfo.x, Math.min(laneInfo.x + laneInfo.width - node.width, x)), options.gridSize),
          y: Math.max(laneInfo.y, Math.min(laneInfo.y + laneInfo.height - node.height, y)),
          width: node.width,
          height: node.height
        })
      })
    })

    // Post-process: ensure nodes in the same column have exactly the same X
    cols.forEach(col => {
      if (col.length <= 1) return
      const xValues = col.map(node => {
        const layout = result.get(node.id)
        return layout ? layout.x + layout.width / 2 : 0
      })
      const targetX = xValues[0]
      col.forEach(node => {
        const layout = result.get(node.id)
        if (layout) {
          layout.x = targetX - layout.width / 2
        }
      })
    })
  }

  // Handle nodes without a lane assignment (should stay outside)
  const noLaneNodes = nodesByLane.get('__no_lane__') || []
  if (noLaneNodes.length > 0) {
    // Keep these nodes in their original positions (just snap to grid)
    // They are in the container's swimlaneId but not in any specific lane
    noLaneNodes.forEach(node => {
      result.set(node.id, {
        id: node.id,
        x: snapToGrid(node.originalX, options.gridSize),
        y: snapToGrid(node.originalY, options.gridSize),
        width: node.width,
        height: node.height
      })
    })
  }

  return result
}


/**
 * Layout nodes globally (outside containers)
 *
 * PHILOSOPHY: Preserve relative positions + optimize alignment
 * - If B was below A, B remains below A
 * - If B was right of A, B remains right of A
 * - Nodes at similar Y positions are aligned horizontally
 * - Nodes at similar X positions are aligned vertically
 */
function layoutNodesGlobal(
  nodes: NormalizedNode[],
  _edges: { source: string; target: string; isSelfLoop: boolean; id: string }[],
  _analysis: GraphAnalysis,
  options: LayoutOptions,
  offsetX: number,
  offsetY: number
): Map<string, NodeLayout> {
  if (nodes.length === 0) return new Map()

  const result = new Map<string, NodeLayout>()

  // STEP 1: Identify rows (nodes with similar Y) and columns (nodes with similar X)
  const rowThreshold = options.gridSize * 3  // Threshold for considering nodes in same row
  const colThreshold = options.gridSize * 3  // Threshold for considering nodes in same column

  // Group into rows based on Y
  const sortedByY = [...nodes].sort((a, b) => a.originalY - b.originalY)
  const rows: NormalizedNode[][] = []
  let currentRow: NormalizedNode[] = []
  let rowCenterY = -Infinity

  sortedByY.forEach(node => {
    const nodeCenterY = node.originalY + node.height / 2
    if (currentRow.length === 0 || Math.abs(nodeCenterY - rowCenterY) <= rowThreshold) {
      currentRow.push(node)
      // Update row center as average
      rowCenterY = currentRow.reduce((sum, n) => sum + n.originalY + n.height / 2, 0) / currentRow.length
    } else {
      rows.push(currentRow)
      currentRow = [node]
      rowCenterY = nodeCenterY
    }
  })
  if (currentRow.length > 0) rows.push(currentRow)

  // Sort nodes within each row by X
  rows.forEach(row => row.sort((a, b) => a.originalX - b.originalX))

  // STEP 2: Identify columns across all rows
  // Collect all nodes with their X center positions
  const allNodesWithX = nodes.map(node => ({
    node,
    centerX: node.originalX + node.width / 2
  }))
  allNodesWithX.sort((a, b) => a.centerX - b.centerX)

  // Group into columns
  const columns: NormalizedNode[][] = []
  let currentCol: typeof allNodesWithX = []
  let colCenterX = -Infinity

  allNodesWithX.forEach(item => {
    if (currentCol.length === 0 || Math.abs(item.centerX - colCenterX) <= colThreshold) {
      currentCol.push(item)
      colCenterX = currentCol.reduce((sum, i) => sum + i.centerX, 0) / currentCol.length
    } else {
      columns.push(currentCol.map(i => i.node))
      currentCol = [item]
      colCenterX = item.centerX
    }
  })
  if (currentCol.length > 0) columns.push(currentCol.map(i => i.node))

  // Create column index map for each node
  const nodeColumnIndex = new Map<string, number>()
  columns.forEach((col, colIndex) => {
    col.forEach(node => nodeColumnIndex.set(node.id, colIndex))
  })

  // STEP 3: Calculate column X positions with consistent spacing
  const columnXPositions: number[] = []
  let currentX = offsetX
  columns.forEach((col, colIndex) => {
    const maxWidth = Math.max(...col.map(n => n.width))
    columnXPositions[colIndex] = currentX + maxWidth / 2  // Center position
    currentX += maxWidth + options.spacing.node
  })

  // STEP 4: Layout rows with alignment
  let currentY = offsetY
  rows.forEach(row => {
    const maxHeight = Math.max(...row.map(n => n.height))
    const rowCenterY = currentY + maxHeight / 2

    row.forEach(node => {
      const colIndex = nodeColumnIndex.get(node.id) ?? 0
      const colCenterX = columnXPositions[colIndex] ?? offsetX

      result.set(node.id, {
        id: node.id,
        x: snapToGrid(colCenterX - node.width / 2, options.gridSize),
        y: snapToGrid(rowCenterY - node.height / 2, options.gridSize),
        width: node.width,
        height: node.height
      })
    })

    currentY += maxHeight + options.spacing.layer
  })

  // POST-PROCESSING: Ensure perfect alignment
  // Step 1: Force all nodes in the same row to have exactly the same Y center
  rows.forEach(row => {
    if (row.length <= 1) return
    // Get the Y center of the first node (reference)
    const firstNode = row[0]
    const firstLayout = result.get(firstNode.id)
    if (!firstLayout) return
    const targetCenterY = firstLayout.y + firstLayout.height / 2

    // Align all other nodes to this Y center
    row.forEach(node => {
      const layout = result.get(node.id)
      if (layout) {
        layout.y = targetCenterY - layout.height / 2
      }
    })
  })

  // Step 2: Force all nodes in the same column to have exactly the same X center
  columns.forEach(col => {
    if (col.length <= 1) return
    // Get the X center of the first node (reference)
    const firstNode = col[0]
    const firstLayout = result.get(firstNode.id)
    if (!firstLayout) return
    const targetCenterX = firstLayout.x + firstLayout.width / 2

    // Align all other nodes to this X center
    col.forEach(node => {
      const layout = result.get(node.id)
      if (layout) {
        layout.x = targetCenterX - layout.width / 2
      }
    })
  })

  return result
}

/**
 * Layout isolated nodes (no connections)
 */
function layoutIsolatedNodes(
  isolatedIds: string[],
  allNodes: { id: string; width: number; height: number }[],
  result: Map<string, NodeLayout>,
  options: LayoutOptions
): void {
  if (isolatedIds.length === 0) return

  // Find the bounds of already placed nodes
  let maxX = 0
  result.forEach(layout => {
    maxX = Math.max(maxX, layout.x + layout.width)
  })

  // Place isolated nodes in a row at the bottom
  let currentX = maxX + options.spacing.node * 2
  let currentY = 50

  isolatedIds.forEach(id => {
    const node = allNodes.find(n => n.id === id)
    if (node && !result.has(id)) {
      result.set(id, {
        id: node.id,
        x: snapToGrid(currentX, options.gridSize),
        y: snapToGrid(currentY, options.gridSize),
        width: node.width,
        height: node.height
      })
      currentX += node.width + options.spacing.node
    }
  })
}

/**
 * Snap value to grid
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}
