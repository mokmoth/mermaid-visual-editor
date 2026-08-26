import { Icon, Icons } from '@/components/Icons'
import type { DiagramPlugin } from '@/core/types'
import type { ERDiagramState } from './types'
import { createInitialERDiagramState } from './types'
import { generateERMermaidCode, parseERMermaidCode } from './mermaid'
import { applyERAutoLayout } from './layout'
import { ERToolbar } from './Toolbar'
import { ERCanvas } from './Canvas'
import { ERSidebar } from './Sidebar'

/**
 * ER Diagram Plugin Definition
 */
export const erDiagramPlugin: DiagramPlugin<ERDiagramState> = {
  id: 'er',
  name: 'diagramTypes.erDiagram',
  icon: <Icon path={Icons.ERDiagram} size={18} />,
  description: 'Create Entity-Relationship diagrams for database design',

  createInitialState: createInitialERDiagramState,

  Toolbar: ERToolbar as any,
  Canvas: ERCanvas as any,
  Sidebar: ERSidebar as any,

  toMermaid: (state, direction) => {
    return generateERMermaidCode(state.entities, state.relationships, direction)
  },

  fromMermaid: (code, existingState, direction) => {
    try {
      const result = parseERMermaidCode(code, existingState?.entities || [], direction || 'TD')
      if (result) {
        return {
          success: true,
          state: { entities: result.entities, relationships: result.relationships },
          direction: result.direction,
        }
      }
      return { success: false, errors: ['Failed to parse ER Diagram code'] }
    } catch (err) {
      return { success: false, errors: [(err as Error).message] }
    }
  },

  autoLayout: (state, direction) => {
    const layoutedEntities = applyERAutoLayout(state.entities, state.relationships, direction)
    return { ...state, entities: layoutedEntities }
  },

  getDefaultDirection: () => 'TD',

  deleteSelection: (state, selection) => {
    if (selection.type === 'entity') {
      const entityId = selection.id
      return {
        entities: state.entities.filter(e => e.id !== entityId),
        relationships: state.relationships.filter(r => r.from !== entityId && r.to !== entityId),
      }
    } else if (selection.type === 'erRelationship') {
      return {
        ...state,
        relationships: state.relationships.filter(r => r.id !== selection.id),
      }
    }
    return state
  },
}

export * from './types'
