// State Diagram Types

export type StateNodeType = 'state' | 'start' | 'end' | 'choice' | 'fork' | 'join'

export interface StateNode {
  id: string
  name: string
  type: StateNodeType
  x: number
  y: number
  description?: string
  customWidth?: number
  customHeight?: number
  // Composite state support (future)
  isComposite?: boolean
  substates?: StateNode[]
}

export interface StateTransition {
  id: string
  from: string
  to: string
  label?: string      // Trigger event
  guard?: string      // [condition]
  action?: string     // / action
}

export interface StateDiagramState {
  states: StateNode[]
  transitions: StateTransition[]
}

// Initial state factory - minimal example
export function createInitialStateDiagramState(): StateDiagramState {
  return {
    states: [
      { id: 'start', name: '', type: 'start', x: 200, y: 100 },
      { id: 'State1', name: '状态', type: 'state', x: 150, y: 200 },
      { id: 'end', name: '', type: 'end', x: 200, y: 320 },
    ],
    transitions: [
      { id: 't1', from: 'start', to: 'State1', label: '' },
      { id: 't2', from: 'State1', to: 'end', label: '' },
    ]
  }
}

// State node type definitions
export const STATE_NODE_TYPES: Array<{ type: StateNodeType; labelKey: string; iconKey: string }> = [
  { type: 'state', labelKey: 'stateDiagram.nodes.state', iconKey: 'State' },
  { type: 'start', labelKey: 'stateDiagram.nodes.start', iconKey: 'StartState' },
  { type: 'end', labelKey: 'stateDiagram.nodes.end', iconKey: 'EndState' },
  { type: 'choice', labelKey: 'stateDiagram.nodes.choice', iconKey: 'Choice' },
  { type: 'fork', labelKey: 'stateDiagram.nodes.fork', iconKey: 'Fork' },
  { type: 'join', labelKey: 'stateDiagram.nodes.join', iconKey: 'Join' },
]
