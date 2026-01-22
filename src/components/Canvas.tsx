import { memo, useRef, useCallback, RefObject } from 'react'
import { NodeVisual } from './NodeVisual'
import { LinkRenderer } from './LinkRenderer'
import { Icon, Icons } from './Icons'
import type {
  GraphNode,
  GraphLink,
  Selection,
  ViewState,
  EditorMode,
  DrawingLink,
  BoxSelectState,
  ResizeHandle
} from '@/types'
import { getNodeSize } from '@/utils/nodeSize'
import { getNodeCenter } from '@/utils/geometry'

interface CanvasProps {
  nodes: GraphNode[]
  links: GraphLink[]
  selection: Selection | null
  multiSelect: Set<string>
  mode: EditorMode
  editorView: ViewState
  drawingLink: DrawingLink | null
  boxSelect: BoxSelectState | null
  editingNodeId: string | null
  editingLinkId: string | null
  tempLabel: string
  hoveredNodeId: string | null
  containerRef: RefObject<HTMLDivElement>
  inputRef: RefObject<HTMLInputElement>
  onViewChange: (view: ViewState) => void
  onSelectionChange: (selection: Selection | null) => void
  onMultiSelectChange: (multiSelect: Set<string>) => void
  onDragStart: (nodeId: string, e: React.PointerEvent) => void
  onMultiDragStart: (nodeIds: Set<string>, e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent, node: GraphNode, handle: ResizeHandle) => void
  onDrawingLinkStart: (sourceId: string, e: React.PointerEvent) => void
  onDrawingLinkEnd: (targetId: string) => void
  onDrawingLinkCancel: () => void
  onDrawingLinkMove: (x: number, y: number) => void
  onPanStart: (e: React.PointerEvent) => void
  onBoxSelectStart: (e: React.PointerEvent) => void
  onBoxSelectMove: (x: number, y: number) => void
  onEditNode: (nodeId: string) => void
  onEditLink: (linkId: string, label: string) => void
  onTempLabelChange: (label: string) => void
  onFinishEditing: () => void
  onHoverNode: (nodeId: string | null) => void
  onAddLink: (link: GraphLink) => void
}

export const Canvas = memo(({
  nodes,
  links,
  selection,
  multiSelect,
  mode,
  editorView,
  drawingLink,
  boxSelect,
  editingNodeId,
  editingLinkId,
  tempLabel,
  hoveredNodeId,
  containerRef,
  inputRef,
  onViewChange,
  onSelectionChange,
  onMultiSelectChange,
  onDragStart,
  onMultiDragStart,
  onResizeStart,
  onDrawingLinkStart,
  onDrawingLinkEnd,
  onDrawingLinkCancel,
  onDrawingLinkMove,
  onPanStart,
  onBoxSelectStart,
  onBoxSelectMove,
  onEditNode,
  onEditLink,
  onTempLabelChange,
  onFinishEditing,
  onHoverNode,
  onAddLink
}: CanvasProps) => {
  const clickTracker = useRef({ id: null as string | null, time: 0 })

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const scaleAmount = -e.deltaY * 0.001
    const newScale = Math.min(Math.max(0.2, editorView.scale + scaleAmount), 5)
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const worldX = (mouseX - editorView.x) / editorView.scale
    const worldY = (mouseY - editorView.y) / editorView.scale
    onViewChange({
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale,
      scale: newScale
    })
  }, [editorView, onViewChange])

  const getCanvasPos = useCallback((e: React.PointerEvent) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - editorView.x) / editorView.scale,
      y: (e.clientY - rect.top - editorView.y) / editorView.scale
    }
  }, [containerRef, editorView])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (editingNodeId || editingLinkId) {
      onFinishEditing()
      return
    }

    if (e.button === 0 || e.button === 1) {
      // Shift + drag = box select
      if (e.shiftKey && mode === 'select') {
        onBoxSelectStart(e)
      } else {
        onPanStart(e)
      }
    }

    if (!e.shiftKey && !boxSelect) {
      onSelectionChange(null)
      onMultiSelectChange(new Set())
    }
  }, [editingNodeId, editingLinkId, mode, boxSelect, onFinishEditing, onBoxSelectStart, onPanStart, onSelectionChange, onMultiSelectChange])

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (drawingLink && containerRef.current) {
      const pos = getCanvasPos(e)
      onDrawingLinkMove(pos.x, pos.y)
    }
    if (boxSelect && containerRef.current) {
      const pos = getCanvasPos(e)
      onBoxSelectMove(pos.x, pos.y)
    }
  }, [drawingLink, boxSelect, containerRef, getCanvasPos, onDrawingLinkMove, onBoxSelectMove])

  const handleCanvasPointerUp = useCallback(() => {
    if (drawingLink && mode === 'link') {
      onDrawingLinkCancel()
    }
  }, [drawingLink, mode, onDrawingLinkCancel])

  const handleNodePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation()
    
    if (editingNodeId || editingLinkId) {
      onFinishEditing()
      return
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    if (mode === 'link') {
      const center = getNodeCenter(node)
      const pos = getCanvasPos(e)
      onDrawingLinkStart(nodeId, e)
      // Set initial drawing link position
      onDrawingLinkMove(pos.x, pos.y)
      onSelectionChange(null)
    } else {
      // Check if multi-select drag
      if (multiSelect.has(nodeId)) {
        onMultiDragStart(multiSelect, e)
      } else {
        onSelectionChange({ type: 'node', id: nodeId })
        onDragStart(nodeId, e)
      }
    }
  }, [editingNodeId, editingLinkId, nodes, mode, multiSelect, getCanvasPos, onFinishEditing, onDrawingLinkStart, onDrawingLinkMove, onSelectionChange, onMultiDragStart, onDragStart])

  const handleNodePointerUp = useCallback((e: React.PointerEvent, targetId: string) => {
    e.stopPropagation()

    // Link mode: complete connection
    if (mode === 'link' && drawingLink && drawingLink.sourceId !== targetId) {
      const newLink: GraphLink = {
        id: `link_${drawingLink.sourceId}_${targetId}_${Date.now()}`,
        source: drawingLink.sourceId,
        target: targetId,
        type: 'solid',
        arrow: 'forward',
        label: ''
      }
      onAddLink(newLink)
      onDrawingLinkEnd(targetId)
      onSelectionChange({ type: 'link', id: newLink.id })
      return
    }

    // Double-click detection for editing
    if (mode === 'select') {
      const now = Date.now()
      const last = clickTracker.current
      if (last.id === targetId && (now - last.time) < 300) {
        const node = nodes.find(n => n.id === targetId)
        if (node) {
          onEditNode(targetId)
          onTempLabelChange(node.label)
        }
        clickTracker.current = { id: null, time: 0 }
      } else {
        clickTracker.current = { id: targetId, time: now }
      }
    }
  }, [mode, drawingLink, nodes, onAddLink, onDrawingLinkEnd, onSelectionChange, onEditNode, onTempLabelChange])

  const handleLinkClick = useCallback((linkId: string) => {
    onSelectionChange({ type: 'link', id: linkId })
  }, [onSelectionChange])

  const handleLinkDoubleClick = useCallback((linkId: string, label: string) => {
    onEditLink(linkId, label)
    onSelectionChange({ type: 'link', id: linkId })
  }, [onEditLink, onSelectionChange])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden grid-bg cursor-grab active:cursor-grabbing"
      style={{
        backgroundPosition: `${editorView.x}px ${editorView.y}px`,
        backgroundSize: `${20 * editorView.scale}px ${20 * editorView.scale}px`
      }}
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
    >
      <div
        style={{
          transform: `translate(${editorView.x}px, ${editorView.y}px) scale(${editorView.scale})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Links */}
        <LinkRenderer
          links={links}
          nodes={nodes}
          selection={selection}
          editingLinkId={editingLinkId}
          onLinkClick={handleLinkClick}
          onLinkDoubleClick={handleLinkDoubleClick}
          drawingLink={drawingLink}
          tempLabel={tempLabel}
          setTempLabel={onTempLabelChange}
          finishEditing={onFinishEditing}
          inputRef={inputRef}
        />

        {/* Nodes */}
        {nodes.map(node => {
          const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
          const isSel = selection?.type === 'node' && selection.id === node.id
          const isMultiSel = multiSelect.has(node.id)
          const isEdit = editingNodeId === node.id
          const isHovered = hoveredNodeId === node.id

          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width,
                height,
                zIndex: isSel || isEdit || isMultiSel ? 30 : 10
              }}
              className={`cursor-${mode === 'select' ? 'move' : 'crosshair'} pointer-events-auto ${isMultiSel ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}`}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerUp={(e) => handleNodePointerUp(e, node.id)}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
            >
              <NodeVisual
                node={node}
                isSel={isSel || isMultiSel}
                isEdit={isEdit}
                tempLabel={tempLabel}
                setTempLabel={onTempLabelChange}
                finishEditing={onFinishEditing}
                inputRef={inputRef}
                onResizeStart={onResizeStart}
                showResizeHandles={isHovered || isSel || isMultiSel}
              />
            </div>
          )
        })}

        {/* Box selection */}
        {boxSelect && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(boxSelect.startX, boxSelect.endX),
              top: Math.min(boxSelect.startY, boxSelect.endY),
              width: Math.abs(boxSelect.endX - boxSelect.startX),
              height: Math.abs(boxSelect.endY - boxSelect.startY),
              border: '2px dashed #3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointerEvents: 'none',
              zIndex: 25
            }}
          />
        )}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 flex space-x-2 bg-white p-1 rounded-md shadow border border-gray-200 z-30">
        <div className="px-2 py-1 text-xs text-gray-500 font-mono border-r border-gray-100 flex items-center">
          {(editorView.scale * 100).toFixed(0)}%
        </div>
        <button
          onClick={() => onViewChange({ x: 0, y: 0, scale: 1 })}
          className="p-1 hover:bg-gray-100 rounded text-gray-600"
        >
          <Icon path={Icons.Reset} size={14} />
        </button>
      </div>
    </div>
  )
})

Canvas.displayName = 'Canvas'
