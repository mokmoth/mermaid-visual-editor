import type { GraphLink, GraphNode } from '@/types'
import { getBorderPoint, getNodeCenter } from '@/utils/geometry'

/** Distance between adjacent parallel lanes, in canvas px. */
export const PARALLEL_SPREAD = 52

export function undirectedPairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`
}

export function parallelOffsetByLinkId(links: GraphLink[]): Map<string, number> {
  const groups = new Map<string, string[]>()
  for (const link of links) {
    if (link.source === link.target) continue
    const key = undirectedPairKey(link.source, link.target)
    const ids = groups.get(key)
    if (ids) ids.push(link.id)
    else groups.set(key, [link.id])
  }

  const offsets = new Map<string, number>()
  for (const ids of groups.values()) {
    const count = ids.length
    ids.forEach((id, index) => {
      offsets.set(id, (index - (count - 1) / 2) * PARALLEL_SPREAD)
    })
  }
  return offsets
}

export function estimateLabelWidth(text: string): number {
  let width = 8
  for (const ch of text) {
    width += ch.charCodeAt(0) > 127 ? 12 : 7
  }
  return width
}

export function getLinkVisuals(
  link: GraphLink,
  nodeMap: Map<string, GraphNode>,
  spread = 0
): { path: string; midX: number; midY: number } {
  const s = nodeMap.get(link.source)
  const t = nodeMap.get(link.target)
  if (!s || !t) return { path: '', midX: 0, midY: 0 }

  const cS = getNodeCenter(s)
  const cT = getNodeCenter(t)

  if (link.source === link.target) {
    const gap = 30
    return {
      path: `M${cS.x + 10},${cS.y - 20} C${cS.x + gap},${cS.y - gap - 20} ${cS.x - gap},${cS.y - gap - 20} ${cS.x - 10},${cS.y - 20}`,
      midX: cS.x,
      midY: cS.y - gap - 20 + 10
    }
  }

  const dx = cT.x - cS.x
  const dy = cT.y - cS.y
  let dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) dist = 0.001

  // Same world-space perpendicular for both directions of a pair.
  const canonical = link.source < link.target
  const nx = canonical ? -dy / dist : dy / dist
  const ny = canonical ? dx / dist : -dx / dist

  const aim = spread * 2.4
  const startPoint = spread === 0
    ? getBorderPoint(s, cT)
    : getBorderPoint(s, { x: cT.x + nx * aim, y: cT.y + ny * aim })
  const endPoint = spread === 0
    ? getBorderPoint(t, cS)
    : getBorderPoint(t, { x: cS.x + nx * aim, y: cS.y + ny * aim })

  const vertical = Math.abs(endPoint.y - startPoint.y) >= Math.abs(endPoint.x - startPoint.x)
  let path: string
  let midX: number
  let midY: number
  if (vertical) {
    const mid = (startPoint.y + endPoint.y) / 2
    path = `M${startPoint.x},${startPoint.y} L${startPoint.x},${mid} L${endPoint.x},${mid} L${endPoint.x},${endPoint.y}`
    midX = (startPoint.x + endPoint.x) / 2
    midY = mid - 8
  } else {
    const mid = (startPoint.x + endPoint.x) / 2
    path = `M${startPoint.x},${startPoint.y} L${mid},${startPoint.y} L${mid},${endPoint.y} L${endPoint.x},${endPoint.y}`
    midX = mid
    midY = (startPoint.y + endPoint.y) / 2 - 8
  }

  if (spread !== 0) {
    const labelPush = Math.sign(spread) * 18
    midX += nx * labelPush
    midY += ny * labelPush
  }

  return { path, midX, midY }
}
