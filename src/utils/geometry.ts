import type { GraphNode, Point } from '@/types'
import { getNodeSize } from './nodeSize'

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
