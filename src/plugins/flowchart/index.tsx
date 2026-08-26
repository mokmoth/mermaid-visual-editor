import { Icon, Icons } from '@/components/Icons'
import type { DiagramPlugin } from '@/core/types'
import type { FlowchartState } from './types'
import { createInitialFlowchartState } from './types'
import { generateMermaidCode, parseMermaidCode } from '@/utils/mermaid'
import { applyAutoLayout } from '@/utils/layout'

// Import existing components - we'll create wrapper components
import { Canvas as FlowchartCanvasOriginal } from '@/components/Canvas'
import { Sidebar as FlowchartSidebarOriginal } from '@/components/Sidebar'

// Flowchart Toolbar Component (extracted from Header node buttons)
import { FlowchartToolbar } from './Toolbar'

// Wrapper for Canvas to match plugin interface
const FlowchartCanvas = FlowchartCanvasOriginal as any

// Wrapper for Sidebar to match plugin interface
const FlowchartSidebar = FlowchartSidebarOriginal as any

/**
 * Flowchart Plugin Definition
 */
export const flowchartPlugin: DiagramPlugin<FlowchartState> = {
  id: 'flowchart',
  name: 'diagramTypes.flowchart',
  icon: <Icon path={Icons.Flowchart} size={18} />,
  description: 'Create flowcharts, decision trees, and process diagrams',

  createInitialState: createInitialFlowchartState,

  Toolbar: FlowchartToolbar,
  Canvas: FlowchartCanvas,
  Sidebar: FlowchartSidebar,

  toMermaid: (state, direction) => {
    return generateMermaidCode(state.nodes, state.links, direction, state.swimlanes)
  },

  fromMermaid: (code, existingState, direction) => {
    try {
      const result = parseMermaidCode(code, existingState?.nodes || [], direction || 'TD')
      if (result) {
        return {
          success: true,
          state: { nodes: result.nodes, links: result.links, swimlanes: existingState?.swimlanes || [] },
          direction: result.direction,
        }
      }
      return { success: false, errors: ['Failed to parse Mermaid code'] }
    } catch (err) {
      return { success: false, errors: [(err as Error).message] }
    }
  },

  autoLayout: (state, direction) => {
    const layoutedNodes = applyAutoLayout(state.nodes, state.links, direction, state.swimlanes)
    return { ...state, nodes: layoutedNodes }
  },

  getDefaultDirection: () => 'TD',

  deleteSelection: (state, selection) => {
    if (selection.type === 'node') {
      const nodeId = selection.id
      return {
        ...state,
        nodes: state.nodes.filter(n => n.id !== nodeId),
        links: state.links.filter(l => l.source !== nodeId && l.target !== nodeId),
      }
    } else if (selection.type === 'link') {
      return {
        ...state,
        links: state.links.filter(l => l.id !== selection.id),
      }
    } else if (selection.type === 'swimlane') {
      return {
        ...state,
        swimlanes: state.swimlanes.filter(s => s.id !== selection.id),
        nodes: state.nodes.map(n => n.swimlaneId === selection.id ? { ...n, swimlaneId: undefined } : n),
      }
    }
    return state
  },
}

export * from './types'
