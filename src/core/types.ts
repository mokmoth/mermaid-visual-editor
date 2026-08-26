import type { ReactNode, ComponentType, RefObject } from 'react'

// ============================================
// Shared Types (used by all diagram types)
// ============================================

export type DiagramDirection = 'TD' | 'LR' | 'BT' | 'RL'
export type EditorMode = 'select' | 'link'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface ViewState {
  x: number
  y: number
  scale: number
}

export interface Selection {
  type: string  // 'node', 'link', 'state', 'transition', 'class', 'relationship', 'entity', etc.
  id: string
}

export interface ParseResult<T> {
  success: boolean
  state?: T
  direction?: DiagramDirection
  errors?: string[]
}

// ============================================
// Plugin Interface
// ============================================

export interface DiagramPlugin<TState = unknown> {
  // Meta information
  id: string
  name: string  // i18n key
  icon: ReactNode
  description?: string

  // Initial state factory
  createInitialState: () => TState

  // Components
  Toolbar: ComponentType<ToolbarProps<TState>>
  Canvas: ComponentType<CanvasProps<TState>>
  Sidebar: ComponentType<SidebarProps<TState>>

  // Mermaid conversion
  toMermaid: (state: TState, direction: DiagramDirection) => string
  fromMermaid: (code: string, existingState?: TState, direction?: DiagramDirection) => ParseResult<TState>

  // Optional features
  autoLayout?: (state: TState, direction: DiagramDirection) => TState
  validate?: (state: TState) => ValidationError[]
  getDefaultDirection?: () => DiagramDirection

  // Delete selection handler
  deleteSelection?: (state: TState, selection: Selection) => TState
}

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  elementId?: string
}

// ============================================
// Component Props Interfaces
// ============================================

export interface ToolbarProps<TState> {
  state: TState
  direction: DiagramDirection
  editorView: ViewState
  onStateChange: (state: TState) => void
  onDirectionChange: (dir: DiagramDirection) => void
  onAutoLayout: () => void
}

export interface CanvasProps<TState> {
  state: TState
  selection: Selection | null
  multiSelect: Set<string>
  view: ViewState
  mode: EditorMode
  snapToGrid: boolean
  gridSize: number

  // Refs
  containerRef: RefObject<HTMLDivElement>
  inputRef: RefObject<HTMLInputElement>

  // Callbacks
  onStateChange: (state: TState) => void
  onSelectionChange: (sel: Selection | null) => void
  onMultiSelectChange: (ids: Set<string>) => void
  onViewChange: (view: ViewState) => void

  // Drag handlers
  onDragStart: (id: string, e: React.PointerEvent) => void
  onMultiDragStart: (ids: Set<string>, e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent, element: any, handle: string) => void
  onMultiResizeStart?: (ids: Set<string>, e: React.PointerEvent, handle: string) => void

  // Link drawing
  onDrawingLinkStart: (sourceId: string, e: React.PointerEvent) => void
  onDrawingLinkEnd: (targetId: string) => void
  onDrawingLinkCancel: () => void
  onDrawingLinkMove: (x: number, y: number) => void
  drawingLink: DrawingLink | null

  // Pan and box select
  onPanStart: (e: React.PointerEvent) => void
  onBoxSelectStart: (e: React.PointerEvent) => void
  onBoxSelectMove: (x: number, y: number) => void
  boxSelect: BoxSelectState | null

  // Editing
  editingNodeId: string | null
  editingLinkId: string | null
  tempLabel: string
  hoveredNodeId: string | null
  onEditNode: (nodeId: string) => void
  onEditLink: (linkId: string, label: string) => void
  onTempLabelChange: (label: string) => void
  onFinishEditing: () => void
  onHoverNode: (nodeId: string | null) => void

  // Add link
  onAddLink: (link: any) => void
}

export interface SidebarProps<TState> {
  state: TState
  selection: Selection | null
  multiSelectCount: number
  snapToGrid: boolean
  onStateChange: (state: TState) => void
  onSelectionChange: (sel: Selection | null) => void
  onLabelChange: (value: string) => void
  onAlignNodes: (direction: string) => void
  onSnapToGridChange: (value: boolean) => void
}

// ============================================
// Interaction State Types
// ============================================

export interface DrawingLink {
  sourceId: string
  startX: number
  startY: number
  currX: number
  currY: number
}

export interface BoxSelectState {
  startX: number
  startY: number
  endX: number
  endY: number
}

export interface PanState {
  type: 'editor' | 'preview'
  startX: number
  startY: number
  viewStartX: number
  viewStartY: number
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
