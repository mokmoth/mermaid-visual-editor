import type { GraphNode, Point, Swimlane } from '@/types'
import { getNodeSize } from './nodeSize'

/**
 * Generic interface for items with position and size
 */
export interface PositionedItem {
  x: number
  y: number
}

/**
 * Size getter function type
 */
export type SizeGetter<T> = (item: T) => { width: number; height: number }

/**
 * Get the center point of a node
 */
export function getNodeCenter(node: GraphNode): Point {
  const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
  return { 
    x: node.x + width / 2, 
    y: node.y + height / 2 
  }
}

/**
 * Find intersection point of a ray with a polygon
 * Ray starts at origin (0,0) with direction (dx, dy)
 */
function intersectPolygon(dx: number, dy: number, points: Point[]): number {
  let minT = Infinity
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    const det = dx * (p1.y - p2.y) - dy * (p1.x - p2.x)
    if (det === 0) continue

    const t = ((p1.x - p2.x) * p1.y - (p1.y - p2.y) * p1.x) / det
    const u = (dx * p1.y - dy * p1.x) / det

    // u in 0-1 means on segment, t > 0 means in ray direction
    if (t > 0 && u >= 0 && u <= 1) {
      if (t < minT) minT = t
    }
  }
  
  return minT === Infinity ? 1 : minT
}

/**
 * Calculate the border point on a node's shape where a line to another point intersects
 * This enables precise edge-to-edge connections for different shape types
 */
export function getBorderPoint(node: GraphNode, otherPoint: Point): Point {
  const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
  const cx = node.x + width / 2
  const cy = node.y + height / 2
  const dx = otherPoint.x - cx
  const dy = otherPoint.y - cy

  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  // Visual correction: SVG shapes have stroke-width=2 and usually 1px padding
  // So we shrink the shape slightly for intersection calculation
  const pad = 2
  const w = (width / 2) - pad
  const h = (height / 2) - pad

  let t = 1

  switch (node.type) {
    case 'rhombus':
      // Diamond: |x|/w + |y|/h = 1
      t = 1 / (Math.abs(dx) / w + Math.abs(dy) / h)
      break
      
    case 'circle':
      // Ellipse: x²/w² + y²/h² = 1
      t = 1 / Math.sqrt(Math.pow(dx / w, 2) + Math.pow(dy / h, 2))
      break
      
    case 'parallelogram':
      // Parallelogram vertices (top-left inset by 20)
      t = intersectPolygon(dx, dy, [
        { x: -w + 20, y: -h }, { x: w, y: -h },
        { x: w - 20, y: h }, { x: -w, y: h }
      ])
      break
      
    case 'hexagon':
      // Hexagon vertices
      t = intersectPolygon(dx, dy, [
        { x: -w + 15, y: -h }, { x: w - 15, y: -h }, { x: w, y: 0 },
        { x: w - 15, y: h }, { x: -w + 15, y: h }, { x: -w, y: 0 }
      ])
      break
      
    case 'stadium':
      // Stadium/capsule shape - use rectangle approximation for most angles
      if (Math.abs(dx * h) > Math.abs(dy * w)) {
        t = Math.abs(w / dx)
      } else {
        t = Math.abs(h / dy)
      }
      break

    case 'flag':
      // Asymmetric flag shape - polygon with notch on right
      t = intersectPolygon(dx, dy, [
        { x: -w, y: -h }, { x: w - 20, y: -h },
        { x: w, y: 0 }, { x: w - 20, y: h },
        { x: -w, y: h }
      ])
      break

    case 'trapezoid':
      // Trapezoid: narrower at top, wider at bottom
      t = intersectPolygon(dx, dy, [
        { x: -w + 20, y: -h }, { x: w - 20, y: -h },
        { x: w, y: h }, { x: -w, y: h }
      ])
      break

    case 'trapezoid_alt':
      // Inverted trapezoid: wider at top, narrower at bottom
      t = intersectPolygon(dx, dy, [
        { x: -w, y: -h }, { x: w, y: -h },
        { x: w - 20, y: h }, { x: -w + 20, y: h }
      ])
      break

    case 'double_circle':
      // Double circle uses outer ellipse for boundary
      t = 1 / Math.sqrt(Math.pow(dx / w, 2) + Math.pow(dy / h, 2))
      break

    case 'parallelogram_alt':
      // Reverse parallelogram (slanted the other way)
      t = intersectPolygon(dx, dy, [
        { x: -w, y: -h }, { x: w - 20, y: -h },
        { x: w, y: h }, { x: -w + 20, y: h }
      ])
      break

    default:
      // Rectangle (rect, subroutine, database, round)
      if (Math.abs(dx * h) > Math.abs(dy * w)) {
        t = Math.abs(w / dx)
      } else {
        t = Math.abs(h / dy)
      }
      break
  }

  return { x: cx + dx * t, y: cy + dy * t }
}

/**
 * Find which swimlane and lane a node belongs to based on its visual position
 * This is the source of truth for node-swimlane association
 */
export function findSwimlaneAndLaneForNode(
  node: GraphNode,
  swimlanes: Swimlane[]
): { swimlaneId?: string; laneId?: string } {
  const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
  const centerX = node.x + width / 2
  const centerY = node.y + height / 2

  for (const swimlane of swimlanes) {
    // Check if node is inside swimlane bounds
    if (
      centerX >= swimlane.x &&
      centerX <= swimlane.x + swimlane.width &&
      centerY >= swimlane.y &&
      centerY <= swimlane.y + swimlane.height
    ) {
      // Find which lane the node is in
      const headerHeight = 36
      const laneCount = swimlane.lanes?.length || 1
      const contentHeight = swimlane.height - headerHeight
      const contentWidth = swimlane.width

      // Calculate position relative to content area (excluding header)
      const relativeY = centerY - swimlane.y - headerHeight
      const relativeX = centerX - swimlane.x

      if (relativeY < 0) {
        // Node is in header area, assign to swimlane but no lane
        return { swimlaneId: swimlane.id, laneId: undefined }
      }

      let laneIndex = 0
      if (swimlane.orientation === 'horizontal') {
        // Horizontal = lanes are rows
        const laneHeight = contentHeight / laneCount
        laneIndex = Math.min(Math.floor(relativeY / laneHeight), laneCount - 1)
      } else {
        // Vertical = lanes are columns
        const laneWidth = contentWidth / laneCount
        laneIndex = Math.min(Math.floor(relativeX / laneWidth), laneCount - 1)
      }

      const laneId = swimlane.lanes?.[laneIndex]?.id
      return { swimlaneId: swimlane.id, laneId }
    }
  }
  return { swimlaneId: undefined, laneId: undefined }
}

/**
 * Update swimlane associations for all nodes based on their current positions
 */
export function updateNodeSwimlaneAssociations(
  nodes: GraphNode[],
  swimlanes: Swimlane[]
): GraphNode[] {
  return nodes.map(node => {
    const { swimlaneId, laneId } = findSwimlaneAndLaneForNode(node, swimlanes)
    return { ...node, swimlaneId, laneId }
  })
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Calculate view state to fit all content within the visible area
 * @param bounds - Bounding box of all content
 * @param containerWidth - Width of the container
 * @param containerHeight - Height of the container
 * @param padding - Padding around the content (default 40px)
 * @returns ViewState with x, y, scale to fit all content
 */
export function calculateFitToView(
  bounds: BoundingBox,
  containerWidth: number,
  containerHeight: number,
  padding = 40
): { x: number; y: number; scale: number } {
  // If no bounds or invalid bounds, return default view
  if (bounds.minX === Infinity || bounds.maxX === -Infinity ||
      containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, scale: 1 }
  }

  const contentWidth = bounds.maxX - bounds.minX
  const contentHeight = bounds.maxY - bounds.minY

  // If content has no size, center at origin
  if (contentWidth <= 0 || contentHeight <= 0) {
    return { x: containerWidth / 2, y: containerHeight / 2, scale: 1 }
  }

  // Calculate available space (subtract padding from both sides)
  const availableWidth = containerWidth - padding * 2
  const availableHeight = containerHeight - padding * 2

  // Calculate scale to fit content
  const scaleX = availableWidth / contentWidth
  const scaleY = availableHeight / contentHeight

  // Shrink to fit; never zoom in past 100% on auto-fit (user can still pinch-zoom)
  const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 1)

  // Calculate center of content
  const contentCenterX = bounds.minX + contentWidth / 2
  const contentCenterY = bounds.minY + contentHeight / 2

  // Calculate offset to center content in container
  const x = containerWidth / 2 - contentCenterX * scale
  const y = containerHeight / 2 - contentCenterY * scale

  return { x, y, scale }
}

/**
 * Calculate bounding box for flowchart nodes and swimlanes
 */
export function calculateFlowchartBounds(
  nodes: GraphNode[],
  swimlanes: Swimlane[]
): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  // Include nodes
  for (const node of nodes) {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + width)
    maxY = Math.max(maxY, node.y + height)
  }

  // Include swimlanes
  for (const swimlane of swimlanes) {
    minX = Math.min(minX, swimlane.x)
    minY = Math.min(minY, swimlane.y)
    maxX = Math.max(maxX, swimlane.x + swimlane.width)
    maxY = Math.max(maxY, swimlane.y + swimlane.height)
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Calculate bounding box for generic positioned items with a size getter
 */
export function calculateItemsBounds<T extends PositionedItem>(
  items: T[],
  getSizeFn: SizeGetter<T>
): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const item of items) {
    const { width, height } = getSizeFn(item)
    minX = Math.min(minX, item.x)
    minY = Math.min(minY, item.y)
    maxX = Math.max(maxX, item.x + width)
    maxY = Math.max(maxY, item.y + height)
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Zoom a view around a point in container coordinates (e.g. viewport center).
 */
export function zoomView(
  view: { x: number; y: number; scale: number },
  factor: number,
  centerX: number,
  centerY: number,
  minScale = 0.2,
  maxScale = 5
): { x: number; y: number; scale: number } {
  const newScale = Math.min(Math.max(view.scale * factor, minScale), maxScale)
  const worldX = (centerX - view.x) / view.scale
  const worldY = (centerY - view.y) / view.scale
  return {
    x: centerX - worldX * newScale,
    y: centerY - worldY * newScale,
    scale: newScale
  }
}
