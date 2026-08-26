import { Icon, Icons } from '@/components/Icons'
import type { DiagramPlugin } from '@/core/types'
import type { SequenceDiagramState } from './types'
import { createInitialSequenceDiagramState } from './types'
import { generateSequenceMermaidCode, parseSequenceMermaidCode } from './mermaid'
import { SequenceToolbar } from './Toolbar'
import { SequenceCanvas } from './Canvas'
import { SequenceSidebar } from './Sidebar'

/**
 * Sequence Diagram Plugin Definition
 */
export const sequenceDiagramPlugin: DiagramPlugin<SequenceDiagramState> = {
  id: 'sequence',
  name: 'diagramTypes.sequenceDiagram',
  icon: <Icon path={Icons.SequenceDiagram} size={18} />,
  description: 'Create sequence diagrams showing interactions between participants',

  createInitialState: createInitialSequenceDiagramState,

  Toolbar: SequenceToolbar as any,
  Canvas: SequenceCanvas as any,
  Sidebar: SequenceSidebar as any,

  toMermaid: (state) => {
    return generateSequenceMermaidCode(state)
  },

  fromMermaid: (code, existingState) => {
    try {
      const result = parseSequenceMermaidCode(code, existingState)
      if (result) {
        return {
          success: true,
          state: result,
        }
      }
      return { success: false, errors: ['Failed to parse Sequence Diagram code'] }
    } catch (err) {
      return { success: false, errors: [(err as Error).message] }
    }
  },

  // Sequence diagrams don't have auto-layout in the traditional sense
  // The layout is determined by participant order and message order
  autoLayout: (state) => state,

  getDefaultDirection: () => 'TD',

  deleteSelection: (state, selection) => {
    if (selection.type === 'participant') {
      const participantId = selection.id
      // Remove participant and all messages involving it
      const newParticipants = state.participants.filter(p => p.id !== participantId)
      // Reorder remaining participants
      newParticipants.forEach((p, i) => { p.order = i })
      const newMessages = state.messages.filter(m => m.from !== participantId && m.to !== participantId)
      // Reorder remaining messages
      newMessages.forEach((m, i) => { m.order = i })
      return {
        ...state,
        participants: newParticipants,
        messages: newMessages,
      }
    } else if (selection.type === 'message') {
      const newMessages = state.messages.filter(m => m.id !== selection.id)
      // Reorder remaining messages
      newMessages.forEach((m, i) => { m.order = i })
      return {
        ...state,
        messages: newMessages,
      }
    }
    return state
  },
}

export * from './types'
