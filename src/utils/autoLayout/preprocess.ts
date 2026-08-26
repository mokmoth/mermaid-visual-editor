/**
 * Stage 1: Preprocessing
 * Convert canvas data to normalized graph structure
 */

import type { GraphNode, GraphLink, Swimlane } from '@/types'
import type { NormalizedGraph, NormalizedNode, NormalizedEdge, ContainerInfo } from './types'
import { getNodeSize } from '../nodeSize'

// Node types that represent start/end
const START_TYPES = ['start', 'circle']
const END_TYPES = ['end']

// Labels that indicate start/end nodes
const START_LABELS = ['开始', 'start', 'begin', '起点']
const END_LABELS = ['结束', 'end', 'finish', '终点']

export function preprocess(
  nodes: GraphNode[],
  links: GraphLink[],
  swimlanes: Swimlane[]
): NormalizedGraph {
  // 1.1 Normalize nodes
  const normalizedNodes: NormalizedNode[] = nodes.map(node => {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    const labelLower = (node.label || '').toLowerCase()

    const isStart = START_TYPES.includes(node.type) ||
                    START_LABELS.some(l => labelLower.includes(l.toLowerCase()))
    const isEnd = END_TYPES.includes(node.type) ||
                  END_LABELS.some(l => labelLower.includes(l.toLowerCase()))

    return {
      id: node.id,
      type: node.type,
      width,
      height,
      originalX: node.x,
      originalY: node.y,
      isStart,
      isEnd,
      swimlaneId: node.swimlaneId,
      laneId: node.laneId
    }
  })

  // 1.2 Normalize edges
  const nodeIds = new Set(nodes.map(n => n.id))
  const normalizedEdges: NormalizedEdge[] = links
    .filter(link => nodeIds.has(link.source) && nodeIds.has(link.target))
    .map(link => ({
      id: link.id,
      source: link.source,
      target: link.target,
      label: link.label,
      type: link.type || 'solid',
      isSelfLoop: link.source === link.target,
      isBackEdge: false  // Will be determined in Stage 2
    }))

  // 1.3 Process swimlanes/containers
  const containers: ContainerInfo[] = swimlanes.map(swimlane => {
    const childNodeIds = normalizedNodes
      .filter(n => n.swimlaneId === swimlane.id)
      .map(n => n.id)

    return {
      id: swimlane.id,
      name: swimlane.name,
      x: swimlane.x,
      y: swimlane.y,
      width: swimlane.width,
      height: swimlane.height,
      orientation: swimlane.orientation,
      lanes: swimlane.lanes || [],
      childNodeIds
    }
  })

  // 1.4 Identify special nodes
  const startNodes = normalizedNodes.filter(n => n.isStart).map(n => n.id)
  const endNodes = normalizedNodes.filter(n => n.isEnd).map(n => n.id)

  // Find isolated nodes (no incoming or outgoing edges)
  const connectedNodes = new Set<string>()
  normalizedEdges.forEach(e => {
    if (!e.isSelfLoop) {
      connectedNodes.add(e.source)
      connectedNodes.add(e.target)
    }
  })
  const isolatedNodes = normalizedNodes
    .filter(n => !connectedNodes.has(n.id))
    .map(n => n.id)

  return {
    nodes: normalizedNodes,
    edges: normalizedEdges,
    containers,
    startNodes,
    endNodes,
    isolatedNodes
  }
}
