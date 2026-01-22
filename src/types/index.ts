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

// Link line style
export type LinkType = 'solid' | 'dotted'

// Arrow direction
export type ArrowType = 'forward' | 'back' | 'both' | 'none'

// Editor mode
export type EditorMode = 'select' | 'link'

// Flow direction
export type FlowDirection = 'TD' | 'LR'

// Graph node
export interface GraphNode {
  id: string
  type: NodeType
  x: number
  y: number
  label: string
  customWidth?: number
  customHeight?: number
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
}

// Selection state
export interface Selection {
  type: 'node' | 'link'
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
