import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Header } from './components/Header'
import { Canvas } from './components/Canvas'
import { Sidebar } from './components/Sidebar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ResizableDivider } from './components/ResizableDivider'
import { UserNameDialog } from './components/UserNameDialog'
import { DiagramList } from './components/DiagramList'
import { AdminPanel } from './components/AdminPanel'
import { useUndoRedo } from './hooks/useUndoRedo'
import { generateMermaidCode, parseMermaidCode } from './utils/mermaid'
import { countDiagramElements, detectDiagramType, shouldApplyParsedState } from './utils/diagramState'
import { useMermaidPreview } from './hooks/useMermaidPreview'
import { useHostEmbedBridge } from './hooks/useHostEmbedBridge'
import { applyAutoLayout } from './utils/layout'
import { getNodeSize } from './utils/nodeSize'
import { getNodeCenter, calculateFitToView, calculateFlowchartBounds, calculateItemsBounds } from './utils/geometry'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useGlobalPointerHandlers } from './hooks/useGlobalPointerHandlers'
import { useUnifiedDragHandlers } from './hooks/useUnifiedDragHandlers'
import { useI18n } from './i18n'
import {
  getCurrentUser,
  clearCurrentUser,
  createDiagram,
  getDiagram,
  saveDiagram,
  getCurrentDiagramId,
  setCurrentDiagramId,
  listDiagrams,
  isAdmin,
  DiagramRecord,
  DiagramType,
} from './services/storage'

// Plugin imports
import { pluginRegistry } from './plugins'
import type { StateDiagramState, StateNode } from './plugins/state/types'
import type { ClassDiagramState, ClassNode } from './plugins/class/types'
import type { ERDiagramState, Entity } from './plugins/er/types'
import type { SequenceDiagramState } from './plugins/sequence/types'
import { createInitialStateDiagramState } from './plugins/state/types'
import { createInitialClassDiagramState } from './plugins/class/types'
import { createInitialERDiagramState } from './plugins/er/types'
import { createInitialSequenceDiagramState, getSequenceBounds } from './plugins/sequence/types'
import { getStateNodeSize } from './plugins/state/StateNode'
import { getClassSize } from './plugins/class/ClassNode'
import { getEntitySize } from './plugins/er/EntityNode'

import type {
  GraphState,
  GraphNode,
  GraphLink,
  Swimlane,
  Selection,
  ViewState,
  EditorMode,
  FlowDirection,
  ResizeHandle,
  DrawingLink,
  BoxSelectState,
  PanState,
  ClipboardState,
  ArrowType
} from './types'

const GRID_SIZE = 20

// Minimal initial state for flowchart
const initialState: GraphState = {
  nodes: [
    { id: 'Start', type: 'stadium', x: 150, y: 100, label: '开始' },
    { id: 'Process', type: 'rect', x: 150, y: 200, label: '流程' },
    { id: 'End', type: 'stadium', x: 150, y: 300, label: '结束' },
  ],
  links: [
    { source: 'Start', target: 'Process', id: 'link1', type: 'solid', arrow: 'forward' },
    { source: 'Process', target: 'End', id: 'link2', type: 'solid', arrow: 'forward' },
  ],
  swimlanes: []
}

export default function App() {
  const { t } = useI18n()

  // User management state
  const [currentUser, setCurrentUserState] = useState<string | null>(() => getCurrentUser())
  const [currentDiagramId, setCurrentDiagramIdState] = useState<string | null>(null)
  const [currentDiagramName, setCurrentDiagramName] = useState<string | null>(null)
  const [showDiagramList, setShowDiagramList] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const isCurrentUserAdmin = currentUser ? isAdmin(currentUser) : false

  // Core state with undo/redo
  const [
    graphState, setGraphState, undoFlow, redoFlow, canUndoFlow, canRedoFlow,
    replaceGraphState, beginGraph, commitGraph, resetGraph
  ] = useUndoRedo<GraphState>(() => initialState)
  const { nodes, links, swimlanes } = graphState

  // UI state
  const [selection, setSelection] = useState<Selection | null>(null)
  const [multiSelect, setMultiSelect] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<EditorMode>('select')
  const [direction, setDirection] = useState<FlowDirection>('TD')
  const [editorView, setEditorView] = useState<ViewState>({ x: 0, y: 0, scale: 1 })
  const [previewView, setPreviewView] = useState<ViewState>({ x: 0, y: 0, scale: 1 })
  const [activeDiagramType, setActiveDiagramType] = useState<string>('flowchart')
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-sidebar-width')
    return saved ? parseInt(saved, 10) : 384 // Default 384px (w-96)
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-sidebar-collapsed')
    return saved === 'true'
  })
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }))
  const userPinnedOpenRef = useRef(false)
  const prevCompactRef = useRef<boolean | null>(null)
  const isPhone = viewportSize.width < 640
  const isCompact = viewportSize.width <= 1024
  const overlaySidebar = isCompact
  const maxSidebarWidth = Math.min(600, Math.max(240, Math.round(viewportSize.width * 0.45)))
  const effectiveSidebarWidth = Math.max(240, Math.min(sidebarWidth, maxSidebarWidth))
  const phoneDrawerMin = Math.round(viewportSize.height * 0.36)
  const phoneDrawerMax = Math.round(viewportSize.height * 0.92)
  const [phoneDrawerHeight, setPhoneDrawerHeight] = useState(() => {
    const saved = window.localStorage.getItem('mermaid-editor-phone-drawer-height')
    const fallback = Math.round(window.innerHeight * 0.72)
    const parsed = saved ? parseInt(saved, 10) : fallback
    const minH = Math.round(window.innerHeight * 0.36)
    const maxH = Math.round(window.innerHeight * 0.92)
    return Math.max(minH, Math.min(maxH, parsed || fallback))
  })

  // Plugin-specific states (same undo stack shape as flowchart)
  const [
    stateState, setStateState, undoState, redoState, canUndoState, canRedoState,
    replaceStateState, beginState, commitState, resetState
  ] = useUndoRedo<StateDiagramState>(createInitialStateDiagramState)
  const [
    classState, setClassState, undoClass, redoClass, canUndoClass, canRedoClass,
    replaceClassState, beginClass, commitClass, resetClass
  ] = useUndoRedo<ClassDiagramState>(createInitialClassDiagramState)
  const [
    erState, setERState, undoER, redoER, canUndoER, canRedoER,
    replaceERState, beginER, commitER, resetER
  ] = useUndoRedo<ERDiagramState>(createInitialERDiagramState)
  const [
    sequenceState, setSequenceState, undoSeq, redoSeq, canUndoSeq, canRedoSeq,
    , beginSeq, commitSeq, resetSeq
  ] = useUndoRedo<SequenceDiagramState>(createInitialSequenceDiagramState)

  const undo = useCallback(() => {
    if (activeDiagramType === 'flowchart') undoFlow()
    else if (activeDiagramType === 'state') undoState()
    else if (activeDiagramType === 'class') undoClass()
    else if (activeDiagramType === 'er') undoER()
    else if (activeDiagramType === 'sequence') undoSeq()
  }, [activeDiagramType, undoFlow, undoState, undoClass, undoER, undoSeq])

  const redo = useCallback(() => {
    if (activeDiagramType === 'flowchart') redoFlow()
    else if (activeDiagramType === 'state') redoState()
    else if (activeDiagramType === 'class') redoClass()
    else if (activeDiagramType === 'er') redoER()
    else if (activeDiagramType === 'sequence') redoSeq()
  }, [activeDiagramType, redoFlow, redoState, redoClass, redoER, redoSeq])

  const canUndo =
    activeDiagramType === 'flowchart' ? canUndoFlow
    : activeDiagramType === 'state' ? canUndoState
    : activeDiagramType === 'class' ? canUndoClass
    : activeDiagramType === 'er' ? canUndoER
    : canUndoSeq

  const canRedo =
    activeDiagramType === 'flowchart' ? canRedoFlow
    : activeDiagramType === 'state' ? canRedoState
    : activeDiagramType === 'class' ? canRedoClass
    : activeDiagramType === 'er' ? canRedoER
    : canRedoSeq

  const beginHistory = useCallback(() => {
    if (activeDiagramType === 'flowchart') beginGraph()
    else if (activeDiagramType === 'state') beginState()
    else if (activeDiagramType === 'class') beginClass()
    else if (activeDiagramType === 'er') beginER()
    else if (activeDiagramType === 'sequence') beginSeq()
  }, [activeDiagramType, beginGraph, beginState, beginClass, beginER, beginSeq])

  const commitHistory = useCallback(() => {
    if (activeDiagramType === 'flowchart') commitGraph()
    else if (activeDiagramType === 'state') commitState()
    else if (activeDiagramType === 'class') commitClass()
    else if (activeDiagramType === 'er') commitER()
    else if (activeDiagramType === 'sequence') commitSeq()
  }, [activeDiagramType, commitGraph, commitState, commitClass, commitER, commitSeq])

  // Get active plugin
  const activePlugin = useMemo(() => pluginRegistry.get(activeDiagramType), [activeDiagramType])

  // Interaction state
  const [dragState, setDragState] = useState<{
    nodeId: string
    startX: number
    startY: number
    initialNodeX: number
    initialNodeY: number
  } | null>(null)
  const [multiDragState, setMultiDragState] = useState<{
    nodeIds: Set<string>
    initialPositions: Map<string, { x: number; y: number }>
    startX: number
    startY: number
  } | null>(null)
  const [resizeState, setResizeState] = useState<{
    nodeId: string
    startX: number
    startY: number
    startW: number
    startH: number
    startNodeX: number
    startNodeY: number
    handle: ResizeHandle
  } | null>(null)
  const [multiResizeState, setMultiResizeState] = useState<{
    nodeIds: Set<string>
    initialData: Map<string, { x: number; y: number; width: number; height: number }>
    boundingBox: { x: number; y: number; width: number; height: number }
    startX: number
    startY: number
    handle: ResizeHandle
  } | null>(null)
  const [drawingLink, setDrawingLink] = useState<DrawingLink | null>(null)
  const [panState, setPanState] = useState<PanState | null>(null)
  const [boxSelect, setBoxSelect] = useState<BoxSelectState | null>(null)

  // Editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [tempLabel, setTempLabel] = useState('')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Code state
  const [generatedCode, setGeneratedCode] = useState('')
  const [isManualEditing, setIsManualEditing] = useState(false)
  const { mermaidRef, mermaidError, setMermaidError, renderDiagram } = useMermaidPreview()

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rAF = useRef<number | null>(null)
  const renderTimeoutRef = useRef<number | null>(null)
  const autoSaveTimeoutRef = useRef<number | null>(null)

  // ==================== User Management ====================
  
  // Handle user login (called after successful authentication in UserNameDialog)
  const handleUserLogin = useCallback((username: string) => {
    setCurrentUserState(username)
    
    // Check if user has a last diagram
    const lastDiagramId = getCurrentDiagramId()
    if (lastDiagramId) {
      const diagram = getDiagram(lastDiagramId)
      if (diagram) {
        // Use setTimeout to avoid calling loadDiagram before it's defined
        setTimeout(() => {
          setCurrentDiagramIdState(diagram.id)
          setCurrentDiagramId(diagram.id)
          setCurrentDiagramName(diagram.name)
          setActiveDiagramType(diagram.type)
          setDirection(diagram.direction)
          
          if (diagram.type === 'flowchart') {
            resetGraph(diagram.state || initialState)
          } else if (diagram.type === 'state') {
            resetState(diagram.state || createInitialStateDiagramState())
          } else if (diagram.type === 'class') {
            resetClass(diagram.state || createInitialClassDiagramState())
          } else if (diagram.type === 'er') {
            resetER(diagram.state || createInitialERDiagramState())
          } else if (diagram.type === 'sequence') {
            resetSeq(diagram.state || createInitialSequenceDiagramState())
          }
        }, 0)
        return
      }
    }
    
    // No last diagram, create a new one
    const plugin = pluginRegistry.get('flowchart')
    const newDiagram = createDiagram(
      '未命名图表',
      'flowchart',
      'TD',
      plugin?.createInitialState() || initialState
    )
    setCurrentDiagramIdState(newDiagram.id)
    setCurrentDiagramName(newDiagram.name)
    setCurrentDiagramId(newDiagram.id)
    if (plugin?.createInitialState) {
      resetGraph(plugin.createInitialState() as GraphState)
    }
  }, [resetGraph, resetState, resetClass, resetER, resetSeq])

  const saveCurrentDiagramRef = useRef<() => void>(() => {})

  // Handle user logout (switch user)
  const handleUserLogout = useCallback(() => {
    if (currentDiagramId) {
      saveCurrentDiagramRef.current()
    }
    clearCurrentUser()
    setCurrentUserState(null)
    setCurrentDiagramIdState(null)
    setCurrentDiagramName(null)
    resetGraph(initialState)
    resetState(createInitialStateDiagramState())
    resetClass(createInitialClassDiagramState())
    resetER(createInitialERDiagramState())
    resetSeq(createInitialSequenceDiagramState())
    setActiveDiagramType('flowchart')
    setDirection('TD')
  }, [currentDiagramId, resetGraph, resetState, resetClass, resetER, resetSeq])

  // Load a diagram from storage
  const loadDiagram = useCallback((diagram: DiagramRecord) => {
    setCurrentDiagramIdState(diagram.id)
    setCurrentDiagramId(diagram.id)
    setCurrentDiagramName(diagram.name)
    setActiveDiagramType(diagram.type)
    setDirection(diagram.direction)
    
    // Load state based on diagram type
    if (diagram.type === 'flowchart') {
      resetGraph(diagram.state || initialState)
    } else if (diagram.type === 'state') {
      resetState(diagram.state || createInitialStateDiagramState())
    } else if (diagram.type === 'class') {
      resetClass(diagram.state || createInitialClassDiagramState())
    } else if (diagram.type === 'er') {
      resetER(diagram.state || createInitialERDiagramState())
    } else if (diagram.type === 'sequence') {
      resetSeq(diagram.state || createInitialSequenceDiagramState())
    }
    
    // Reset view and leave code-edit mode so the new diagram's source is shown
    setIsManualEditing(false)
    setMermaidError(null)
    setMode('select')
    setEditorView({ x: 0, y: 0, scale: 1 })
    setPreviewView({ x: 0, y: 0, scale: 1 })
    setSelection(null)
    setMultiSelect(new Set())
  }, [resetGraph, resetState, resetClass, resetER, resetSeq])

  // Save current diagram to storage
  const saveCurrentDiagram = useCallback(() => {
    if (!currentDiagramId || !currentUser) return

    let state: any
    if (activeDiagramType === 'flowchart') {
      state = graphState
    } else if (activeDiagramType === 'state') {
      state = stateState
    } else if (activeDiagramType === 'class') {
      state = classState
    } else if (activeDiagramType === 'er') {
      state = erState
    } else if (activeDiagramType === 'sequence') {
      state = sequenceState
    }

    saveDiagram(currentDiagramId, {
      type: activeDiagramType as DiagramType,
      direction,
      state,
    })
  }, [currentDiagramId, currentUser, activeDiagramType, graphState, stateState, classState, erState, sequenceState, direction])
  saveCurrentDiagramRef.current = saveCurrentDiagram

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      saveCurrentDiagram()
    }, 2000) // Save after 2 seconds of inactivity
  }, [saveCurrentDiagram])

  // Handle creating a new diagram
  const handleCreateDiagram = useCallback((type: DiagramType) => {
    // Save current diagram first
    if (currentDiagramId) {
      saveCurrentDiagram()
    }

    const plugin = pluginRegistry.get(type)
    const typeNames: Record<DiagramType, string> = {
      flowchart: '流程图',
      state: '状态图',
      class: '类图',
      er: 'ER图',
      sequence: '时序图',
    }
    const newDiagram = createDiagram(
      `新建${typeNames[type]}`,
      type,
      plugin?.getDefaultDirection?.() || 'TD',
      plugin?.createInitialState()
    )
    loadDiagram(newDiagram)
    setShowDiagramList(false)
  }, [currentDiagramId, saveCurrentDiagram, loadDiagram])

  // Handle selecting a diagram from the list
  const handleSelectDiagram = useCallback((diagram: DiagramRecord) => {
    // Save current diagram first
    if (currentDiagramId && currentDiagramId !== diagram.id) {
      saveCurrentDiagram()
    }
    loadDiagram(diagram)
  }, [currentDiagramId, saveCurrentDiagram, loadDiagram])

  // Handle deleting a diagram
  const handleDeleteDiagram = useCallback((deletedId: string) => {
    if (deletedId !== currentDiagramId) return
    const remaining = listDiagrams()
    if (remaining.length > 0) {
      loadDiagram(remaining[0])
      return
    }
    const plugin = pluginRegistry.get('flowchart')
    const newDiagram = createDiagram(
      '未命名图表',
      'flowchart',
      'TD',
      plugin?.createInitialState() || initialState
    )
    loadDiagram(newDiagram)
  }, [currentDiagramId, loadDiagram])

  // Load user's last diagram on mount (if user is logged in)
  useEffect(() => {
    if (!currentUser) return
    const lastDiagramId = getCurrentDiagramId()
    if (lastDiagramId) {
      const diagram = getDiagram(lastDiagramId)
      if (diagram) {
        loadDiagram(diagram)
        return
      }
    }
    const plugin = pluginRegistry.get('flowchart')
    const newDiagram = createDiagram(
      '未命名图表',
      'flowchart',
      'TD',
      plugin?.createInitialState() || initialState
    )
    loadDiagram(newDiagram)
  }, []) // Only run on mount

  // Auto-save when state changes
  useEffect(() => {
    if (currentUser && currentDiagramId) {
      triggerAutoSave()
    }
  }, [graphState, stateState, classState, erState, sequenceState, direction, triggerAutoSave, currentUser, currentDiagramId])

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentDiagramId) {
        saveCurrentDiagram()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentDiagramId, saveCurrentDiagram])

  // Auto fit-to-view on initial load
  const [initialFitDone, setInitialFitDone] = useState(false)

  useEffect(() => {
    if (initialFitDone) return

    // Small delay to ensure container is rendered
    const timer = setTimeout(() => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        // Calculate fit-to-view based on current diagram type
        if (activeDiagramType === 'flowchart') {
          const bounds = calculateFlowchartBounds(nodes, swimlanes)
          const newView = calculateFitToView(bounds, rect.width, rect.height)
          setEditorView(newView)
        } else if (activeDiagramType === 'state') {
          const bounds = calculateItemsBounds(stateState.states, getStateNodeSize)
          const newView = calculateFitToView(bounds, rect.width, rect.height)
          setEditorView(newView)
        } else if (activeDiagramType === 'class') {
          const bounds = calculateItemsBounds(classState.classes, getClassSize)
          const newView = calculateFitToView(bounds, rect.width, rect.height)
          setEditorView(newView)
        } else if (activeDiagramType === 'er') {
          const bounds = calculateItemsBounds(erState.entities, getEntitySize)
          const newView = calculateFitToView(bounds, rect.width, rect.height)
          setEditorView(newView)
        } else if (activeDiagramType === 'sequence') {
          const bounds = getSequenceBounds(sequenceState)
          const newView = calculateFitToView(bounds, rect.width, rect.height)
          setEditorView(newView)
        }
        setInitialFitDone(true)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [initialFitDone, activeDiagramType, nodes, swimlanes, stateState.states, classState.classes, erState.entities, sequenceState])

  // Reset fit done flag when diagram type changes
  useEffect(() => {
    setInitialFitDone(false)
  }, [activeDiagramType])

  // Update node/link setters
  const setNodes = useCallback((nodesOrFn: GraphNode[] | ((prev: GraphNode[]) => GraphNode[])) => {
    setGraphState(prev => ({
      ...prev,
      nodes: typeof nodesOrFn === 'function' ? nodesOrFn(prev.nodes) : nodesOrFn
    }))
  }, [setGraphState])

  const setLinks = useCallback((linksOrFn: GraphLink[] | ((prev: GraphLink[]) => GraphLink[])) => {
    setGraphState(prev => ({
      ...prev,
      links: typeof linksOrFn === 'function' ? linksOrFn(prev.links) : linksOrFn
    }))
  }, [setGraphState])

  const setSwimlanes = useCallback((swimlanesOrFn: Swimlane[] | ((prev: Swimlane[]) => Swimlane[])) => {
    setGraphState(prev => ({
      ...prev,
      swimlanes: typeof swimlanesOrFn === 'function' ? swimlanesOrFn(prev.swimlanes) : swimlanesOrFn
    }))
  }, [setGraphState])

  const setGraph = useCallback((newNodes: GraphNode[], newLinks: GraphLink[], newSwimlanes?: Swimlane[]) => {
    setGraphState(prev => ({
      nodes: newNodes,
      links: newLinks,
      swimlanes: newSwimlanes ?? prev.swimlanes
    }))
  }, [setGraphState])

  // Update code when graph changes
  useEffect(() => {
    if (!isManualEditing && !dragState) {
      let code: string

      // Generate code based on active diagram type
      if (activeDiagramType === 'flowchart') {
        code = generateMermaidCode(nodes, links, direction, swimlanes)
      } else if (activePlugin) {
        const currentState = activeDiagramType === 'state' ? stateState
          : activeDiagramType === 'class' ? classState
          : activeDiagramType === 'er' ? erState
          : activeDiagramType === 'sequence' ? sequenceState
          : null
        if (currentState) {
          code = activePlugin.toMermaid(currentState, direction)
        } else {
          code = ''
        }
      } else {
        code = ''
      }

      setGeneratedCode(code)

      if (renderTimeoutRef.current) {
        window.clearTimeout(renderTimeoutRef.current)
      }
      if (!sidebarCollapsed) {
        renderTimeoutRef.current = window.setTimeout(() => {
          renderDiagram(code)
        }, 300)
      }
    }

    return () => {
      if (renderTimeoutRef.current) {
        window.clearTimeout(renderTimeoutRef.current)
      }
    }
  }, [nodes, links, direction, isManualEditing, dragState, renderDiagram, activeDiagramType, activePlugin, stateState, classState, erState, sequenceState, sidebarCollapsed])

  // Delete selection
  const deleteSelection = useCallback(() => {
    // Handle flowchart deletion
    if (activeDiagramType === 'flowchart') {
      if (multiSelect.size > 0) {
        const nodeIdsToDelete = Array.from(multiSelect)
        const newNodes = nodes.filter(n => !nodeIdsToDelete.includes(n.id))
        const newLinks = links.filter(l => !nodeIdsToDelete.includes(l.source) && !nodeIdsToDelete.includes(l.target))
        setGraph(newNodes, newLinks)
        setMultiSelect(new Set())
        setSelection(null)
        return
      }

      if (!selection) return

      if (selection.type === 'node') {
        const nodeId = selection.id
        const newNodes = nodes.filter(n => n.id !== nodeId)
        const newLinks = links.filter(l => l.source !== nodeId && l.target !== nodeId)
        setGraph(newNodes, newLinks)
      } else if (selection.type === 'swimlane') {
        const swimlaneId = selection.id
        // Remove swimlane and unassign nodes from it (clear both swimlaneId and laneId)
        // Use setGraphState directly to update both in a single operation
        setGraphState(prev => ({
          ...prev,
          swimlanes: prev.swimlanes.filter(s => s.id !== swimlaneId),
          nodes: prev.nodes.map(n =>
            n.swimlaneId === swimlaneId
              ? { ...n, swimlaneId: undefined, laneId: undefined }
              : n
          )
        }))
      } else {
        const newLinks = links.filter(l => l.id !== selection.id)
        setLinks(newLinks)
      }

      setSelection(null)
      return
    }

    // Handle other diagram types via plugin
    if (!selection || !activePlugin?.deleteSelection) return

    if (activeDiagramType === 'state') {
      const newState = activePlugin.deleteSelection(stateState, selection)
      setStateState(newState as StateDiagramState)
    } else if (activeDiagramType === 'class') {
      const newState = activePlugin.deleteSelection(classState, selection)
      setClassState(newState as ClassDiagramState)
    } else if (activeDiagramType === 'er') {
      const newState = activePlugin.deleteSelection(erState, selection)
      setERState(newState as ERDiagramState)
    } else if (activeDiagramType === 'sequence') {
      const newState = activePlugin.deleteSelection(sequenceState, selection)
      setSequenceState(newState as SequenceDiagramState)
    }

    setSelection(null)
    setMultiSelect(new Set())
  }, [selection, multiSelect, nodes, links, swimlanes, setGraph, setGraphState, setLinks, setNodes, setSwimlanes, activeDiagramType, activePlugin, stateState, classState, erState, sequenceState])

  useKeyboardShortcuts({
    editingNodeId,
    editingLinkId,
    undo,
    redo,
    selection,
    nodes,
    links,
    clipboard,
    setClipboard,
    setNodes,
    setSelection,
    setMultiSelect,
    setBoxSelect,
    deleteSelection,
    multiSelect,
    drawingLink,
    onDrawingLinkCancel: () => setDrawingLink(null),
    copySelection: () => {
      if (!selection) return
      if (activeDiagramType === 'flowchart') {
        if (selection.type === 'node') {
          const node = nodes.find(n => n.id === selection.id)
          if (node) setClipboard({ type: 'node', data: { ...node } })
        } else if (selection.type === 'link') {
          const link = links.find(l => l.id === selection.id)
          if (link) setClipboard({ type: 'link', data: { ...link } })
        }
        return
      }
      if (activeDiagramType === 'state' && selection.type === 'state') {
        const item = stateState.states.find(s => s.id === selection.id)
        if (item) setClipboard({ type: 'node', data: { ...item } as unknown as GraphNode })
      } else if (activeDiagramType === 'class' && selection.type === 'class') {
        const item = classState.classes.find(c => c.id === selection.id)
        if (item) setClipboard({ type: 'node', data: { ...item } as unknown as GraphNode })
      } else if (activeDiagramType === 'er' && selection.type === 'entity') {
        const item = erState.entities.find(e => e.id === selection.id)
        if (item) setClipboard({ type: 'node', data: { ...item } as unknown as GraphNode })
      } else if (activeDiagramType === 'sequence' && selection.type === 'participant') {
        const item = sequenceState.participants.find(p => p.id === selection.id)
        if (item) setClipboard({ type: 'node', data: { ...item } as unknown as GraphNode })
      }
    },
    pasteClipboard: () => {
      if (!clipboard || clipboard.type !== 'node') return
      const id = `${activeDiagramType}_${Date.now()}`
      if (activeDiagramType === 'flowchart') {
        const nodeData = clipboard.data as GraphNode
        const newNode: GraphNode = { ...nodeData, id, x: nodeData.x + 50, y: nodeData.y + 50 }
        setNodes([...nodes, newNode])
        setSelection({ type: 'node', id })
      } else if (activeDiagramType === 'state') {
        const item = clipboard.data as unknown as StateNode
        setStateState(prev => ({ ...prev, states: [...prev.states, { ...item, id, x: item.x + 50, y: item.y + 50 }] }))
        setSelection({ type: 'state', id })
      } else if (activeDiagramType === 'class') {
        const item = clipboard.data as unknown as ClassNode
        setClassState(prev => ({ ...prev, classes: [...prev.classes, { ...item, id, x: item.x + 50, y: item.y + 50 }] }))
        setSelection({ type: 'class', id })
      } else if (activeDiagramType === 'er') {
        const item = clipboard.data as unknown as Entity
        setERState(prev => ({ ...prev, entities: [...prev.entities, { ...item, id, x: item.x + 50, y: item.y + 50 }] }))
        setSelection({ type: 'entity', id })
      } else if (activeDiagramType === 'sequence') {
        const item = clipboard.data as unknown as { name: string; type: 'participant' | 'actor' }
        const maxOrder = Math.max(...sequenceState.participants.map(p => p.order), -1)
        setSequenceState(prev => ({
          ...prev,
          participants: [...prev.participants, { id, name: `${item.name} copy`, type: item.type, order: maxOrder + 1 }]
        }))
        setSelection({ type: 'participant', id })
      }
    },
    selectAll: () => {
      if (activeDiagramType === 'flowchart') {
        setMultiSelect(new Set(nodes.map(n => n.id)))
      } else if (activeDiagramType === 'state') {
        setMultiSelect(new Set(stateState.states.map(s => s.id)))
      } else if (activeDiagramType === 'class') {
        setMultiSelect(new Set(classState.classes.map(c => c.id)))
      } else if (activeDiagramType === 'er') {
        setMultiSelect(new Set(erState.entities.map(e => e.id)))
      } else if (activeDiagramType === 'sequence') {
        setMultiSelect(new Set(sequenceState.participants.map(p => p.id)))
      }
      setSelection(null)
    }
  })

  // Use flowchart drag handlers only when flowchart is active
  useGlobalPointerHandlers({
    dragState: activeDiagramType === 'flowchart' ? dragState : null,
    setDragState,
    multiDragState: activeDiagramType === 'flowchart' ? multiDragState : null,
    setMultiDragState,
    resizeState: activeDiagramType === 'flowchart' ? resizeState : null,
    setResizeState,
    multiResizeState: activeDiagramType === 'flowchart' ? multiResizeState : null,
    setMultiResizeState,
    panState: activeDiagramType === 'flowchart' ? panState : null,
    setPanState,
    boxSelect: activeDiagramType === 'flowchart' ? boxSelect : null,
    setBoxSelect,
    nodes,
    graphState,
    setGraphState,
    replaceGraphState,
    commitGraphHistory: commitGraph,
    editorView,
    setEditorView,
    setPreviewView,
    snapToGrid,
    GRID_SIZE,
    rAF,
    setMultiSelect,
    setSelection
  })

  // Unified callbacks for all non-flowchart diagram types
  const getNodesForType = useCallback((type: string): Array<{ id: string; x: number; y: number; [key: string]: any }> => {
    switch (type) {
      case 'state':
        return stateState.states
      case 'class':
        return classState.classes
      case 'er':
        return erState.entities
      default:
        return []
    }
  }, [stateState.states, classState.classes, erState.entities])

  const updateNodesForType = useCallback((type: string, updatedNodes: Array<{ id: string; x: number; y: number; [key: string]: any }>) => {
    switch (type) {
      case 'state':
        replaceStateState(prev => ({ ...prev, states: updatedNodes as StateNode[] }))
        break
      case 'class':
        replaceClassState(prev => ({ ...prev, classes: updatedNodes as ClassNode[] }))
        break
      case 'er':
        replaceERState(prev => ({ ...prev, entities: updatedNodes as Entity[] }))
        break
    }
  }, [replaceStateState, replaceClassState, replaceERState])

  const getNodeSizeForType = useCallback((type: string, node: any): { width: number; height: number } => {
    switch (type) {
      case 'state':
        return getStateNodeSize(node)
      case 'class':
        return getClassSize(node)
      case 'er':
        return getEntitySize(node)
      default:
        return { width: 100, height: 50 }
    }
  }, [])

  // Use unified drag handlers for all non-flowchart diagram types
  useUnifiedDragHandlers({
    activeDiagramType: activeDiagramType === 'flowchart' ? '' : activeDiagramType,
    dragState: activeDiagramType !== 'flowchart' ? dragState : null,
    setDragState,
    multiDragState: activeDiagramType !== 'flowchart' ? multiDragState : null,
    setMultiDragState,
    resizeState: activeDiagramType !== 'flowchart' ? resizeState : null,
    setResizeState,
    multiResizeState: activeDiagramType !== 'flowchart' ? multiResizeState : null,
    setMultiResizeState,
    panState: activeDiagramType !== 'flowchart' ? panState : null,
    setPanState,
    boxSelect: activeDiagramType !== 'flowchart' ? boxSelect : null,
    setBoxSelect,
    editorView,
    setEditorView,
    setPreviewView,
    snapToGrid,
    gridSize: GRID_SIZE,
    rAF,
    setMultiSelect,
    getNodesForType,
    updateNodesForType,
    getNodeSizeForType,
    commitHistory
  })

  const finishEditing = useCallback(() => {
    if (editingNodeId) {
      if (activeDiagramType === 'flowchart') {
        setNodes(nodes.map(n => n.id === editingNodeId ? { ...n, label: tempLabel } : n))
      } else if (activeDiagramType === 'state') {
        setStateState(prev => ({
          ...prev,
          states: prev.states.map(s => s.id === editingNodeId ? { ...s, name: tempLabel } : s)
        }))
      } else if (activeDiagramType === 'class') {
        setClassState(prev => ({
          ...prev,
          classes: prev.classes.map(c => c.id === editingNodeId ? { ...c, name: tempLabel } : c)
        }))
      } else if (activeDiagramType === 'er') {
        setERState(prev => ({
          ...prev,
          entities: prev.entities.map(e => e.id === editingNodeId ? { ...e, name: tempLabel } : e)
        }))
      } else if (activeDiagramType === 'sequence') {
        setSequenceState(prev => ({
          ...prev,
          participants: prev.participants.map(p => p.id === editingNodeId ? { ...p, name: tempLabel } : p)
        }))
      }
      setEditingNodeId(null)
    }
    if (editingLinkId) {
      if (activeDiagramType === 'flowchart') {
        setLinks(links.map(l => l.id === editingLinkId ? { ...l, label: tempLabel } : l))
      } else if (activeDiagramType === 'state') {
        setStateState(prev => ({
          ...prev,
          transitions: prev.transitions.map(t => t.id === editingLinkId ? { ...t, label: tempLabel } : t)
        }))
      } else if (activeDiagramType === 'class') {
        setClassState(prev => ({
          ...prev,
          relationships: prev.relationships.map(r => r.id === editingLinkId ? { ...r, label: tempLabel } : r)
        }))
      } else if (activeDiagramType === 'er') {
        setERState(prev => ({
          ...prev,
          relationships: prev.relationships.map(r => r.id === editingLinkId ? { ...r, label: tempLabel } : r)
        }))
      } else if (activeDiagramType === 'sequence') {
        setSequenceState(prev => ({
          ...prev,
          messages: prev.messages.map(m => m.id === editingLinkId ? { ...m, text: tempLabel } : m)
        }))
      }
      setEditingLinkId(null)
    }
  }, [editingNodeId, editingLinkId, tempLabel, nodes, links, setNodes, setLinks, activeDiagramType])

  // Add node - handles all diagram types
  const handleAddNode = useCallback((type: string) => {
    const x = 50 - editorView.x / editorView.scale
    const y = 50 - editorView.y / editorView.scale

    // Flowchart nodes and swimlanes
    if (activeDiagramType === 'flowchart') {
      // Handle swimlane creation
      if (type === 'swimlane') {
        const id = `swimlane${Date.now()}`
        const newSwimlane: Swimlane = {
          id,
          name: `泳道 ${swimlanes.length + 1}`,
          x,
          y,
          width: 600,
          height: 400,
          orientation: 'vertical', // Default to vertical (columns)
          lanes: [
            { id: `lane_${Date.now()}_1`, name: '泳道 1' },
            { id: `lane_${Date.now()}_2`, name: '泳道 2' },
            { id: `lane_${Date.now()}_3`, name: '泳道 3' },
          ],
          color: '#f0f9ff' // Light blue
        }
        setSwimlanes(prev => [...prev, newSwimlane])
        setSelection({ type: 'swimlane', id })
        return
      }

      // Handle regular node creation
      const id = `Node${Date.now()}`
      const labels: Record<string, string> = {
        rect: t('flowchart.labels.rect'),
        round: t('flowchart.labels.round'),
        stadium: t('flowchart.labels.stadium'),
        subroutine: t('flowchart.labels.subroutine'),
        database: t('flowchart.labels.database'),
        circle: t('flowchart.labels.circle'),
        rhombus: t('flowchart.labels.rhombus'),
        hexagon: t('flowchart.labels.hexagon'),
        parallelogram: t('flowchart.labels.parallelogram'),
        flag: t('flowchart.labels.flag'),
        trapezoid: t('flowchart.labels.trapezoid'),
        trapezoid_alt: t('flowchart.labels.trapezoidAlt'),
        double_circle: t('flowchart.labels.doubleCircle'),
        parallelogram_alt: t('flowchart.labels.parallelogramAlt')
      }
      setNodes(prev => [...prev, { id, type: type as GraphNode['type'], x, y, label: labels[type] || t('flowchart.labels.rect') }])
      return
    }

    // State diagram nodes
    if (activeDiagramType === 'state') {
      const id = `s${Date.now()}`
      const newState: StateNode = {
        id,
        type: type as StateNode['type'],
        name: type === 'state' ? t('stateDiagram.labels.newState') : '',
        x,
        y
      }
      setStateState(prev => ({
        ...prev,
        states: [...prev.states, newState]
      }))
      return
    }

    // Class diagram nodes
    if (activeDiagramType === 'class') {
      const id = `c${Date.now()}`
      const stereotypeMap: Record<string, ClassNode['stereotype']> = {
        class: 'none',
        interface: 'interface',
        abstract: 'abstract',
        enum: 'enum'
      }
      const newClass: ClassNode = {
        id,
        name: `New${type.charAt(0).toUpperCase() + type.slice(1)}`,
        stereotype: stereotypeMap[type] || 'none',
        attributes: [],
        methods: [],
        x,
        y
      }
      setClassState(prev => ({
        ...prev,
        classes: [...prev.classes, newClass]
      }))
      return
    }

    // ER diagram nodes
    if (activeDiagramType === 'er') {
      const id = `e${Date.now()}`
      const newEntity: Entity = {
        id,
        name: 'NewEntity',
        attributes: [],
        x,
        y
      }
      setERState(prev => ({
        ...prev,
        entities: [...prev.entities, newEntity]
      }))
      return
    }

    // Sequence diagram nodes
    if (activeDiagramType === 'sequence') {
      if (type === 'participant' || type === 'actor') {
        const maxOrder = Math.max(...sequenceState.participants.map(p => p.order), -1)
        const id = `p${Date.now()}`
        const newParticipant = {
          id,
          name: type === 'actor' ? `Actor${maxOrder + 2}` : `Participant${maxOrder + 2}`,
          type: type as 'participant' | 'actor',
          order: maxOrder + 1
        }
        setSequenceState(prev => ({
          ...prev,
          participants: [...prev.participants, newParticipant]
        }))
      } else if (type === 'message') {
        if (sequenceState.participants.length < 2) return
        const maxOrder = Math.max(...sequenceState.messages.map(m => m.order), -1)
        const newMessage = {
          id: `m${Date.now()}`,
          from: sequenceState.participants[0].id,
          to: sequenceState.participants[1].id,
          text: 'New message',
          type: 'solid' as const,
          order: maxOrder + 1
        }
        setSequenceState(prev => ({
          ...prev,
          messages: [...prev.messages, newMessage]
        }))
      }
    }
  }, [nodes, swimlanes, editorView, setNodes, setSwimlanes, t, activeDiagramType, sequenceState])

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    if (activeDiagramType === 'flowchart') {
      const layoutedNodes = applyAutoLayout(nodes, links, direction, swimlanes)
      setNodes(layoutedNodes)
    } else if (activePlugin?.autoLayout) {
      if (activeDiagramType === 'state') {
        const newState = activePlugin.autoLayout(stateState, direction)
        setStateState(newState as StateDiagramState)
      } else if (activeDiagramType === 'class') {
        const newState = activePlugin.autoLayout(classState, direction)
        setClassState(newState as ClassDiagramState)
      } else if (activeDiagramType === 'er') {
        const newState = activePlugin.autoLayout(erState, direction)
        setERState(newState as ERDiagramState)
      } else if (activeDiagramType === 'sequence') {
        const newState = activePlugin.autoLayout(sequenceState, direction)
        setSequenceState(newState as SequenceDiagramState)
      }
    }
    setEditorView({ x: 0, y: 0, scale: 1 })
  }, [nodes, links, direction, swimlanes, setNodes, activeDiagramType, activePlugin, stateState, classState, erState, sequenceState])

  // Toggle direction - cycle through TD -> LR -> BT -> RL -> TD
  const handleDirectionToggle = useCallback(() => {
    const directionOrder: FlowDirection[] = ['TD', 'LR', 'BT', 'RL']
    const currentIndex = directionOrder.indexOf(direction)
    const newDir = directionOrder[(currentIndex + 1) % directionOrder.length]
    setDirection(newDir)

    if (activeDiagramType === 'flowchart') {
      const layoutedNodes = applyAutoLayout(nodes, links, newDir, swimlanes)
      setNodes(layoutedNodes)
    } else if (activePlugin?.autoLayout) {
      if (activeDiagramType === 'state') {
        const newState = activePlugin.autoLayout(stateState, newDir)
        setStateState(newState as StateDiagramState)
      } else if (activeDiagramType === 'class') {
        const newState = activePlugin.autoLayout(classState, newDir)
        setClassState(newState as ClassDiagramState)
      } else if (activeDiagramType === 'er') {
        const newState = activePlugin.autoLayout(erState, newDir)
        setERState(newState as ERDiagramState)
      } else if (activeDiagramType === 'sequence') {
        const newState = activePlugin.autoLayout(sequenceState, newDir)
        setSequenceState(newState as SequenceDiagramState)
      }
    }
    setEditorView({ x: 0, y: 0, scale: 1 })
  }, [direction, nodes, links, swimlanes, setNodes, activeDiagramType, activePlugin, stateState, classState, erState, sequenceState])

  // Typing only updates preview. Canvas is written on blur if the parse is usable.
  const applyCodeToCanvas = useCallback((newCode: string): boolean => {
    if (activeDiagramType === 'flowchart') {
      try {
        const result = parseMermaidCode(newCode, nodes, direction)
        if (!result) return false
        if (!shouldApplyParsedState(result.nodes.length, nodes.length)) return false
        const layoutedNodes = result.nodes.length > 3 ? applyAutoLayout(result.nodes, result.links, result.direction, []) : result.nodes
        setDirection(result.direction)
        setGraph(layoutedNodes, result.links)
        return true
      } catch (err) {
        console.error('Mermaid Parsing Error:', err)
        return false
      }
    }
    if (!activePlugin) return false
    try {
      const currentState = activeDiagramType === 'state' ? stateState
        : activeDiagramType === 'class' ? classState
        : activeDiagramType === 'er' ? erState
        : activeDiagramType === 'sequence' ? sequenceState
        : null
      const result = activePlugin.fromMermaid(newCode, currentState, direction)
      if (!result.success || !result.state) return false
      const parsedCount = countDiagramElements(activeDiagramType, result.state)
      const currentCount = countDiagramElements(activeDiagramType, currentState)
      if (!shouldApplyParsedState(parsedCount, currentCount)) return false
      if (result.direction) setDirection(result.direction)
      if (activeDiagramType === 'state') setStateState(result.state as StateDiagramState)
      else if (activeDiagramType === 'class') setClassState(result.state as ClassDiagramState)
      else if (activeDiagramType === 'er') setERState(result.state as ERDiagramState)
      else if (activeDiagramType === 'sequence') setSequenceState(result.state as SequenceDiagramState)
      return true
    } catch (err) {
      console.error('Mermaid Parsing Error:', err)
      return false
    }
  }, [nodes, direction, setGraph, activeDiagramType, activePlugin, stateState, classState, erState, sequenceState])

  const applyHostSource = useCallback((code: string) => {
    const type = detectDiagramType(code)
    const plugin = pluginRegistry.get(type)
    const typeNames: Record<string, string> = {
      flowchart: '流程图',
      state: '状态图',
      class: '类图',
      er: 'ER图',
      sequence: '时序图',
    }
    if (type !== activeDiagramType || !currentDiagramId) {
      const newDiagram = createDiagram(
        `来自对话的${typeNames[type] || type}`,
        type,
        plugin?.getDefaultDirection?.() || 'TD',
        plugin?.createInitialState()
      )
      loadDiagram(newDiagram)
    }

    setGeneratedCode(code)
    setIsManualEditing(false)

    if (type === 'flowchart') {
      try {
        const result = parseMermaidCode(code, [], 'TD')
        if (result && result.nodes.length > 0) {
          const layoutedNodes = result.nodes.length > 3
            ? applyAutoLayout(result.nodes, result.links, result.direction, [])
            : result.nodes
          setDirection(result.direction)
          setGraph(layoutedNodes, result.links)
        }
      } catch (err) {
        console.error('Host mermaid parse error:', err)
      }
    } else if (plugin) {
      try {
        const result = plugin.fromMermaid(code, plugin.createInitialState(), plugin.getDefaultDirection?.() || 'TD')
        if (result.success && result.state) {
          if (result.direction) setDirection(result.direction)
          if (type === 'state') setStateState(result.state as StateDiagramState)
          else if (type === 'class') setClassState(result.state as ClassDiagramState)
          else if (type === 'er') setERState(result.state as ERDiagramState)
          else if (type === 'sequence') setSequenceState(result.state as SequenceDiagramState)
        }
      } catch (err) {
        console.error('Host mermaid parse error:', err)
      }
    }
  }, [
    activeDiagramType,
    currentDiagramId,
    loadDiagram,
    setGraph,
    setStateState,
    setClassState,
    setERState,
    setSequenceState,
  ])

  useHostEmbedBridge({
    generatedCode,
    mermaidRef,
    applySource: applyHostSource,
  })

  const handleCodeChange = useCallback((newCode: string) => {
    setGeneratedCode(newCode)
    setIsManualEditing(true)
    renderDiagram(newCode)
  }, [renderDiagram])

  const handleCodeBlur = useCallback(() => {
    applyCodeToCanvas(generatedCode)
    setIsManualEditing(false)
  }, [applyCodeToCanvas, generatedCode])

  useEffect(() => {
    if (!isManualEditing) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('textarea') || target?.closest('.npm__react-simple-code-editor')) return
      handleCodeBlur()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [isManualEditing, handleCodeBlur])

  // Handle diagram type change: persist the current document first, then
  // open a new document of the target type so autosave cannot overwrite
  // the previous diagram's graph with a different type's state.
  const handleDiagramTypeChange = useCallback((newType: string) => {
    if (newType === activeDiagramType) return
    if (currentDiagramId) {
      saveCurrentDiagram()
    }

    const plugin = pluginRegistry.get(newType)
    const typeNames: Record<string, string> = {
      flowchart: '流程图',
      state: '状态图',
      class: '类图',
      er: 'ER图',
      sequence: '时序图',
    }
    const newDiagram = createDiagram(
      `新建${typeNames[newType] || newType}`,
      newType as DiagramType,
      plugin?.getDefaultDirection?.() || 'TD',
      plugin?.createInitialState()
    )
    loadDiagram(newDiagram)
  }, [activeDiagramType, currentDiagramId, saveCurrentDiagram, loadDiagram])

  // Compact viewports auto-collapse the sidebar unless the user pinned it open.
  useEffect(() => {
    const apply = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setViewportSize({ width, height })
      const compact = width <= 1024
      if (compact && !userPinnedOpenRef.current) {
        setSidebarCollapsed(true)
      }
      if (!compact && prevCompactRef.current) {
        userPinnedOpenRef.current = false
        const saved = window.localStorage.getItem('mermaid-editor-sidebar-collapsed')
        setSidebarCollapsed(saved === 'true')
      }
      prevCompactRef.current = compact
      if (width < 640) {
        const minH = Math.round(height * 0.36)
        const maxH = Math.round(height * 0.92)
        setPhoneDrawerHeight(h => Math.max(minH, Math.min(maxH, h)))
      }
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])

  // Sidebar resize handler
  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth(prev => {
      const newWidth = prev - delta // Negative because dragging right should decrease sidebar
      const clampedWidth = Math.max(240, Math.min(maxSidebarWidth, newWidth))
      window.localStorage.setItem('mermaid-editor-sidebar-width', String(clampedWidth))
      return clampedWidth
    })
  }, [maxSidebarWidth])

  const handlePhoneDrawerPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isPhone) return
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.stopPropagation()
    const pointerId = e.pointerId
    const startY = e.clientY
    const startH = phoneDrawerHeight
    const minH = phoneDrawerMin
    const maxH = phoneDrawerMax
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(pointerId)
    } catch {
      /* optional */
    }
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const next = Math.max(minH, Math.min(maxH, startH + (startY - ev.clientY)))
      setPhoneDrawerHeight(next)
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setPhoneDrawerHeight(h => {
        window.localStorage.setItem('mermaid-editor-phone-drawer-height', String(h))
        return h
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [isPhone, phoneDrawerHeight, phoneDrawerMin, phoneDrawerMax])

  // Sidebar collapse toggle
  const handleSidebarToggle = useCallback(() => {
    setIsFullscreen(false)
    setSidebarCollapsed(prev => {
      const newValue = !prev
      if (window.innerWidth <= 1024) {
        userPinnedOpenRef.current = !newValue
      }
      window.localStorage.setItem('mermaid-editor-sidebar-collapsed', String(newValue))
      return newValue
    })
  }, [])

  useEffect(() => {
    if (sidebarCollapsed || !overlaySidebar) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isFullscreen) setIsFullscreen(false)
      else handleSidebarToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarCollapsed, overlaySidebar, isFullscreen, handleSidebarToggle])

  // Label change
  const handleLabelChange = useCallback((value: string) => {
    if (selection?.type === 'node') {
      setNodes(nodes.map(n => n.id === selection.id ? { ...n, label: value } : n))
    }
    if (selection?.type === 'link') {
      setLinks(links.map(l => l.id === selection.id ? { ...l, label: value } : l))
    }
  }, [selection, nodes, links, setNodes, setLinks])

  // Link type change
  const handleLinkTypeChange = useCallback((type: 'solid' | 'dotted' | 'thick') => {
    if (selection?.type === 'link') {
      setLinks(links.map(l => l.id === selection.id ? { ...l, type } : l))
    }
  }, [selection, links, setLinks])

  // Link arrow change
  const handleLinkArrowChange = useCallback((arrow: ArrowType) => {
    if (selection?.type === 'link') {
      setLinks(links.map(l => l.id === selection.id ? { ...l, arrow } : l))
    }
  }, [selection, links, setLinks])

  // Align nodes
  const handleAlignNodes = useCallback((alignDirection: string) => {
    if (multiSelect.size === 0) return

    const selectedNodes = nodes.filter(n => multiSelect.has(n.id))
    if (selectedNodes.length < 2) return

    let newNodes = [...nodes]

    switch (alignDirection) {
      case 'left': {
        const minX = Math.min(...selectedNodes.map(n => n.x))
        newNodes = nodes.map(n => multiSelect.has(n.id) ? { ...n, x: minX } : n)
        break
      }
      case 'center': {
        const avgX = selectedNodes.reduce((sum, n) => sum + n.x + getNodeSize(n.type, n.label, n.customWidth, n.customHeight).width / 2, 0) / selectedNodes.length
        newNodes = nodes.map(n => multiSelect.has(n.id) ? { ...n, x: avgX - getNodeSize(n.type, n.label, n.customWidth, n.customHeight).width / 2 } : n)
        break
      }
      case 'right': {
        const maxRight = Math.max(...selectedNodes.map(n => n.x + getNodeSize(n.type, n.label, n.customWidth, n.customHeight).width))
        newNodes = nodes.map(n => multiSelect.has(n.id) ? { ...n, x: maxRight - getNodeSize(n.type, n.label, n.customWidth, n.customHeight).width } : n)
        break
      }
      case 'top': {
        const minY = Math.min(...selectedNodes.map(n => n.y))
        newNodes = nodes.map(n => multiSelect.has(n.id) ? { ...n, y: minY } : n)
        break
      }
      case 'middle': {
        const avgY = selectedNodes.reduce((sum, n) => sum + n.y + getNodeSize(n.type, n.label, n.customWidth, n.customHeight).height / 2, 0) / selectedNodes.length
        newNodes = nodes.map(n => multiSelect.has(n.id) ? { ...n, y: avgY - getNodeSize(n.type, n.label, n.customWidth, n.customHeight).height / 2 } : n)
        break
      }
      case 'bottom': {
        const maxBottom = Math.max(...selectedNodes.map(n => n.y + getNodeSize(n.type, n.label, n.customWidth, n.customHeight).height))
        newNodes = nodes.map(n => multiSelect.has(n.id) ? { ...n, y: maxBottom - getNodeSize(n.type, n.label, n.customWidth, n.customHeight).height } : n)
        break
      }
    }

    setNodes(newNodes)
  }, [multiSelect, nodes, setNodes])

  const handleDragStart = useCallback((nodeId: string, e: React.PointerEvent) => {
    beginHistory()
    let node: { id: string; x: number; y: number } | undefined

    if (activeDiagramType === 'flowchart') {
      node = nodes.find(n => n.id === nodeId)
    } else if (activeDiagramType === 'state') {
      node = stateState.states.find(s => s.id === nodeId)
    } else if (activeDiagramType === 'class') {
      node = classState.classes.find(c => c.id === nodeId)
    } else if (activeDiagramType === 'er') {
      node = erState.entities.find(e => e.id === nodeId)
    }

    if (!node) return
    setDragState({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initialNodeX: node.x,
      initialNodeY: node.y
    })
  }, [nodes, activeDiagramType, stateState, classState, erState, beginHistory])

  const handleMultiDragStart = useCallback((nodeIds: Set<string>, e: React.PointerEvent) => {
    beginHistory()
    const initialPositions = new Map<string, { x: number; y: number }>()

    if (activeDiagramType === 'flowchart') {
      nodeIds.forEach(itemId => {
        // Check if it's a node
        const n = nodes.find(nd => nd.id === itemId)
        if (n) {
          initialPositions.set(itemId, { x: n.x, y: n.y })
          return
        }
        // Check if it's a swimlane
        const s = graphState.swimlanes.find(sw => sw.id === itemId)
        if (s) {
          initialPositions.set(itemId, { x: s.x, y: s.y })
        }
      })
    } else if (activeDiagramType === 'state') {
      nodeIds.forEach(nodeId => {
        const n = stateState.states.find(s => s.id === nodeId)
        if (n) initialPositions.set(nodeId, { x: n.x, y: n.y })
      })
    } else if (activeDiagramType === 'class') {
      nodeIds.forEach(nodeId => {
        const n = classState.classes.find(c => c.id === nodeId)
        if (n) initialPositions.set(nodeId, { x: n.x, y: n.y })
      })
    } else if (activeDiagramType === 'er') {
      nodeIds.forEach(nodeId => {
        const n = erState.entities.find(ent => ent.id === nodeId)
        if (n) initialPositions.set(nodeId, { x: n.x, y: n.y })
      })
    }

    setMultiDragState({
      nodeIds: new Set(nodeIds),
      initialPositions,
      startX: e.clientX,
      startY: e.clientY
    })
  }, [nodes, graphState.swimlanes, activeDiagramType, stateState, classState, erState, beginHistory])

  const handleResizeStart = useCallback((e: React.PointerEvent, node: any, handle: ResizeHandle) => {
    beginHistory()
    e.stopPropagation()
    e.preventDefault()

    let currentSize: { width: number; height: number }

    if (activeDiagramType === 'flowchart') {
      currentSize = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    } else {
      currentSize = getNodeSizeForType(activeDiagramType, node)
    }

    setResizeState({
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      startW: node.customWidth || currentSize.width,
      startH: node.customHeight || currentSize.height,
      startNodeX: node.x,
      startNodeY: node.y,
      handle
    })
  }, [activeDiagramType, getNodeSizeForType, beginHistory])

  const handleMultiResizeStart = useCallback((nodeIds: Set<string>, e: React.PointerEvent, handle: ResizeHandle) => {
    beginHistory()
    e.stopPropagation()
    e.preventDefault()

    const initialData = new Map<string, { x: number; y: number; width: number; height: number }>()
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    const getNodesForType = () => {
      if (activeDiagramType === 'flowchart') return nodes
      if (activeDiagramType === 'state') return stateState.states
      if (activeDiagramType === 'class') return classState.classes
      if (activeDiagramType === 'er') return erState.entities
      return []
    }

    const allNodes = getNodesForType() as Array<{ id: string; x: number; y: number; customWidth?: number; customHeight?: number; [key: string]: any }>
    nodeIds.forEach(itemId => {
      // Check if it's a node
      const node = allNodes.find(n => n.id === itemId)
      if (node) {
        let size: { width: number; height: number }
        if (activeDiagramType === 'flowchart') {
          size = getNodeSize((node as any).type, (node as any).label, node.customWidth, node.customHeight)
        } else {
          size = getNodeSizeForType(activeDiagramType, node)
        }
        const width = node.customWidth || size.width
        const height = node.customHeight || size.height
        initialData.set(itemId, { x: node.x, y: node.y, width, height })

        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + width)
        maxY = Math.max(maxY, node.y + height)
        return
      }

      // Check if it's a swimlane (only in flowchart mode)
      if (activeDiagramType === 'flowchart') {
        const swimlane = graphState.swimlanes.find(s => s.id === itemId)
        if (swimlane) {
          initialData.set(itemId, { x: swimlane.x, y: swimlane.y, width: swimlane.width, height: swimlane.height })

          minX = Math.min(minX, swimlane.x)
          minY = Math.min(minY, swimlane.y)
          maxX = Math.max(maxX, swimlane.x + swimlane.width)
          maxY = Math.max(maxY, swimlane.y + swimlane.height)
        }
      }
    })

    setMultiResizeState({
      nodeIds: new Set(nodeIds),
      initialData,
      boundingBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      startX: e.clientX,
      startY: e.clientY,
      handle
    })
  }, [nodes, graphState.swimlanes, activeDiagramType, stateState, classState, erState, getNodeSizeForType, beginHistory])

  const handleDrawingLinkStart = useCallback((sourceId: string) => {
    let center: { x: number; y: number } | null = null

    if (activeDiagramType === 'flowchart') {
      const node = nodes.find(n => n.id === sourceId)
      if (node) center = getNodeCenter(node)
    } else if (activeDiagramType === 'state') {
      const state = stateState.states.find(s => s.id === sourceId)
      if (state) {
        const size = getStateNodeSize(state)
        center = { x: state.x + size.width / 2, y: state.y + size.height / 2 }
      }
    } else if (activeDiagramType === 'class') {
      const cls = classState.classes.find(c => c.id === sourceId)
      if (cls) {
        const size = getClassSize(cls)
        center = { x: cls.x + size.width / 2, y: cls.y + size.height / 2 }
      }
    } else if (activeDiagramType === 'er') {
      const entity = erState.entities.find(e => e.id === sourceId)
      if (entity) {
        const size = getEntitySize(entity)
        center = { x: entity.x + size.width / 2, y: entity.y + size.height / 2 }
      }
    }

    if (!center) return
    setDrawingLink({
      sourceId,
      startX: center.x,
      startY: center.y,
      currX: center.x,
      currY: center.y
    })
  }, [nodes, activeDiagramType, stateState, classState, erState])

  const handlePanStart = useCallback((e: React.PointerEvent) => {
    setPanState({
      type: 'editor',
      startX: e.clientX,
      startY: e.clientY,
      viewStartX: editorView.x,
      viewStartY: editorView.y
    })
  }, [editorView])

  const handleBoxSelectStart = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - editorView.x) / editorView.scale
    const y = (e.clientY - rect.top - editorView.y) / editorView.scale
    setBoxSelect({ startX: x, startY: y, endX: x, endY: y })
  }, [editorView])

  const handleAddLink = useCallback((link: GraphLink) => {
    setLinks([...links, link])
  }, [links, setLinks])

  // Swimlane handlers
  const [swimlaneDragState, setSwimlaneDragState] = useState<{
    swimlaneId: string
    startX: number
    startY: number
    initialX: number
    initialY: number
  } | null>(null)

  const [swimlaneResizeState, setSwimlaneResizeState] = useState<{
    swimlaneId: string
    startX: number
    startY: number
    startW: number
    startH: number
    startSwimlaneX: number
    startSwimlaneY: number
    handle: ResizeHandle
  } | null>(null)

  const handleSwimlaneDragStart = useCallback((swimlaneId: string, e: React.PointerEvent) => {
    const swimlane = swimlanes.find(s => s.id === swimlaneId)
    if (!swimlane) return
    beginGraph()
    setSwimlaneDragState({
      swimlaneId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: swimlane.x,
      initialY: swimlane.y
    })
  }, [swimlanes, beginGraph])

  const handleSwimlaneResizeStart = useCallback((e: React.PointerEvent, swimlane: Swimlane, handle: ResizeHandle) => {
    e.stopPropagation()
    beginGraph()
    setSwimlaneResizeState({
      swimlaneId: swimlane.id,
      startX: e.clientX,
      startY: e.clientY,
      startW: swimlane.width,
      startH: swimlane.height,
      startSwimlaneX: swimlane.x,
      startSwimlaneY: swimlane.y,
      handle
    })
  }, [beginGraph])

  const handleSwimlaneChange = useCallback((id: string, updates: Partial<Swimlane>) => {
    setSwimlanes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [setSwimlanes])

  // Handle swimlane drag/resize in pointer move
  useEffect(() => {
    if (!swimlaneDragState && !swimlaneResizeState) return

    const handlePointerMove = (e: PointerEvent) => {
      if (swimlaneDragState) {
        const dx = (e.clientX - swimlaneDragState.startX) / editorView.scale
        const dy = (e.clientY - swimlaneDragState.startY) / editorView.scale
        replaceGraphState(prev => ({
          ...prev,
          swimlanes: prev.swimlanes.map(s =>
            s.id === swimlaneDragState.swimlaneId
              ? { ...s, x: swimlaneDragState.initialX + dx, y: swimlaneDragState.initialY + dy }
              : s
          )
        }))
      }
      if (swimlaneResizeState) {
        const dx = (e.clientX - swimlaneResizeState.startX) / editorView.scale
        const dy = (e.clientY - swimlaneResizeState.startY) / editorView.scale
        const handle = swimlaneResizeState.handle

        replaceGraphState(prev => ({
          ...prev,
          swimlanes: prev.swimlanes.map(s => {
          if (s.id !== swimlaneResizeState.swimlaneId) return s

          let newX = swimlaneResizeState.startSwimlaneX
          let newY = swimlaneResizeState.startSwimlaneY
          let newW = swimlaneResizeState.startW
          let newH = swimlaneResizeState.startH

          if (handle.includes('e')) newW = Math.max(150, swimlaneResizeState.startW + dx)
          if (handle.includes('w')) {
            newW = Math.max(150, swimlaneResizeState.startW - dx)
            newX = swimlaneResizeState.startSwimlaneX + dx
          }
          if (handle.includes('s')) newH = Math.max(100, swimlaneResizeState.startH + dy)
          if (handle.includes('n')) {
            newH = Math.max(100, swimlaneResizeState.startH - dy)
            newY = swimlaneResizeState.startSwimlaneY + dy
          }

          return { ...s, x: newX, y: newY, width: newW, height: newH }
        })
        }))
      }
    }

    const handlePointerUp = () => {
      if (swimlaneDragState || swimlaneResizeState) {
        commitGraph()
      }
      setSwimlaneDragState(null)
      setSwimlaneResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [swimlaneDragState, swimlaneResizeState, editorView.scale, replaceGraphState, commitGraph])

  // Render Canvas based on diagram type
  const renderCanvas = () => {
    if (activeDiagramType === 'flowchart') {
      return (
        <Canvas
          nodes={nodes}
          links={links}
          swimlanes={swimlanes}
          selection={selection}
          multiSelect={multiSelect}
          mode={mode}
          editorView={editorView}
          drawingLink={drawingLink}
          boxSelect={boxSelect}
          editingNodeId={editingNodeId}
          editingLinkId={editingLinkId}
          tempLabel={tempLabel}
          hoveredNodeId={hoveredNodeId}
          containerRef={containerRef}
          inputRef={inputRef}
          onViewChange={setEditorView}
          onSelectionChange={setSelection}
          onMultiSelectChange={setMultiSelect}
          onDragStart={handleDragStart}
          onMultiDragStart={handleMultiDragStart}
          onResizeStart={handleResizeStart}
          onDrawingLinkStart={handleDrawingLinkStart}
          onDrawingLinkEnd={() => setDrawingLink(null)}
          onDrawingLinkCancel={() => setDrawingLink(null)}
          onDrawingLinkMove={(x, y) => setDrawingLink(prev => prev ? { ...prev, currX: x, currY: y } : null)}
          onPanStart={handlePanStart}
          onBoxSelectStart={handleBoxSelectStart}
          onBoxSelectMove={(x, y) => setBoxSelect(prev => prev ? { ...prev, endX: x, endY: y } : null)}
          onEditNode={(nodeId) => { setEditingNodeId(nodeId); setEditingLinkId(null) }}
          onEditLink={(linkId, label) => { setEditingLinkId(linkId); setEditingNodeId(null); setTempLabel(label) }}
          onTempLabelChange={setTempLabel}
          onFinishEditing={finishEditing}
          onHoverNode={setHoveredNodeId}
          onAddLink={handleAddLink}
          onSwimlaneDragStart={handleSwimlaneDragStart}
          onSwimlaneResizeStart={handleSwimlaneResizeStart}
          onMultiResizeStart={handleMultiResizeStart}
        />
      )
    }

    // For other diagram types, use plugin Canvas
    if (!activePlugin) return null

    const PluginCanvas = activePlugin.Canvas as any
    const currentState = activeDiagramType === 'state' ? stateState
      : activeDiagramType === 'class' ? classState
      : activeDiagramType === 'er' ? erState
      : activeDiagramType === 'sequence' ? sequenceState
      : null

    const handleStateChange = (newState: any) => {
      if (activeDiagramType === 'state') {
        setStateState(newState)
      } else if (activeDiagramType === 'class') {
        setClassState(newState)
      } else if (activeDiagramType === 'er') {
        setERState(newState)
      } else if (activeDiagramType === 'sequence') {
        setSequenceState(newState)
      }
    }

    return (
      <PluginCanvas
        state={currentState}
        selection={selection}
        multiSelect={multiSelect}
        view={editorView}
        mode={mode}
        snapToGrid={snapToGrid}
        gridSize={GRID_SIZE}
        containerRef={containerRef}
        inputRef={inputRef}
        onStateChange={handleStateChange}
        onSelectionChange={setSelection}
        onMultiSelectChange={setMultiSelect}
        onViewChange={setEditorView}
        onDragStart={handleDragStart}
        onMultiDragStart={handleMultiDragStart}
        onResizeStart={handleResizeStart}
        drawingLink={drawingLink}
        onDrawingLinkStart={handleDrawingLinkStart}
        onDrawingLinkEnd={() => setDrawingLink(null)}
        onDrawingLinkCancel={() => setDrawingLink(null)}
        onDrawingLinkMove={(x: number, y: number) => setDrawingLink(prev => prev ? { ...prev, currX: x, currY: y } : null)}
        onPanStart={handlePanStart}
        onBoxSelectStart={handleBoxSelectStart}
        onBoxSelectMove={(x: number, y: number) => setBoxSelect(prev => prev ? { ...prev, endX: x, endY: y } : null)}
        boxSelect={boxSelect}
        editingNodeId={editingNodeId}
        editingLinkId={editingLinkId}
        tempLabel={tempLabel}
        hoveredNodeId={hoveredNodeId}
        onEditNode={(nodeId: string) => { setEditingNodeId(nodeId); setEditingLinkId(null) }}
        onEditLink={(linkId: string, label: string) => { setEditingLinkId(linkId); setEditingNodeId(null); setTempLabel(label) }}
        onTempLabelChange={setTempLabel}
        onFinishEditing={finishEditing}
        onHoverNode={setHoveredNodeId}
        onAddLink={handleAddLink}
        onMultiResizeStart={handleMultiResizeStart}
      />
    )
  }

  // Render Sidebar based on diagram type
  const renderSidebar = () => {
    if (activeDiagramType === 'flowchart') {
      return (
        <Sidebar
          selection={selection}
          multiSelectCount={multiSelect.size}
          nodes={nodes}
          links={links}
          swimlanes={swimlanes}
          generatedCode={generatedCode}
          mermaidError={mermaidError}
          isFullscreen={isFullscreen}
          previewView={previewView}
          snapToGrid={snapToGrid}
          onLabelChange={handleLabelChange}
          onLinkTypeChange={handleLinkTypeChange}
          onLinkArrowChange={handleLinkArrowChange}
          onSwimlaneChange={handleSwimlaneChange}
          onCodeChange={handleCodeChange}
          onCodeBlur={handleCodeBlur}
          onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
          onPreviewViewChange={setPreviewView}
          onAlignNodes={handleAlignNodes}
          onSnapToGridChange={setSnapToGrid}
          mermaidRef={mermaidRef}
          compact={isPhone}
        />
      )
    }

    // For other diagram types, use plugin Sidebar
    if (!activePlugin) return null

    const PluginSidebar = activePlugin.Sidebar as any
    const currentState = activeDiagramType === 'state' ? stateState
      : activeDiagramType === 'class' ? classState
      : activeDiagramType === 'er' ? erState
      : activeDiagramType === 'sequence' ? sequenceState
      : null

    const handleStateChange = (newState: any) => {
      if (activeDiagramType === 'state') {
        setStateState(newState)
      } else if (activeDiagramType === 'class') {
        setClassState(newState)
      } else if (activeDiagramType === 'er') {
        setERState(newState)
      } else if (activeDiagramType === 'sequence') {
        setSequenceState(newState)
      }
    }

    return (
      <PluginSidebar
        state={currentState}
        selection={selection}
        multiSelectCount={multiSelect.size}
        snapToGrid={snapToGrid}
        onStateChange={handleStateChange}
        onSelectionChange={setSelection}
        onLabelChange={handleLabelChange}
        onAlignNodes={handleAlignNodes}
        onSnapToGridChange={setSnapToGrid}
        generatedCode={generatedCode}
        mermaidError={mermaidError}
        isFullscreen={isFullscreen}
        previewView={previewView}
        onCodeChange={handleCodeChange}
        onCodeBlur={handleCodeBlur}
        onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
        onPreviewViewChange={setPreviewView}
        mermaidRef={mermaidRef}
        onLinkTypeChange={handleLinkTypeChange}
        onLinkArrowChange={handleLinkArrowChange}
        compact={isPhone}
      />
    )
  }

  // Show user login dialog if no user is logged in
  if (!currentUser) {
    return <UserNameDialog onConfirm={handleUserLogin} />
  }

  return (
    <div className="flex flex-col h-screen font-sans overflow-hidden text-slate-800 select-none">
      {/* Diagram List Sidebar */}
      <DiagramList
        isOpen={showDiagramList}
        onClose={() => setShowDiagramList(false)}
        currentDiagramId={currentDiagramId}
        onSelectDiagram={handleSelectDiagram}
        onCreateDiagram={handleCreateDiagram}
        onDeleteDiagram={handleDeleteDiagram}
      />

      {/* Admin Panel */}
      {currentUser && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          currentUser={currentUser}
        />
      )}

      <Header
        mode={mode}
        direction={direction}
        snapToGrid={snapToGrid}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={!!selection || multiSelect.size > 0}
        activeDiagramType={activeDiagramType}
        currentUser={currentUser}
        currentDiagramName={currentDiagramName}
        isUserAdmin={isCurrentUserAdmin}
        onModeChange={setMode}
        onDirectionToggle={handleDirectionToggle}
        onSnapToGridToggle={() => setSnapToGrid(!snapToGrid)}
        onUndo={undo}
        onRedo={redo}
        onDelete={deleteSelection}
        onAutoLayout={handleAutoLayout}
        onAddNode={handleAddNode}
        onDiagramTypeChange={handleDiagramTypeChange}
        onOpenDiagramList={() => setShowDiagramList(true)}
        onOpenAdminPanel={() => setShowAdminPanel(true)}
        onLogout={handleUserLogout}
      />

      <div className="flex flex-1 min-h-0 relative">
        <div className="flex-1 min-w-0 relative">
          <ErrorBoundary>
            {renderCanvas()}
          </ErrorBoundary>
        </div>

        {sidebarCollapsed && (
          <button
            type="button"
            onClick={handleSidebarToggle}
            onPointerDown={(e) => e.stopPropagation()}
            className={
              isPhone
                ? `absolute bottom-4 right-4 z-[70] min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-full text-sm font-medium shadow-lg ${
                    sidebarCollapsed
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'
                  }`
                : 'absolute right-3 top-1/2 -translate-y-1/2 z-[70] px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium shadow-md bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'
            }
            title={sidebarCollapsed ? '展开代码与预览' : '收起代码与预览'}
          >
            {sidebarCollapsed ? '代码' : '收起'}
          </button>
        )}

        {!sidebarCollapsed && overlaySidebar && (
          <>
            <div
              className="absolute inset-0 z-[45] bg-black/20"
              onPointerDown={handleSidebarToggle}
            />
            <div
              className={
                isPhone
                  ? 'mermaid-phone-drawer absolute left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col'
                  : 'absolute top-0 right-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col'
              }
              style={isPhone ? { height: phoneDrawerHeight } : { width: effectiveSidebarWidth }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                className={`relative flex items-center justify-between px-3 py-2 border-b border-gray-200 shrink-0 ${isPhone ? 'cursor-row-resize' : ''}`}
                onPointerDown={handlePhoneDrawerPointerDown}
                style={isPhone ? { touchAction: 'none' } : undefined}
              >
                {isPhone && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-12 h-1.5 rounded-full bg-gray-300" />
                )}
                <span className={`text-sm font-medium text-gray-700 ${isPhone ? 'mt-1' : ''}`}>代码与预览</span>
                <button
                  type="button"
                  onClick={handleSidebarToggle}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="收起"
                  aria-label="收起代码与预览"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ErrorBoundary>
                  {renderSidebar()}
                </ErrorBoundary>
              </div>
            </div>
          </>
        )}

        {!sidebarCollapsed && !overlaySidebar && (
          <>
            <ResizableDivider onResize={handleSidebarResize} />

            <div style={{ width: effectiveSidebarWidth }} className="flex-shrink-0 h-full overflow-hidden relative">
              <button
                type="button"
                onClick={handleSidebarToggle}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-6 h-16 bg-white border border-gray-200 rounded-full shadow-md hover:shadow-lg hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center"
                title="收起侧边栏"
              >
                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <ErrorBoundary>
                {renderSidebar()}
              </ErrorBoundary>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
