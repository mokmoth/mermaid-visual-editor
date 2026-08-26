// Node types for flowchart shapes
export type NodeType =
  | 'rect'
  | 'round'
  | 'stadium'
  | 'circle'
  | 'rhombus'
  | 'hexagon'
  | 'parallelogram'
  | 'database'
  | 'subroutine'
  | 'flag'
  | 'trapezoid'
  | 'trapezoid_alt'
  | 'double_circle'
  | 'parallelogram_alt'

// Link line style
export type LinkType = 'solid' | 'dotted' | 'thick'

// Arrow direction
export type ArrowType =
  | 'forward'
  | 'back'
  | 'both'
  | 'none'
  | 'circle'
  | 'circle_start'
  | 'circle_both'
  | 'cross'
  | 'cross_start'
  | 'cross_both'

// Editor mode
export type EditorMode = 'select' | 'link'

// Flow direction
export type FlowDirection = 'TD' | 'LR' | 'BT' | 'RL'

// Swimlane lane within a swimlane container
export interface SwimlaneLane {
  id: string
  name: string
}

// Swimlane container with multiple lanes
export interface Swimlane {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  orientation: 'horizontal' | 'vertical' // horizontal = lanes are rows, vertical = lanes are columns
  lanes: SwimlaneLane[]
  color?: string
}

// Graph node
export interface GraphNode {
  id: string
  type: NodeType
  x: number
  y: number
  label: string
  customWidth?: number
  customHeight?: number
  swimlaneId?: string  // Optional swimlane container assignment
  laneId?: string      // Optional lane within swimlane assignment
}

// Graph link/edge
export interface GraphLink {
  id: string
  source: string
  target: string
  label?: string
  type: LinkType
  arrow: ArrowType
}

// Graph state
export interface GraphState {
  nodes: GraphNode[]
  links: GraphLink[]
  swimlanes: Swimlane[]
}

// Selection state
export interface Selection {
  type: 'node' | 'link' | 'state' | 'transition' | 'class' | 'relationship' | 'entity' | 'participant' | 'message' | 'swimlane'
  id: string
}

// View state for canvas/preview
export interface ViewState {
  x: number
  y: number
  scale: number
}

// Drag state
export interface DragState {
  nodeId: string
  startX: number
  startY: number
  initialNodeX: number
  initialNodeY: number
}

// Multi-drag state
export interface MultiDragState {
  nodeIds: Set<string>
  initialPositions: Map<string, { x: number; y: number }>
  startX: number
  startY: number
}

// Resize state
export interface ResizeState {
  nodeId: string
  startX: number
  startY: number
  startW: number
  startH: number
  startNodeX: number
  startNodeY: number
  handle: ResizeHandle
}

// Resize handle position
export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

// Drawing link state
export interface DrawingLink {
  sourceId: string
  startX: number
  startY: number
  currX: number
  currY: number
}

// Pan state
export interface PanState {
  type: 'editor' | 'preview'
  startX: number
  startY: number
  viewStartX: number
  viewStartY: number
}

// Box selection state
export interface BoxSelectState {
  startX: number
  startY: number
  endX: number
  endY: number
}

// Clipboard state
export interface ClipboardState {
  type: 'node' | 'link'
  data: GraphNode | GraphLink
}

// Point coordinates
export interface Point {
  x: number
  y: number
}

// Size dimensions
export interface Size {
  width: number
  height: number
}
