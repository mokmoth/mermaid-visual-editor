import { useState, useCallback, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { Header } from './components/Header'
import { Canvas } from './components/Canvas'
import { Sidebar } from './components/Sidebar'
import { useUndoRedo } from './hooks/useUndoRedo'
import { generateMermaidCode, parseMermaidCode } from './utils/mermaid'
import { applyAutoLayout } from './utils/layout'
import { getNodeSize } from './utils/nodeSize'
import { getNodeCenter } from './utils/geometry'
import type {
  GraphState,
  GraphNode,
  GraphLink,
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

const initialState: GraphState = {
  nodes: [
    { id: 'Start', type: 'stadium', x: 100, y: 100, label: '开始' },
    { id: 'Proc', type: 'rect', x: 100, y: 250, label: '执行过程' },
    { id: 'Cond', type: 'rhombus', x: 100, y: 400, label: '判断循环' },
  ],
  links: [
    { source: 'Start', target: 'Proc', id: 'link1', type: 'solid', arrow: 'forward' },
    { source: 'Proc', target: 'Cond', id: 'link2', label: '检查', type: 'solid', arrow: 'forward' },
    { source: 'Cond', target: 'Proc', id: 'link3', label: '不通过', type: 'dotted', arrow: 'back' },
  ]
}

export default function App() {
  // Core state with undo/redo
  const [graphState, setGraphState, undo, redo, canUndo, canRedo, replaceGraphState] = useUndoRedo(initialState)
  const { nodes, links } = graphState

  // UI state
  const [selection, setSelection] = useState<Selection | null>(null)
  const [multiSelect, setMultiSelect] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<EditorMode>('select')
  const [direction, setDirection] = useState<FlowDirection>('TD')
  const [editorView, setEditorView] = useState<ViewState>({ x: 0, y: 0, scale: 1 })
  const [previewView, setPreviewView] = useState<ViewState>({ x: 0, y: 0, scale: 1 })
  
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
  const [mermaidError, setMermaidError] = useState<string | null>(null)
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mermaidRef = useRef<HTMLDivElement>(null)
  const rAF = useRef<number | null>(null)

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'sans-serif',
      flowchart: {
        htmlLabels: true,
        useMaxWidth: false,
        wrappingWidth: 120,
        nodeSpacing: 30,
        rankSpacing: 40,
        curve: 'basis',
        padding: 15
      },
      themeVariables: {
        fontSize: '12px'
      }
    })
  }, [])

  // Update node/link setters
  const setNodes = useCallback((nodesOrFn: GraphNode[] | ((prev: GraphNode[]) => GraphNode[])) => {
    const newNodes = typeof nodesOrFn === 'function' ? nodesOrFn(nodes) : nodesOrFn
    setGraphState({ ...graphState, nodes: newNodes })
  }, [graphState, nodes, setGraphState])

  const setLinks = useCallback((linksOrFn: GraphLink[] | ((prev: GraphLink[]) => GraphLink[])) => {
    const newLinks = typeof linksOrFn === 'function' ? linksOrFn(links) : linksOrFn
    setGraphState({ ...graphState, links: newLinks })
  }, [graphState, links, setGraphState])

  const setGraph = useCallback((newNodes: GraphNode[], newLinks: GraphLink[]) => {
    setGraphState({ nodes: newNodes, links: newLinks })
  }, [setGraphState])

  // Generate and render mermaid code
  const renderDiagram = useCallback(async (code: string) => {
    if (!mermaidRef.current) return
    try {
      mermaidRef.current.removeAttribute('data-processed')
      const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}`, code)
      mermaidRef.current.innerHTML = svg
      setMermaidError(null)
    } catch (e) {
      setMermaidError('语法错误: ' + (e as Error).message)
    }
  }, [])

  // Update code when graph changes
  useEffect(() => {
    if (!isManualEditing && !dragState) {
      const code = generateMermaidCode(nodes, links, direction)
      setGeneratedCode(code)
      renderDiagram(code)
    }
  }, [nodes, links, direction, isManualEditing, dragState, renderDiagram])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId || editingLinkId) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selection) {
        e.preventDefault()
        if (selection.type === 'node') {
          const node = nodes.find(n => n.id === selection.id)
          if (node) setClipboard({ type: 'node', data: { ...node } })
        } else if (selection.type === 'link') {
          const link = links.find(l => l.id === selection.id)
          if (link) setClipboard({ type: 'link', data: { ...link } })
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        e.preventDefault()
        if (clipboard.type === 'node') {
          const nodeData = clipboard.data as GraphNode
          const newNode: GraphNode = {
            ...nodeData,
            id: `Node${Date.now()}`,
            x: nodeData.x + 50,
            y: nodeData.y + 50
          }
          setNodes([...nodes, newNode])
          setSelection({ type: 'node', id: newNode.id })
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && (selection || multiSelect.size > 0)) {
        e.preventDefault()
        deleteSelection()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setMultiSelect(new Set(nodes.map(n => n.id)))
        setSelection(null)
      } else if (e.key === 'Escape') {
        setSelection(null)
        setMultiSelect(new Set())
        setBoxSelect(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selection, clipboard, nodes, links, editingNodeId, editingLinkId, multiSelect])

  // Global pointer up handler
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (dragState) {
        setGraphState(graphState) // Commit to history
        setDragState(null)
      }
      if (multiDragState) {
        setGraphState(graphState)
        setMultiDragState(null)
      }
      if (resizeState) {
        setGraphState(graphState)
        setResizeState(null)
      }
      if (panState) setPanState(null)
      
      // Complete box selection
      if (boxSelect) {
        const minX = Math.min(boxSelect.startX, boxSelect.endX)
        const maxX = Math.max(boxSelect.startX, boxSelect.endX)
        const minY = Math.min(boxSelect.startY, boxSelect.endY)
        const maxY = Math.max(boxSelect.startY, boxSelect.endY)
        
        const selectedNodes = new Set<string>()
        nodes.forEach(node => {
          const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
          const nodeRight = node.x + width
          const nodeBottom = node.y + height
          if (node.x < maxX && nodeRight > minX && node.y < maxY && nodeBottom > minY) {
            selectedNodes.add(node.id)
          }
        })
        setMultiSelect(selectedNodes)
        setBoxSelect(null)
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerUp, true)
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp, true)
  }, [dragState, multiDragState, resizeState, panState, boxSelect, nodes, graphState, setGraphState])

  // Global pointer move handler
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (rAF.current) return
      const clientX = e.clientX
      const clientY = e.clientY

      rAF.current = requestAnimationFrame(() => {
        if (panState) {
          const dx = clientX - panState.startX
          const dy = clientY - panState.startY
          if (panState.type === 'editor') {
            setEditorView(prev => ({ ...prev, x: panState.viewStartX + dx, y: panState.viewStartY + dy }))
          } else {
            setPreviewView(prev => ({ ...prev, x: panState.viewStartX + dx, y: panState.viewStartY + dy }))
          }
        } else if (resizeState) {
          const dx = (clientX - resizeState.startX) / editorView.scale
          const dy = (clientY - resizeState.startY) / editorView.scale
          const { nodeId, startW, startH, startNodeX, startNodeY, handle } = resizeState

          let newW = startW
          let newH = startH
          let newX = startNodeX
          let newY = startNodeY

          if (handle.includes('e')) newW = Math.max(40, startW + dx)
          if (handle.includes('w')) {
            newW = Math.max(40, startW - dx)
            newX = startNodeX + (startW - newW)
          }
          if (handle.includes('s')) newH = Math.max(40, startH + dy)
          if (handle.includes('n')) {
            newH = Math.max(40, startH - dy)
            newY = startNodeY + (startH - newH)
          }

          const updatedNodes = nodes.map(n =>
            n.id === nodeId ? { ...n, customWidth: newW, customHeight: newH, x: newX, y: newY } : n
          )
          replaceGraphState({ ...graphState, nodes: updatedNodes })
        } else if (dragState) {
          const dist = Math.hypot(clientX - dragState.startX, clientY - dragState.startY)
          if (dist > 5) {
            const dx = (clientX - dragState.startX) / editorView.scale
            const dy = (clientY - dragState.startY) / editorView.scale
            
            const updatedNodes = nodes.map(n =>
              n.id === dragState.nodeId
                ? {
                    ...n,
                    x: snapToGrid ? Math.round((dragState.initialNodeX + dx) / GRID_SIZE) * GRID_SIZE : dragState.initialNodeX + dx,
                    y: snapToGrid ? Math.round((dragState.initialNodeY + dy) / GRID_SIZE) * GRID_SIZE : dragState.initialNodeY + dy
                  }
                : n
            )
            replaceGraphState({ ...graphState, nodes: updatedNodes })
          }
        } else if (multiDragState) {
          const dx = (clientX - multiDragState.startX) / editorView.scale
          const dy = (clientY - multiDragState.startY) / editorView.scale
          const updatedNodes = nodes.map(n => {
            if (multiDragState.nodeIds.has(n.id)) {
              const initial = multiDragState.initialPositions.get(n.id)!
              return {
                ...n,
                x: snapToGrid ? Math.round((initial.x + dx) / GRID_SIZE) * GRID_SIZE : initial.x + dx,
                y: snapToGrid ? Math.round((initial.y + dy) / GRID_SIZE) * GRID_SIZE : initial.y + dy
              }
            }
            return n
          })
          replaceGraphState({ ...graphState, nodes: updatedNodes })
        }
        rAF.current = null
      })
    }

    window.addEventListener('pointermove', handleGlobalPointerMove)
    return () => window.removeEventListener('pointermove', handleGlobalPointerMove)
  }, [panState, resizeState, dragState, multiDragState, editorView.scale, nodes, graphState, replaceGraphState, snapToGrid])

  // Delete selection
  const deleteSelection = useCallback(() => {
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
    } else {
      const newLinks = links.filter(l => l.id !== selection.id)
      setLinks(newLinks)
    }

    setSelection(null)
  }, [selection, multiSelect, nodes, links, setGraph, setLinks])

  // Finish editing
  const finishEditing = useCallback(() => {
    if (editingNodeId) {
      setNodes(nodes.map(n => n.id === editingNodeId ? { ...n, label: tempLabel } : n))
      setEditingNodeId(null)
    }
    if (editingLinkId) {
      setLinks(links.map(l => l.id === editingLinkId ? { ...l, label: tempLabel } : l))
      setEditingLinkId(null)
    }
  }, [editingNodeId, editingLinkId, tempLabel, nodes, links, setNodes, setLinks])

  // Add node
  const handleAddNode = useCallback((type: GraphNode['type']) => {
    const id = `Node${Date.now()}`
    const labels: Record<string, string> = {
      rect: '过程',
      round: '圆角',
      stadium: '开始',
      subroutine: '子程序',
      database: '数据',
      circle: '连接',
      rhombus: '判断',
      hexagon: '准备',
      parallelogram: '输入/输出'
    }
    setNodes([...nodes, { id, type, x: 50 - editorView.x, y: 50 - editorView.y, label: labels[type] || '节点' }])
  }, [nodes, editorView, setNodes])

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = applyAutoLayout(nodes, links, direction)
    setNodes(layoutedNodes)
    setEditorView({ x: 0, y: 0, scale: 1 })
  }, [nodes, links, direction, setNodes])

  // Toggle direction
  const handleDirectionToggle = useCallback(() => {
    const newDir = direction === 'TD' ? 'LR' : 'TD'
    setDirection(newDir)
    const layoutedNodes = applyAutoLayout(nodes, links, newDir)
    setNodes(layoutedNodes)
    setEditorView({ x: 0, y: 0, scale: 1 })
  }, [direction, nodes, links, setNodes])

  // Handle code change
  const handleCodeChange = useCallback((newCode: string) => {
    setGeneratedCode(newCode)
    setIsManualEditing(true)
    try {
      const result = parseMermaidCode(newCode, nodes, direction)
      if (result) {
        const layoutedNodes = result.nodes.length > 3 ? applyAutoLayout(result.nodes, result.links, result.direction) : result.nodes
        setDirection(result.direction)
        setGraph(layoutedNodes, result.links)
      }
    } catch (err) {
      console.error('Mermaid Parsing Error:', err)
    }
    renderDiagram(newCode)
  }, [nodes, direction, setGraph, renderDiagram])

  // Handle code blur
  const handleCodeBlur = useCallback(() => {
    setIsManualEditing(false)
    setGeneratedCode(generateMermaidCode(nodes, links, direction))
  }, [nodes, links, direction])

  // Label change
  const handleLabelChange = useCallback((value: string) => {
    if (selection?.type === 'node') {
      setNodes(nodes.map(n => n.id === selection.id ? { ...n, label: value } : n))
    }
    if (selection?.type === 'link') {
      setLinks(links.map(l => l.id === selection.id ? { ...l, label: value } : l))
    }
  }, [selection, nodes, links, setNodes, setLinks])

  // Link type toggle
  const handleLinkTypeToggle = useCallback(() => {
    if (selection?.type === 'link') {
      setLinks(links.map(l => l.id === selection.id ? { ...l, type: l.type === 'solid' ? 'dotted' : 'solid' } : l))
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

  // Canvas handlers
  const handleDragStart = useCallback((nodeId: string, e: React.PointerEvent) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    setDragState({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initialNodeX: node.x,
      initialNodeY: node.y
    })
  }, [nodes])

  const handleMultiDragStart = useCallback((nodeIds: Set<string>, e: React.PointerEvent) => {
    const initialPositions = new Map<string, { x: number; y: number }>()
    nodeIds.forEach(nodeId => {
      const n = nodes.find(nd => nd.id === nodeId)
      if (n) initialPositions.set(nodeId, { x: n.x, y: n.y })
    })
    setMultiDragState({
      nodeIds: new Set(nodeIds),
      initialPositions,
      startX: e.clientX,
      startY: e.clientY
    })
  }, [nodes])

  const handleResizeStart = useCallback((e: React.PointerEvent, node: GraphNode, handle: ResizeHandle) => {
    e.stopPropagation()
    e.preventDefault()
    const currentSize = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
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
  }, [])

  const handleDrawingLinkStart = useCallback((sourceId: string) => {
    const node = nodes.find(n => n.id === sourceId)
    if (!node) return
    const center = getNodeCenter(node)
    setDrawingLink({
      sourceId,
      startX: center.x,
      startY: center.y,
      currX: center.x,
      currY: center.y
    })
  }, [nodes])

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

  return (
    <div className="flex flex-col h-screen font-sans overflow-hidden text-slate-800 select-none">
      <Header
        mode={mode}
        direction={direction}
        snapToGrid={snapToGrid}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={!!selection || multiSelect.size > 0}
        editorView={editorView}
        onModeChange={setMode}
        onDirectionToggle={handleDirectionToggle}
        onSnapToGridToggle={() => setSnapToGrid(!snapToGrid)}
        onUndo={undo}
        onRedo={redo}
        onDelete={deleteSelection}
        onAutoLayout={handleAutoLayout}
        onAddNode={handleAddNode}
      />

      <div className="flex flex-1 overflow-hidden">
        <Canvas
          nodes={nodes}
          links={links}
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
        />

        <Sidebar
          selection={selection}
          multiSelectCount={multiSelect.size}
          nodes={nodes}
          links={links}
          generatedCode={generatedCode}
          mermaidError={mermaidError}
          isFullscreen={isFullscreen}
          previewView={previewView}
          snapToGrid={snapToGrid}
          onLabelChange={handleLabelChange}
          onLinkTypeToggle={handleLinkTypeToggle}
          onLinkArrowChange={handleLinkArrowChange}
          onCodeChange={handleCodeChange}
          onCodeBlur={handleCodeBlur}
          onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
          onPreviewViewChange={setPreviewView}
          onAlignNodes={handleAlignNodes}
          onSnapToGridChange={setSnapToGrid}
          mermaidRef={mermaidRef}
        />
      </div>
    </div>
  )
}
