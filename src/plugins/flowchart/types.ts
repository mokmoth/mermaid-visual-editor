// Re-export types from main types file for flowchart-specific use
import type {
  GraphNode,
  GraphLink,
  GraphState,
  NodeType,
  LinkType,
  ArrowType
} from '@/types'

// Flowchart-specific types (re-exports for clarity)
export type FlowNodeType = NodeType
export type FlowLinkType = LinkType
export type FlowArrowType = ArrowType

export type FlowNode = GraphNode
export type FlowLink = GraphLink
export type FlowchartState = GraphState

// Initial state factory
export function createInitialFlowchartState(): FlowchartState {
  return {
    nodes: [
      { id: 'Start', type: 'stadium', x: 100, y: 100, label: '开始' },
      { id: 'Proc', type: 'rect', x: 100, y: 250, label: '执行过程' },
      { id: 'Cond', type: 'rhombus', x: 100, y: 400, label: '判断循环' },
    ],
    links: [
      { source: 'Start', target: 'Proc', id: 'link1', type: 'solid', arrow: 'forward' },
      { source: 'Proc', target: 'Cond', id: 'link2', label: '检查', type: 'solid', arrow: 'forward' },
      { source: 'Cond', target: 'Proc', id: 'link3', label: '不通过', type: 'dotted', arrow: 'back' },
    ],
    swimlanes: []
  }
}

// Node type definitions with icons and labels
export const FLOWCHART_NODE_TYPES: Array<{ type: FlowNodeType; iconKey: string; labelKey: string }> = [
  { type: 'rect', iconKey: 'Square', labelKey: 'flowchart.nodes.rect' },
  { type: 'round', iconKey: 'Round', labelKey: 'flowchart.nodes.round' },
  { type: 'stadium', iconKey: 'Stadium', labelKey: 'flowchart.nodes.stadium' },
  { type: 'subroutine', iconKey: 'Subroutine', labelKey: 'flowchart.nodes.subroutine' },
  { type: 'database', iconKey: 'Database', labelKey: 'flowchart.nodes.database' },
  { type: 'circle', iconKey: 'Circle', labelKey: 'flowchart.nodes.circle' },
  { type: 'rhombus', iconKey: 'Rhombus', labelKey: 'flowchart.nodes.rhombus' },
  { type: 'hexagon', iconKey: 'Hexagon', labelKey: 'flowchart.nodes.hexagon' },
  { type: 'parallelogram', iconKey: 'Parallelogram', labelKey: 'flowchart.nodes.parallelogram' },
  { type: 'flag', iconKey: 'Flag', labelKey: 'flowchart.nodes.flag' },
  { type: 'trapezoid', iconKey: 'Trapezoid', labelKey: 'flowchart.nodes.trapezoid' },
  { type: 'trapezoid_alt', iconKey: 'TrapezoidAlt', labelKey: 'flowchart.nodes.trapezoidAlt' },
  { type: 'double_circle', iconKey: 'DoubleCircle', labelKey: 'flowchart.nodes.doubleCircle' },
  { type: 'parallelogram_alt', iconKey: 'ParallelogramAlt', labelKey: 'flowchart.nodes.parallelogramAlt' },
]
