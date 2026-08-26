import type { StateNode, StateTransition } from './types'
import type { DiagramDirection } from '@/core/types'

/**
 * Generate Mermaid code from state diagram state
 */
export function generateStateMermaidCode(
  states: StateNode[],
  transitions: StateTransition[],
  direction: DiagramDirection = 'TD'
): string {
  const lines: string[] = [`stateDiagram-v2`]

  // Add direction if not default
  if (direction !== 'TD') {
    lines.push(`    direction ${direction}`)
  }

  // Generate state definitions (skip start/end as they use [*])
  states.forEach(state => {
    if (state.type === 'state') {
      if (state.description) {
        lines.push(`    ${state.id} : ${state.name}`)
        lines.push(`    note right of ${state.id} : ${state.description}`)
      } else if (state.name !== state.id) {
        lines.push(`    ${state.id} : ${state.name}`)
      }
    } else if (state.type === 'choice') {
      lines.push(`    state ${state.id} <<choice>>`)
    } else if (state.type === 'fork') {
      lines.push(`    state ${state.id} <<fork>>`)
    } else if (state.type === 'join') {
      lines.push(`    state ${state.id} <<join>>`)
    }
  })

  // Generate transitions
  transitions.forEach(t => {
    const fromId = getStateNotation(states.find(s => s.id === t.from))
    const toId = getStateNotation(states.find(s => s.id === t.to))

    let transitionStr = `    ${fromId} --> ${toId}`
    if (t.label) {
      transitionStr += ` : ${t.label}`
    }
    lines.push(transitionStr)
  })

  return lines.join('\n')
}

function getStateNotation(state: StateNode | undefined): string {
  if (!state) return 'unknown'
  if (state.type === 'start' || state.type === 'end') {
    return '[*]'
  }
  return state.id
}

/**
 * Parse Mermaid state diagram code
 */
export function parseStateMermaidCode(
  code: string,
  existingStates: StateNode[] = [],
  currentDirection: DiagramDirection = 'TD'
): { states: StateNode[]; transitions: StateTransition[]; direction: DiagramDirection } | null {
  try {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'))

    // Check if it's a state diagram
    const headerLine = lines.find(l => l.startsWith('stateDiagram'))
    if (!headerLine) return null

    let direction: DiagramDirection = currentDirection
    const states: StateNode[] = []
    const transitions: StateTransition[] = []
    const stateMap = new Map<string, StateNode>()

    // Track if we have start/end states
    let hasStart = false
    let hasEnd = false

    for (const line of lines) {
      // Skip header
      if (line.startsWith('stateDiagram')) continue

      // Parse direction
      const dirMatch = line.match(/direction\s+(TD|LR|BT|RL)/i)
      if (dirMatch) {
        direction = dirMatch[1].toUpperCase() as DiagramDirection
        continue
      }

      // Parse state declarations with stereotype
      const stereotypeMatch = line.match(/state\s+(\w+)\s+<<(\w+)>>/)
      if (stereotypeMatch) {
        const [, id, stereotype] = stereotypeMatch
        const type = stereotype === 'choice' ? 'choice' :
                     stereotype === 'fork' ? 'fork' :
                     stereotype === 'join' ? 'join' : 'state'
        if (!stateMap.has(id)) {
          const state: StateNode = {
            id,
            name: id,
            type,
            x: 100 + states.length * 50,
            y: 100 + states.length * 120
          }
          states.push(state)
          stateMap.set(id, state)
        }
        continue
      }

      // Parse state with label
      const stateLabelMatch = line.match(/^(\w+)\s*:\s*(.+)$/)
      if (stateLabelMatch) {
        const [, id, name] = stateLabelMatch
        if (!stateMap.has(id)) {
          const state: StateNode = {
            id,
            name: name.trim(),
            type: 'state',
            x: 100 + states.length * 50,
            y: 100 + states.length * 120
          }
          states.push(state)
          stateMap.set(id, state)
        } else {
          const existing = stateMap.get(id)!
          existing.name = name.trim()
        }
        continue
      }

      // Parse transitions
      const transitionMatch = line.match(/^(.+?)\s*-->\s*(.+?)(?:\s*:\s*(.+))?$/)
      if (transitionMatch) {
        let [, from, to, label] = transitionMatch
        from = from.trim()
        to = to.trim()
        label = label?.trim() || ''

        // Handle [*] notation
        if (from === '[*]') {
          if (!hasStart) {
            const startState: StateNode = {
              id: 'start',
              name: '',
              type: 'start',
              x: 150,
              y: 50
            }
            states.unshift(startState)
            stateMap.set('[*]_start', startState)
            hasStart = true
          }
          from = 'start'
        }

        if (to === '[*]') {
          if (!hasEnd) {
            const endState: StateNode = {
              id: 'end',
              name: '',
              type: 'end',
              x: 150,
              y: 550
            }
            states.push(endState)
            stateMap.set('[*]_end', endState)
            hasEnd = true
          }
          to = 'end'
        }

        // Create states if they don't exist
        if (!stateMap.has(from) && from !== 'start') {
          const state: StateNode = {
            id: from,
            name: from,
            type: 'state',
            x: 100 + states.length * 50,
            y: 100 + states.length * 120
          }
          states.push(state)
          stateMap.set(from, state)
        }

        if (!stateMap.has(to) && to !== 'end') {
          const state: StateNode = {
            id: to,
            name: to,
            type: 'state',
            x: 100 + states.length * 50,
            y: 100 + states.length * 120
          }
          states.push(state)
          stateMap.set(to, state)
        }

        transitions.push({
          id: `t${transitions.length + 1}`,
          from,
          to,
          label: label || undefined
        })
      }
    }

    // Apply existing positions if available
    states.forEach(state => {
      const existing = existingStates.find(s => s.id === state.id)
      if (existing) {
        state.x = existing.x
        state.y = existing.y
        if (existing.customWidth) state.customWidth = existing.customWidth
        if (existing.customHeight) state.customHeight = existing.customHeight
      }
    })

    return { states, transitions, direction }
  } catch (err) {
    console.error('Failed to parse state diagram:', err)
    return null
  }
}
