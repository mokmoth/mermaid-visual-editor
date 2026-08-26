import type { SequenceDiagramState, Participant, Message, MessageType } from './types'

/**
 * Generate Mermaid code from sequence diagram state
 */
export function generateSequenceMermaidCode(state: SequenceDiagramState): string {
  const lines: string[] = ['sequenceDiagram']

  // Add title if exists
  if (state.title) {
    lines.push(`    title ${state.title}`)
  }

  // Add auto numbering if enabled
  if (state.autoNumber) {
    lines.push('    autonumber')
  }

  // Generate participant declarations
  state.participants
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(p => {
      const keyword = p.type === 'actor' ? 'actor' : 'participant'
      if (p.alias && p.alias !== p.name) {
        lines.push(`    ${keyword} ${p.id} as ${p.alias}`)
      } else if (p.name !== p.id) {
        lines.push(`    ${keyword} ${p.id} as ${p.name}`)
      } else {
        lines.push(`    ${keyword} ${p.id}`)
      }
    })

  // Generate messages sorted by order
  state.messages
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(msg => {
      const arrow = getArrowSyntax(msg.type)
      let line = `    ${msg.from}${arrow}${msg.to}`
      if (msg.text) {
        line += `: ${msg.text}`
      }
      lines.push(line)
    })

  return lines.join('\n')
}

/**
 * Get Mermaid arrow syntax for message type
 */
function getArrowSyntax(type: MessageType): string {
  switch (type) {
    case 'solid':
      return '->>'
    case 'dotted':
      return '-->>'
    case 'solid_open':
      return '->'
    case 'dotted_open':
      return '-->'
    case 'solid_cross':
      return '-x'
    case 'dotted_cross':
      return '--x'
    default:
      return '->>'
  }
}

/**
 * Parse Mermaid sequence diagram code
 */
export function parseSequenceMermaidCode(
  code: string,
  _existingState?: SequenceDiagramState
): SequenceDiagramState | null {
  try {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'))

    // Check if it's a sequence diagram
    const headerLine = lines.find(l => l.startsWith('sequenceDiagram'))
    if (!headerLine) return null

    const participants: Participant[] = []
    const messages: Message[] = []
    const participantMap = new Map<string, Participant>()
    let title: string | undefined
    let autoNumber = false

    let participantOrder = 0
    let messageOrder = 0

    for (const line of lines) {
      // Skip header
      if (line.startsWith('sequenceDiagram')) continue

      // Parse title
      const titleMatch = line.match(/title\s+(.+)/)
      if (titleMatch) {
        title = titleMatch[1].trim()
        continue
      }

      // Parse autonumber
      if (line === 'autonumber') {
        autoNumber = true
        continue
      }

      // Parse participant/actor declarations
      const participantMatch = line.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?$/)
      if (participantMatch) {
        const [, type, id, alias] = participantMatch
        if (!participantMap.has(id)) {
          const participant: Participant = {
            id,
            name: alias?.trim() || id,
            alias: alias?.trim(),
            type: type as 'participant' | 'actor',
            order: participantOrder++
          }
          participants.push(participant)
          participantMap.set(id, participant)
        }
        continue
      }

      // Parse messages
      // Arrow patterns: ->> (solid), -->> (dotted), -> (solid_open), --> (dotted_open), -x (solid_cross), --x (dotted_cross)
      const messageMatch = line.match(/^(\w+)\s*(--?>>?|--?x)\s*(\w+)(?:\s*:\s*(.*))?$/)
      if (messageMatch) {
        const [, from, arrow, to, text] = messageMatch

        // Ensure participants exist
        if (!participantMap.has(from)) {
          const participant: Participant = {
            id: from,
            name: from,
            type: 'participant',
            order: participantOrder++
          }
          participants.push(participant)
          participantMap.set(from, participant)
        }
        if (!participantMap.has(to)) {
          const participant: Participant = {
            id: to,
            name: to,
            type: 'participant',
            order: participantOrder++
          }
          participants.push(participant)
          participantMap.set(to, participant)
        }

        const message: Message = {
          id: `m${messageOrder}`,
          from,
          to,
          text: text?.trim() || '',
          type: getMessageType(arrow),
          order: messageOrder++
        }
        messages.push(message)
        continue
      }
    }

    // Apply existing positions if available (for participants - they don't really have positions in sequence diagrams)
    // but we preserve order

    return {
      participants,
      messages,
      notes: [],
      title,
      autoNumber
    }
  } catch (err) {
    console.error('Failed to parse sequence diagram:', err)
    return null
  }
}

/**
 * Get message type from arrow syntax
 */
function getMessageType(arrow: string): MessageType {
  switch (arrow) {
    case '->>':
      return 'solid'
    case '-->>':
      return 'dotted'
    case '->':
      return 'solid_open'
    case '-->':
      return 'dotted_open'
    case '-x':
      return 'solid_cross'
    case '--x':
      return 'dotted_cross'
    default:
      return 'solid'
  }
}
