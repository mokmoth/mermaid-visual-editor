import { create } from 'zustand'
import type {
  GraphNode,
  GraphLink,
  Selection,
  EditorMode,
  FlowDirection,
  ViewState,
  DragState,
  MultiDragState,
  ResizeState,
  DrawingLink,
  PanState,
  BoxSelectState,
  ClipboardState
} from '@/types'

interface EditorState {
  // Graph data
  nodes: GraphNode[]
  links: GraphLink[]
  
  // Selection
  selection: Selection | null
  multiSelect: Set<string>
  
  // Editor state
  mode: EditorMode
  direction: FlowDirection
  
  // Interaction states
  dragState: DragState | null
  multiDragState: MultiDragState | null
  resizeState: ResizeState | null
  drawingLink: DrawingLink | null
  panState: PanState | null
  boxSelect: BoxSelectState | null
  
  // Editing state
  editingNodeId: string | null
  editingLinkId: string | null
  tempLabel: string
  
  // View states
  editorView: ViewState
  previewView: ViewState
  
  // UI state
  isFullscreen: boolean
  showExportMenu: boolean
  hoveredNodeId: string | null
  snapToGrid: boolean
  clipboard: ClipboardState | null
  
  // Code state
  generatedCode: string
  isManualEditing: boolean
  mermaidError: string | null
}

interface EditorActions {
  // Graph mutations
  setNodes: (nodes: GraphNode[] | ((prev: GraphNode[]) => GraphNode[])) => void
  setLinks: (links: GraphLink[] | ((prev: GraphLink[]) => GraphLink[])) => void
  setGraph: (nodes: GraphNode[], links: GraphLink[]) => void
  
  // Selection
  setSelection: (selection: Selection | null) => void
  setMultiSelect: (multiSelect: Set<string>) => void
  clearSelection: () => void
  
  // Editor state
  setMode: (mode: EditorMode) => void
  setDirection: (direction: FlowDirection) => void
  
  // Interaction states
  setDragState: (state: DragState | null) => void
  setMultiDragState: (state: MultiDragState | null) => void
  setResizeState: (state: ResizeState | null) => void
  setDrawingLink: (state: DrawingLink | null) => void
  setPanState: (state: PanState | null) => void
  setBoxSelect: (state: BoxSelectState | null) => void
  
  // Editing
  setEditingNodeId: (id: string | null) => void
  setEditingLinkId: (id: string | null) => void
  setTempLabel: (label: string) => void
  
  // Views
  setEditorView: (view: ViewState | ((prev: ViewState) => ViewState)) => void
  setPreviewView: (view: ViewState | ((prev: ViewState) => ViewState)) => void
  
  // UI state
  setIsFullscreen: (value: boolean) => void
  setShowExportMenu: (value: boolean) => void
  setHoveredNodeId: (id: string | null) => void
  setSnapToGrid: (value: boolean) => void
  setClipboard: (clipboard: ClipboardState | null) => void
  
  // Code state
  setGeneratedCode: (code: string) => void
  setIsManualEditing: (value: boolean) => void
  setMermaidError: (error: string | null) => void
  
  // Complex actions
  deleteSelection: () => void
  addNode: (node: GraphNode) => void
  updateNodeLabel: (id: string, label: string) => void
  updateLinkLabel: (id: string, label: string) => void
}

const initialNodes: GraphNode[] = [
  { id: 'Start', type: 'stadium', x: 100, y: 100, label: '开始' },
  { id: 'Proc', type: 'rect', x: 100, y: 250, label: '执行过程' },
  { id: 'Cond', type: 'rhombus', x: 100, y: 400, label: '判断循环' },
]

const initialLinks: GraphLink[] = [
  { source: 'Start', target: 'Proc', id: 'link1', type: 'solid', arrow: 'forward' },
  { source: 'Proc', target: 'Cond', id: 'link2', label: '检查', type: 'solid', arrow: 'forward' },
  { source: 'Cond', target: 'Proc', id: 'link3', label: '不通过', type: 'dotted', arrow: 'back' },
]

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  // Initial state
  nodes: initialNodes,
  links: initialLinks,
  selection: null,
  multiSelect: new Set(),
  mode: 'select',
  direction: 'TD',
  dragState: null,
  multiDragState: null,
  resizeState: null,
  drawingLink: null,
  panState: null,
  boxSelect: null,
  editingNodeId: null,
  editingLinkId: null,
  tempLabel: '',
  editorView: { x: 0, y: 0, scale: 1 },
  previewView: { x: 0, y: 0, scale: 1 },
  isFullscreen: false,
  showExportMenu: false,
  hoveredNodeId: null,
  snapToGrid: false,
  clipboard: null,
  generatedCode: '',
  isManualEditing: false,
  mermaidError: null,

  // Actions
  setNodes: (nodesOrFn) => set((state) => ({
    nodes: typeof nodesOrFn === 'function' ? nodesOrFn(state.nodes) : nodesOrFn
  })),
  
  setLinks: (linksOrFn) => set((state) => ({
    links: typeof linksOrFn === 'function' ? linksOrFn(state.links) : linksOrFn
  })),
  
  setGraph: (nodes, links) => set({ nodes, links }),
  
  setSelection: (selection) => set({ selection }),
  
  setMultiSelect: (multiSelect) => set({ multiSelect }),
  
  clearSelection: () => set({ selection: null, multiSelect: new Set() }),
  
  setMode: (mode) => set({ mode }),
  
  setDirection: (direction) => set({ direction }),
  
  setDragState: (dragState) => set({ dragState }),
  
  setMultiDragState: (multiDragState) => set({ multiDragState }),
  
  setResizeState: (resizeState) => set({ resizeState }),
  
  setDrawingLink: (drawingLink) => set({ drawingLink }),
  
  setPanState: (panState) => set({ panState }),
  
  setBoxSelect: (boxSelect) => set({ boxSelect }),
  
  setEditingNodeId: (editingNodeId) => set({ editingNodeId }),
  
  setEditingLinkId: (editingLinkId) => set({ editingLinkId }),
  
  setTempLabel: (tempLabel) => set({ tempLabel }),
  
  setEditorView: (viewOrFn) => set((state) => ({
    editorView: typeof viewOrFn === 'function' ? viewOrFn(state.editorView) : viewOrFn
  })),
  
  setPreviewView: (viewOrFn) => set((state) => ({
    previewView: typeof viewOrFn === 'function' ? viewOrFn(state.previewView) : viewOrFn
  })),
  
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  
  setShowExportMenu: (showExportMenu) => set({ showExportMenu }),
  
  setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }),
  
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  
  setClipboard: (clipboard) => set({ clipboard }),
  
  setGeneratedCode: (generatedCode) => set({ generatedCode }),
  
  setIsManualEditing: (isManualEditing) => set({ isManualEditing }),
  
  setMermaidError: (mermaidError) => set({ mermaidError }),
  
  deleteSelection: () => {
    const { selection, multiSelect, nodes, links } = get()
    
    // Multi-select delete
    if (multiSelect.size > 0) {
      const nodeIdsToDelete = Array.from(multiSelect)
      const newNodes = nodes.filter(n => !nodeIdsToDelete.includes(n.id))
      const newLinks = links.filter(l => 
        !nodeIdsToDelete.includes(l.source) && !nodeIdsToDelete.includes(l.target)
      )
      set({ nodes: newNodes, links: newLinks, multiSelect: new Set(), selection: null })
      return
    }
    
    if (!selection) return
    
    if (selection.type === 'node') {
      const nodeId = selection.id
      const newNodes = nodes.filter(n => n.id !== nodeId)
      const newLinks = links.filter(l => l.source !== nodeId && l.target !== nodeId)
      set({ nodes: newNodes, links: newLinks, selection: null })
    } else {
      const newLinks = links.filter(l => l.id !== selection.id)
      set({ links: newLinks, selection: null })
    }
  },
  
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  })),
  
  updateNodeLabel: (id, label) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, label } : n)
  })),
  
  updateLinkLabel: (id, label) => set((state) => ({
    links: state.links.map(l => l.id === id ? { ...l, label } : l)
  })),
}))
