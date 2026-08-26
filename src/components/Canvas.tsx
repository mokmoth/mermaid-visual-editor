import { memo, useRef, useCallback, useEffect, useState, useMemo, RefObject } from 'react'
import { NodeVisual } from './NodeVisual'
import { LinkRenderer } from './LinkRenderer'
import { Icon, Icons } from './Icons'
import type {
  GraphNode,
  GraphLink,
  Swimlane,
  Selection,
  ViewState,
  EditorMode,
  DrawingLink,
  BoxSelectState,
  ResizeHandle
} from '@/types'
import { getNodeSize } from '@/utils/nodeSize'
import { calculateFitToView, calculateFlowchartBounds } from '@/utils/geometry'
import { activateOnEnterOrSpace, interactiveA11y } from '@/utils/a11y'

interface CanvasProps {
  nodes: GraphNode[]
  links: GraphLink[]
  swimlanes: Swimlane[]
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
  onSwimlaneSelect?: (swimlaneId: string) => void
  onSwimlaneDragStart?: (swimlaneId: string, e: React.PointerEvent) => void
  onSwimlaneResizeStart?: (e: React.PointerEvent, swimlane: Swimlane, handle: ResizeHandle) => void
  onMultiResizeStart?: (nodeIds: Set<string>, e: React.PointerEvent, handle: ResizeHandle) => void
}

export const Canvas = memo(({
  nodes,
  links,
  swimlanes,
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
  onAddLink,
  onSwimlaneSelect,
  onSwimlaneDragStart,
  onSwimlaneResizeStart,
  onMultiResizeStart
}: CanvasProps) => {
  const clickTracker = useRef({ id: null as string | null, time: 0 })
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  // Track spacebar state for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Calculate bounding box for multi-selected nodes and swimlanes
  const multiSelectBounds = useMemo(() => {
    if (multiSelect.size < 2) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    multiSelect.forEach(itemId => {
      // Check if it's a node
      const node = nodes.find(n => n.id === itemId)
      if (node) {
        const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + width)
        maxY = Math.max(maxY, node.y + height)
        return
      }

      // Check if it's a swimlane
      const swimlane = swimlanes.find(s => s.id === itemId)
      if (swimlane) {
        minX = Math.min(minX, swimlane.x)
        minY = Math.min(minY, swimlane.y)
        maxX = Math.max(maxX, swimlane.x + swimlane.width)
        maxY = Math.max(maxY, swimlane.y + swimlane.height)
      }
    })

    if (minX === Infinity) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }, [multiSelect, nodes, swimlanes])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    // Pinch-to-zoom (ctrlKey is set on trackpad pinch)
    if (e.ctrlKey || e.metaKey) {
      const scaleAmount = -e.deltaY * 0.01
      const newScale = Math.min(Math.max(0.2, editorView.scale + scaleAmount), 5)
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const worldX = (mouseX - editorView.x) / editorView.scale
      const worldY = (mouseY - editorView.y) / editorView.scale
      onViewChange({
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
        scale: newScale
      })
    } else {
      // Two-finger scroll = pan view
      onViewChange({
        x: editorView.x - e.deltaX,
        y: editorView.y - e.deltaY,
        scale: editorView.scale
      })
    }
  }, [editorView, onViewChange])

  // Use non-passive wheel event listener to allow preventDefault
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

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
      if (isSpacePressed || e.button === 1) {
        // Space + left-click or middle-click = pan
        onPanStart(e)
      } else if (mode === 'select') {
        // Left-click drag on background = box select
        onBoxSelectStart(e)
        // Don't clear selection when starting box select
        return
      }
    }

    if (!boxSelect && !isSpacePressed && e.button === 0) {
      onSelectionChange(null)
      onMultiSelectChange(new Set())
    }
  }, [editingNodeId, editingLinkId, mode, boxSelect, isSpacePressed, onFinishEditing, onBoxSelectStart, onPanStart, onSelectionChange, onMultiSelectChange])

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

  // Fit all content to view
  const handleFitToView = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const bounds = calculateFlowchartBounds(nodes, swimlanes)
    const newView = calculateFitToView(bounds, rect.width, rect.height)
    onViewChange(newView)
  }, [containerRef, nodes, swimlanes, onViewChange])

  const handleNodePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation()
    
    if (editingNodeId || editingLinkId) {
      onFinishEditing()
      return
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    if (mode === 'link') {
      const pos = getCanvasPos(e)
      onDrawingLinkStart(nodeId, e)
      // Set initial drawing link position
      onDrawingLinkMove(pos.x, pos.y)
      onSelectionChange(null)
    } else {
      // Shift+click = toggle selection in multi-select
      if (e.shiftKey) {
        const newSet = new Set(multiSelect)
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId)
        } else {
          newSet.add(nodeId)
        }
        onMultiSelectChange(newSet)
        onSelectionChange(null)
      } else if (multiSelect.has(nodeId)) {
        // Click on already multi-selected node = drag all
        onMultiDragStart(multiSelect, e)
      } else {
        // Normal click = single select and drag
        onSelectionChange({ type: 'node', id: nodeId })
        onMultiSelectChange(new Set())
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

  const handleSwimlanePointerDown = useCallback((e: React.PointerEvent, swimlaneId: string) => {
    e.stopPropagation()
    if (editingNodeId || editingLinkId) {
      onFinishEditing()
      return
    }

    // Shift+click = toggle selection in multi-select
    if (e.shiftKey) {
      const newSet = new Set(multiSelect)
      if (newSet.has(swimlaneId)) {
        newSet.delete(swimlaneId)
      } else {
        newSet.add(swimlaneId)
      }
      onMultiSelectChange(newSet)
      onSelectionChange(null)
    } else if (multiSelect.has(swimlaneId)) {
      // Click on already multi-selected swimlane = drag all
      onMultiDragStart(multiSelect, e)
    } else {
      // Normal click = single select and drag
      onSelectionChange({ type: 'swimlane', id: swimlaneId })
      onMultiSelectChange(new Set())
      onSwimlaneSelect?.(swimlaneId)
      onSwimlaneDragStart?.(swimlaneId, e)
    }
  }, [editingNodeId, editingLinkId, multiSelect, onFinishEditing, onSelectionChange, onMultiSelectChange, onMultiDragStart, onSwimlaneSelect, onSwimlaneDragStart])

  const handleSwimlaneResizePointerDown = useCallback((e: React.PointerEvent, swimlane: Swimlane, handle: ResizeHandle) => {
    e.stopPropagation()
    onSwimlaneResizeStart?.(e, swimlane, handle)
  }, [onSwimlaneResizeStart])

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="流程图画布"
      className={`absolute inset-0 overflow-hidden grid-bg ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      style={{
        backgroundPosition: `${editorView.x}px ${editorView.y}px`,
        backgroundSize: `${20 * editorView.scale}px ${20 * editorView.scale}px`
      }}
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
        {/* Swimlanes (render behind nodes and links) */}
        {swimlanes.map(swimlane => {
          const isSel = selection?.type === 'swimlane' && selection.id === swimlane.id
          const isMultiSel = multiSelect.has(swimlane.id)
          const isHorizontal = swimlane.orientation === 'horizontal'
          const headerHeight = 36
          const lanes = swimlane.lanes || []
          const laneCount = lanes.length || 1
          const contentHeight = swimlane.height - headerHeight
          const contentWidth = swimlane.width

          return (
            <div
              key={swimlane.id}
              style={{
                position: 'absolute',
                left: swimlane.x,
                top: swimlane.y,
                width: swimlane.width,
                height: swimlane.height,
                zIndex: 1,
                pointerEvents: 'auto'
              }}
              className={isMultiSel ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}
            >
              {/* Swimlane content wrapper */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: swimlane.color || '#f0f9ff',
                  border: isSel || isMultiSel ? '2px solid #3b82f6' : '2px solid #94a3b8',
                  borderRadius: 8,
                  overflow: 'hidden'
                }}
                className="cursor-move"
                onPointerDown={(e) => handleSwimlanePointerDown(e, swimlane.id)}
              >
                {/* Swimlane header */}
                <div
                  style={{
                    height: headerHeight,
                    padding: '8px 12px',
                    borderBottom: '1px solid #94a3b8',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {swimlane.name}
                </div>

                {/* Lanes container */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: isHorizontal ? 'column' : 'row',
                    height: contentHeight,
                    width: contentWidth
                  }}
                >
                  {lanes.map((lane, index) => {
                    const isLastLane = index === laneCount - 1

                    return (
                      <div
                        key={lane.id}
                        style={{
                          flex: 1,
                          display: 'flex',
                          borderRight: !isHorizontal && !isLastLane ? '1px dashed #94a3b8' : 'none',
                          borderBottom: isHorizontal && !isLastLane ? '1px dashed #94a3b8' : 'none',
                          position: 'relative'
                        }}
                      >
                        {/* Lane label */}
                        <div
                          style={{
                            position: 'absolute',
                            left: isHorizontal ? 4 : '50%',
                            top: isHorizontal ? '50%' : 4,
                            transform: isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)',
                            fontSize: 12,
                            color: '#64748b',
                            fontWeight: 500,
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none'
                          }}
                        >
                          {lane.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resize handles - outside overflow:hidden container */}
              {isSel && (
                <>
                  {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map(handle => {
                    const isTop = handle.includes('n')
                    const isLeft = handle.includes('w')
                    return (
                      <div
                        key={handle}
                        style={{
                          position: 'absolute',
                          width: 10,
                          height: 10,
                          backgroundColor: '#3b82f6',
                          border: '2px solid white',
                          borderRadius: 2,
                          cursor: `${handle}-resize`,
                          top: isTop ? -5 : 'auto',
                          bottom: isTop ? 'auto' : -5,
                          left: isLeft ? -5 : 'auto',
                          right: isLeft ? 'auto' : -5,
                          zIndex: 100
                        }}
                        onPointerDown={(e) => handleSwimlaneResizePointerDown(e, swimlane, handle)}
                      />
                    )
                  })}
                </>
              )}
            </div>
          )
        })}

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
          onTempLabelChange={onTempLabelChange}
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
              {...interactiveA11y(node.label || node.id, isSel || isMultiSel)}
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
              onKeyDown={(e) => activateOnEnterOrSpace(e, () => onSelectionChange({ type: 'node', id: node.id }))}
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

        {/* Multi-select bounding box with resize handles */}
        {multiSelectBounds && onMultiResizeStart && (
          <div
            style={{
              position: 'absolute',
              left: multiSelectBounds.x - 8,
              top: multiSelectBounds.y - 8,
              width: multiSelectBounds.width + 16,
              height: multiSelectBounds.height + 16,
              border: '2px dashed #3b82f6',
              backgroundColor: 'transparent',
              pointerEvents: 'none',
              zIndex: 20
            }}
          >
            {/* Resize handles */}
            {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map(handle => {
              const isTop = handle.includes('n')
              const isLeft = handle.includes('w')
              return (
                <div
                  key={handle}
                  style={{
                    position: 'absolute',
                    width: 10,
                    height: 10,
                    backgroundColor: '#3b82f6',
                    border: '2px solid white',
                    borderRadius: 2,
                    cursor: `${handle}-resize`,
                    top: isTop ? -5 : 'auto',
                    bottom: isTop ? 'auto' : -5,
                    left: isLeft ? -5 : 'auto',
                    right: isLeft ? 'auto' : -5,
                    pointerEvents: 'auto',
                    zIndex: 100
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onMultiResizeStart(multiSelect, e, handle)
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 flex space-x-2 bg-white p-1 rounded-md shadow border border-gray-200 z-30">
        <div className="px-2 py-1 text-xs text-gray-500 font-mono border-r border-gray-100 flex items-center">
          {(editorView.scale * 100).toFixed(0)}%
        </div>
        <button
          onClick={handleFitToView}
          className="p-1 hover:bg-gray-100 rounded text-gray-600"
          title="适应视图"
        >
          <Icon path={Icons.Reset} size={14} />
        </button>
      </div>
    </div>
  )
})

Canvas.displayName = 'Canvas'
