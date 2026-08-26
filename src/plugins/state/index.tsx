import { Icon, Icons } from '@/components/Icons'
import type { DiagramPlugin } from '@/core/types'
import type { StateDiagramState } from './types'
import { createInitialStateDiagramState } from './types'
import { generateStateMermaidCode, parseStateMermaidCode } from './mermaid'
import { applyStateAutoLayout } from './layout'
import { StateToolbar } from './Toolbar'
import { StateCanvas } from './Canvas'
import { StateSidebar } from './Sidebar'

/**
 * State Diagram Plugin Definition
 */
export const stateDiagramPlugin: DiagramPlugin<StateDiagramState> = {
  id: 'state',
  name: 'diagramTypes.state',
  icon: <Icon path={Icons.StateDiagram} size={18} />,
  description: 'Create state machines and state transition diagrams',

  createInitialState: createInitialStateDiagramState,

  Toolbar: StateToolbar as any,
  Canvas: StateCanvas as any,
  Sidebar: StateSidebar as any,

  toMermaid: (state, direction) => {
    return generateStateMermaidCode(state.states, state.transitions, direction)
  },

  fromMermaid: (code, existingState, direction) => {
    try {
      const result = parseStateMermaidCode(code, existingState?.states || [], direction || 'TD')
      if (result) {
        return {
          success: true,
          state: { states: result.states, transitions: result.transitions },
          direction: result.direction,
        }
      }
      return { success: false, errors: ['Failed to parse State Diagram code'] }
    } catch (err) {
      return { success: false, errors: [(err as Error).message] }
    }
  },

  autoLayout: (state, direction) => {
    const layoutedStates = applyStateAutoLayout(state.states, state.transitions, direction)
    return { ...state, states: layoutedStates }
  },

  getDefaultDirection: () => 'TD',

  deleteSelection: (state, selection) => {
    if (selection.type === 'state') {
      const stateId = selection.id
      return {
        states: state.states.filter(s => s.id !== stateId),
        transitions: state.transitions.filter(t => t.from !== stateId && t.to !== stateId),
      }
    } else if (selection.type === 'transition') {
      return {
        ...state,
        transitions: state.transitions.filter(t => t.id !== selection.id),
      }
    }
    return state
  },
}

export * from './types'
