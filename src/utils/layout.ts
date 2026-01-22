import dagre from 'dagre'
import type { GraphNode, GraphLink, FlowDirection } from '@/types'
import { getNodeSize } from './nodeSize'

/**
 * Apply automatic layout using dagre algorithm
 */
export function applyAutoLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  direction: FlowDirection
): GraphNode[] {
  if (nodes.length === 0) return nodes

  const g = new dagre.graphlib.Graph()
  g.setGraph({ 
    rankdir: direction, 
    marginx: 50, 
    marginy: 50,
    nodesep: 60,
    ranksep: 80
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes
  nodes.forEach(node => {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    g.setNode(node.id, { width, height })
  })

  // Add edges
  links.forEach(link => {
    if (g.hasNode(link.source) && g.hasNode(link.target)) {
      g.setEdge(link.source, link.target)
    }
  })

  // Run layout
  dagre.layout(g)

  // Extract positions
  return nodes.map(node => {
    const pos = g.node(node.id)
    if (!pos) return node
    
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    return { 
      ...node, 
      x: pos.x - width / 2, 
      y: pos.y - height / 2 
    }
  })
}
