import { Icon, Icons } from '@/components/Icons'
import type { DiagramPlugin } from '@/core/types'
import type { ClassDiagramState } from './types'
import { createInitialClassDiagramState } from './types'
import { generateClassMermaidCode, parseClassMermaidCode } from './mermaid'
import { applyClassAutoLayout } from './layout'
import { ClassToolbar } from './Toolbar'
import { ClassCanvas } from './Canvas'
import { ClassSidebar } from './Sidebar'

/**
 * Class Diagram Plugin Definition
 */
export const classDiagramPlugin: DiagramPlugin<ClassDiagramState> = {
  id: 'class',
  name: 'diagramTypes.classDiagram',
  icon: <Icon path={Icons.ClassDiagram} size={18} />,
  description: 'Create UML class diagrams with classes, interfaces, and relationships',

  createInitialState: createInitialClassDiagramState,

  Toolbar: ClassToolbar as any,
  Canvas: ClassCanvas as any,
  Sidebar: ClassSidebar as any,

  toMermaid: (state, direction) => {
    return generateClassMermaidCode(state.classes, state.relationships, direction)
  },

  fromMermaid: (code, existingState, direction) => {
    try {
      const result = parseClassMermaidCode(code, existingState?.classes || [], direction || 'TD')
      if (result) {
        return {
          success: true,
          state: { classes: result.classes, relationships: result.relationships },
          direction: result.direction,
        }
      }
      return { success: false, errors: ['Failed to parse Class Diagram code'] }
    } catch (err) {
      return { success: false, errors: [(err as Error).message] }
    }
  },

  autoLayout: (state, direction) => {
    const layoutedClasses = applyClassAutoLayout(state.classes, state.relationships, direction)
    return { ...state, classes: layoutedClasses }
  },

  getDefaultDirection: () => 'TD',

  deleteSelection: (state, selection) => {
    if (selection.type === 'class') {
      const classId = selection.id
      return {
        classes: state.classes.filter(c => c.id !== classId),
        relationships: state.relationships.filter(r => r.from !== classId && r.to !== classId),
      }
    } else if (selection.type === 'relationship') {
      return {
        ...state,
        relationships: state.relationships.filter(r => r.id !== selection.id),
      }
    }
    return state
  },
}

export * from './types'
