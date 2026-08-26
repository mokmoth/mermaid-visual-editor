import dagre from 'dagre'
import type { StateNode, StateTransition } from './types'
import type { DiagramDirection } from '@/core/types'

/**
 * Apply auto layout to state diagram nodes using dagre
 */
export function applyStateAutoLayout(
  states: StateNode[],
  transitions: StateTransition[],
  direction: DiagramDirection = 'TD'
): StateNode[] {
  if (states.length === 0) return states

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction === 'LR' || direction === 'RL' ? 'LR' : 'TB',
    nodesep: 60,
    ranksep: 80,
    marginx: 20,
    marginy: 20
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes
  states.forEach(state => {
    const size = getStateSize(state)
    g.setNode(state.id, { width: size.width, height: size.height })
  })

  // Add edges
  transitions.forEach(t => {
    if (g.hasNode(t.from) && g.hasNode(t.to)) {
      g.setEdge(t.from, t.to)
    }
  })

  // Run layout
  dagre.layout(g)

  // Apply new positions
  return states.map(state => {
    const nodeWithPos = g.node(state.id)
    if (nodeWithPos) {
      const size = getStateSize(state)
      return {
        ...state,
        x: nodeWithPos.x - size.width / 2,
        y: nodeWithPos.y - size.height / 2
      }
    }
    return state
  })
}

function getStateSize(state: StateNode): { width: number; height: number } {
  switch (state.type) {
    case 'start':
    case 'end':
      return { width: 30, height: 30 }
    case 'choice':
      return { width: 40, height: 40 }
    case 'fork':
    case 'join':
      return { width: 80, height: 10 }
    default:
      return {
        width: state.customWidth || Math.max(100, state.name.length * 10 + 40),
        height: state.customHeight || 50
      }
  }
}
