// Sequence Diagram Types

export type ParticipantType = 'participant' | 'actor'

export type MessageType =
  | 'solid'      // ->> solid line with arrowhead
  | 'dotted'     // -->> dotted line with arrowhead
  | 'solid_open' // -> solid line with open arrow
  | 'dotted_open'// --> dotted line with open arrow
  | 'solid_cross'// -x solid line with cross
  | 'dotted_cross'// --x dotted line with cross

export interface Participant {
  id: string
  name: string
  alias?: string
  type: ParticipantType
  order: number  // horizontal position order
}

export interface Message {
  id: string
  from: string      // participant id
  to: string        // participant id
  text: string
  type: MessageType
  order: number     // vertical position order (time sequence)
  activate?: boolean  // activate target
  deactivate?: boolean // deactivate source
}

export interface Note {
  id: string
  text: string
  position: 'left' | 'right' | 'over'
  participants: string[]  // participant ids
  order: number
}

export interface SequenceDiagramState {
  participants: Participant[]
  messages: Message[]
  notes: Note[]
  title?: string
  autoNumber?: boolean
}

// Initial state factory - minimal example
export function getSequenceBounds(state: SequenceDiagramState): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  const PARTICIPANT_SPACING = 150
  const PARTICIPANT_WIDTH = 100
  const PARTICIPANT_HEIGHT = 40
  const BASE_Y = 80
  const MESSAGE_SPACING = 50
  if (state.participants.length === 0) {
    return { minX: 0, minY: 0, maxX: 200, maxY: 200 }
  }
  let minX = Infinity
  let maxX = -Infinity
  for (const participant of state.participants) {
    const x = 50 + participant.order * PARTICIPANT_SPACING
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x + PARTICIPANT_WIDTH)
  }
  const timelineHeight = state.messages.length * MESSAGE_SPACING + 100
  return {
    minX,
    minY: BASE_Y,
    maxX,
    maxY: BASE_Y + PARTICIPANT_HEIGHT + timelineHeight,
  }
}

export function createInitialSequenceDiagramState(): SequenceDiagramState {
  return {
    participants: [
      { id: 'A', name: '参与者A', type: 'participant', order: 0 },
      { id: 'B', name: '参与者B', type: 'participant', order: 1 },
    ],
    messages: [
      { id: 'm1', from: 'A', to: 'B', text: '消息', type: 'solid', order: 0 },
    ],
    notes: [],
    autoNumber: false
  }
}

// Participant type options
export const PARTICIPANT_TYPES: Array<{ value: ParticipantType; label: string }> = [
  { value: 'participant', label: 'Participant' },
  { value: 'actor', label: 'Actor' },
]

// Message type options
export const MESSAGE_TYPES: Array<{ value: MessageType; label: string; description: string }> = [
  { value: 'solid', label: 'Solid Arrow', description: '->>' },
  { value: 'dotted', label: 'Dotted Arrow', description: '-->>' },
  { value: 'solid_open', label: 'Solid Open', description: '->' },
  { value: 'dotted_open', label: 'Dotted Open', description: '-->' },
  { value: 'solid_cross', label: 'Solid Cross', description: '-x' },
  { value: 'dotted_cross', label: 'Dotted Cross', description: '--x' },
]
