import { memo, useCallback, useEffect, useState, useMemo } from 'react'
import { ZoomHud } from '@/components/ZoomHud'
import type { CanvasProps } from '@/core/types'
import type { ERDiagramState, Entity, ERRelationship } from './types'
import { EntityNodeComponent, getEntityBorderPoint, getEntitySize } from './EntityNode'
import type { ResizeHandle } from '@/types'
import { ERRelationshipComponent } from './ERRelationship'
import { calculateFitToView, calculateItemsBounds, zoomView } from '@/utils/geometry'

interface ERCanvasProps extends CanvasProps<ERDiagramState> {
  nodes?: any[]
  links?: any[]
}

export const ERCanvas = memo(({
  state,
  selection,
  multiSelect,
  view,
  mode,
  snapToGrid,
  gridSize,
  containerRef,
  inputRef,
  onStateChange,
  onSelectionChange,
  onMultiSelectChange,
  onViewChange,
  onDragStart,
  onMultiDragStart,
  onResizeStart,
  drawingLink,
  onDrawingLinkStart,
  onDrawingLinkEnd,
  onDrawingLinkCancel,
  onDrawingLinkMove,
  onPanStart,
  onBoxSelectStart,
  onBoxSelectMove,
  boxSelect,
  editingNodeId,
  tempLabel,
  hoveredNodeId,
  onEditNode,
  onTempLabelChange,
  onFinishEditing,
  onHoverNode,
  onMultiResizeStart,
}: ERCanvasProps) => {
  const { entities, relationships } = state
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

  // Calculate bounding box for multi-selected nodes
  const multiSelectBounds = useMemo(() => {
    if (multiSelect.size < 2) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    multiSelect.forEach(nodeId => {
      const node = entities.find(e => e.id === nodeId)
      if (node) {
        const { width, height } = getEntitySize(node)
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + width)
        maxY = Math.max(maxY, node.y + height)
      }
    })

    if (minX === Infinity) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }, [multiSelect, entities])

  // Helper to get canvas position from pointer event
  const getCanvasPos = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (e.clientX - rect.left - view.x) / view.scale,
      y: (e.clientY - rect.top - view.y) / view.scale
    }
  }, [view, containerRef])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    // Pinch-to-zoom (ctrlKey is set on trackpad pinch)
    if (e.ctrlKey || e.metaKey) {
      const scaleAmount = -e.deltaY * 0.01
      const newScale = Math.min(Math.max(0.2, view.scale + scaleAmount), 5)
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const worldX = (mouseX - view.x) / view.scale
      const worldY = (mouseY - view.y) / view.scale
      onViewChange({
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
        scale: newScale
      })
    } else {
      // Two-finger scroll = pan view
      onViewChange({
        x: view.x - e.deltaX,
        y: view.y - e.deltaY,
        scale: view.scale
      })
    }
  }, [view, onViewChange])

  // Use non-passive wheel event listener to allow preventDefault
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Right-click: cancel drawing link
    if (e.button !== 0 && e.button !== 1) {
      if (drawingLink) {
        e.preventDefault()
        onDrawingLinkCancel()
      }
      return
    }

    // Check if clicked on background (container div, svg, or grid rect)
    const target = e.target as HTMLElement | SVGElement
    const isBackground = e.target === e.currentTarget ||
      target.tagName === 'svg' ||
      (target.tagName === 'rect' && target.getAttribute('width') === '20000')

    if (isBackground) {
      if (drawingLink) {
        onDrawingLinkCancel()
      }

      const isTouchLike = e.pointerType === 'touch' || e.pointerType === 'pen'
      if (isSpacePressed || e.button === 1 || isTouchLike) {
        // Space / middle-click / touch on blank = pan
        onPanStart(e)
      } else if (mode === 'select') {
        // Left-click drag on background = box select
        onBoxSelectStart(e)
      } else {
        onSelectionChange(null)
        onMultiSelectChange(new Set())
      }
    }
  }, [drawingLink, isSpacePressed, mode, onSelectionChange, onMultiSelectChange, onBoxSelectStart, onPanStart, onDrawingLinkCancel])

  const handleEntityPointerDown = useCallback((entity: Entity, e: React.PointerEvent) => {
    // Link mode: start drawing a connection
    if (mode === 'link') {
      const pos = getCanvasPos(e)
      onDrawingLinkStart(entity.id, e)
      onDrawingLinkMove(pos.x, pos.y)
      return
    }

    // Select mode
    if (e.shiftKey) {
      // Shift+click = toggle selection in multi-select
      const newSet = new Set(multiSelect)
      if (newSet.has(entity.id)) {
        newSet.delete(entity.id)
      } else {
        newSet.add(entity.id)
      }
      onMultiSelectChange(newSet)
      onSelectionChange(null)
    } else if (multiSelect.has(entity.id)) {
      // Click on already multi-selected node = drag all
      onMultiDragStart(multiSelect, e)
    } else {
      // Normal click = single select and drag
      onSelectionChange({ type: 'entity', id: entity.id })
      onMultiSelectChange(new Set())
      onDragStart(entity.id, e)
    }
  }, [mode, multiSelect, getCanvasPos, onSelectionChange, onMultiSelectChange, onDragStart, onMultiDragStart, onDrawingLinkStart, onDrawingLinkMove])

  const handleEntityPointerUp = useCallback((entity: Entity, e: React.PointerEvent) => {
    e.stopPropagation()

    if (mode === 'link' && drawingLink && drawingLink.sourceId !== entity.id) {
      const newRelationship: ERRelationship = {
        id: `er_${drawingLink.sourceId}_${entity.id}_${Date.now()}`,
        from: drawingLink.sourceId,
        to: entity.id,
        fromCardinality: '||',
        toCardinality: '}|',
        label: ''
      }
      onStateChange({
        ...state,
        relationships: [...state.relationships, newRelationship]
      })
      onDrawingLinkEnd(entity.id)
      onSelectionChange({ type: 'erRelationship', id: newRelationship.id })
    }
  }, [mode, drawingLink, state, onStateChange, onDrawingLinkEnd, onSelectionChange])

  const handleEntityDoubleClick = useCallback((entity: Entity) => {
    onEditNode(entity.id)
    onTempLabelChange(entity.name)
  }, [onEditNode, onTempLabelChange])

  const handleEntityPointerEnter = useCallback((entity: Entity) => {
    if (mode === 'link') {
      onHoverNode(entity.id)
    }
  }, [mode, onHoverNode])

  const handleEntityPointerLeave = useCallback(() => {
    if (mode === 'link') {
      onHoverNode(null)
    }
  }, [mode, onHoverNode])

  const handleRelationshipClick = useCallback((relationship: ERRelationship) => {
    onSelectionChange({ type: 'erRelationship', id: relationship.id })
    onMultiSelectChange(new Set())
  }, [onSelectionChange, onMultiSelectChange])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const pos = getCanvasPos(e)
    if (drawingLink) {
      onDrawingLinkMove(pos.x, pos.y)
    }
    if (boxSelect) {
      onBoxSelectMove(pos.x, pos.y)
    }
  }, [drawingLink, boxSelect, getCanvasPos, onDrawingLinkMove, onBoxSelectMove])

  // Fit all content to view
  const handleFitToView = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const bounds = calculateItemsBounds(entities, getEntitySize)
    const newView = calculateFitToView(bounds, rect.width, rect.height)
    onViewChange(newView)
  }, [containerRef, entities, onViewChange])

  const handleZoomBy = useCallback((factor: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    onViewChange(zoomView(view, factor, rect.width / 2, rect.height / 2))
  }, [containerRef, view, onViewChange])

  // Render drawing link
  const renderDrawingLink = () => {
    if (!drawingLink) return null
    const sourceEntity = entities.find(e => e.id === drawingLink.sourceId)
    if (!sourceEntity) return null

    const start = getEntityBorderPoint(sourceEntity, drawingLink.currX, drawingLink.currY)

    return (
      <line
        x1={start.x}
        y1={start.y}
        x2={drawingLink.currX}
        y2={drawingLink.currY}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="5,5"
        pointerEvents="none"
      />
    )
  }

  // Render box selection
  const renderBoxSelect = () => {
    if (!boxSelect) return null
    const x = Math.min(boxSelect.startX, boxSelect.endX)
    const y = Math.min(boxSelect.startY, boxSelect.endY)
    const width = Math.abs(boxSelect.endX - boxSelect.startX)
    const height = Math.abs(boxSelect.endY - boxSelect.startY)

    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth={1}
        strokeDasharray="4,4"
        pointerEvents="none"
      />
    )
  }

  // Prevent context menu when drawing link
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (drawingLink) {
      e.preventDefault()
      onDrawingLinkCancel()
    }
  }, [drawingLink, onDrawingLinkCancel])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden grid-bg ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      style={{
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
          overflow: 'visible'
        }}
        onPointerMove={handlePointerMove}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="er-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
          </pattern>
        </defs>
        <rect
          x={-10000}
          y={-10000}
          width={20000}
          height={20000}
          fill={snapToGrid ? 'url(#er-grid)' : 'transparent'}
        />

        {/* Relationships */}
        {relationships.map(rel => (
          <ERRelationshipComponent
            key={rel.id}
            relationship={rel}
            entities={entities}
            isSelected={selection?.type === 'erRelationship' && selection.id === rel.id}
            scale={view.scale}
            onClick={() => handleRelationshipClick(rel)}
          />
        ))}

        {/* Drawing link */}
        {renderDrawingLink()}

        {/* Entities */}
        {entities.map(entity => (
          <EntityNodeComponent
            key={entity.id}
            entity={entity}
            isSelected={selection?.type === 'entity' && selection.id === entity.id}
            isHovered={hoveredNodeId === entity.id}
            isMultiSelected={multiSelect.has(entity.id)}
            scale={view.scale}
            onPointerDown={(e) => handleEntityPointerDown(entity, e)}
            onPointerUp={(e) => handleEntityPointerUp(entity, e)}
            onPointerEnter={() => handleEntityPointerEnter(entity)}
            onPointerLeave={handleEntityPointerLeave}
            onDoubleClick={() => handleEntityDoubleClick(entity)}
            onResizeStart={(e, handle) => onResizeStart(e, entity, handle)}
          />
        ))}

        {/* Box selection */}
        {renderBoxSelect()}

        {/* Multi-select bounding box with resize handles */}
        {multiSelectBounds && onMultiResizeStart && (
          <g>
            <rect
              x={multiSelectBounds.x - 8}
              y={multiSelectBounds.y - 8}
              width={multiSelectBounds.width + 16}
              height={multiSelectBounds.height + 16}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="4,4"
              pointerEvents="none"
            />
            {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map(handle => {
              const isTop = handle.includes('n')
              const isLeft = handle.includes('w')
              const cx = isLeft ? multiSelectBounds.x - 8 : multiSelectBounds.x + multiSelectBounds.width + 8
              const cy = isTop ? multiSelectBounds.y - 8 : multiSelectBounds.y + multiSelectBounds.height + 8
              return (
                <rect
                  key={handle}
                  x={cx - 5}
                  y={cy - 5}
                  width={10}
                  height={10}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth={2}
                  rx={2}
                  style={{ cursor: `${handle}-resize` }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onMultiResizeStart(multiSelect, e, handle)
                  }}
                />
              )
            })}
          </g>
        )}
      </svg>

      {/* Inline editing input */}
      {editingNodeId && (
        <input
          ref={inputRef}
          type="text"
          value={tempLabel}
          onChange={(e) => onTempLabelChange(e.target.value)}
          onBlur={onFinishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onFinishEditing()
            if (e.key === 'Escape') {
              onTempLabelChange('')
              onFinishEditing()
            }
          }}
          className="absolute bg-white border-2 border-blue-500 rounded px-2 py-1 text-sm outline-none"
          style={{
            left: (entities.find(e => e.id === editingNodeId)?.x || 0) * view.scale + view.x,
            top: (entities.find(e => e.id === editingNodeId)?.y || 0) * view.scale + view.y + 40,
            transform: `scale(${view.scale})`,
            transformOrigin: 'top left',
            minWidth: 120
          }}
          autoFocus
        />
      )}

      <ZoomHud
        scale={view.scale}
        onZoomIn={() => handleZoomBy(1.25)}
        onZoomOut={() => handleZoomBy(0.8)}
        onFit={handleFitToView}
      />
    </div>
  )
})

ERCanvas.displayName = 'ERCanvas'
