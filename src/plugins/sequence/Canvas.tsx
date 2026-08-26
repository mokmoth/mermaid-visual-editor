import { memo, useCallback, useEffect, useState } from 'react'
import { Icon, Icons } from '@/components/Icons'
import type { CanvasProps } from '@/core/types'
import type { SequenceDiagramState, Participant, Message } from './types'
import { ParticipantNodeComponent, PARTICIPANT_WIDTH_CONST, PARTICIPANT_HEIGHT_CONST } from './ParticipantNode'
import { MessageLineComponent } from './MessageLine'
import { calculateFitToView, BoundingBox } from '@/utils/geometry'

interface SequenceCanvasProps extends CanvasProps<SequenceDiagramState> {
  nodes?: any[]
  links?: any[]
}

const PARTICIPANT_SPACING = 150
const MESSAGE_SPACING = 50
const BASE_Y = 80
const TIMELINE_START_Y = BASE_Y + PARTICIPANT_HEIGHT_CONST + 20

export const SequenceCanvas = memo(({
  state,
  selection,
  multiSelect: _multiSelect,
  view,
  mode: _mode,
  snapToGrid,
  gridSize,
  containerRef,
  inputRef,
  onStateChange: _onStateChange,
  onSelectionChange,
  onMultiSelectChange,
  onViewChange,
  onDragStart: _onDragStart,
  onMultiDragStart: _onMultiDragStart,
  onResizeStart: _onResizeStart,
  drawingLink: _drawingLink,
  onDrawingLinkStart: _onDrawingLinkStart,
  onDrawingLinkEnd: _onDrawingLinkEnd,
  onDrawingLinkCancel: _onDrawingLinkCancel,
  onDrawingLinkMove: _onDrawingLinkMove,
  onPanStart,
  onBoxSelectStart,
  onBoxSelectMove,
  boxSelect,
  editingNodeId,
  tempLabel,
  hoveredNodeId: _hoveredNodeId,
  onEditNode,
  onTempLabelChange,
  onFinishEditing,
  onHoverNode: _onHoverNode,
}: SequenceCanvasProps) => {
  const { participants, messages, notes: _notes } = state
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

  // Calculate timeline height based on number of messages
  const timelineHeight = Math.max(200, (messages.length + 1) * MESSAGE_SPACING + 50)

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
    if (e.button !== 0 && e.button !== 1) return

    // Check if clicked on background
    const target = e.target as HTMLElement | SVGElement
    const isBackground = e.target === e.currentTarget ||
      target.tagName === 'svg' ||
      (target.tagName === 'rect' && target.getAttribute('width') === '20000')

    if (isBackground) {
      if (isSpacePressed || e.button === 1) {
        // Space + left-click or middle-click = pan
        onPanStart(e)
      } else {
        // Left-click drag on background = box select
        onBoxSelectStart(e)
      }
    }
  }, [isSpacePressed, onSelectionChange, onMultiSelectChange, onBoxSelectStart, onPanStart])

  const handleParticipantPointerDown = useCallback((participant: Participant, _e: React.PointerEvent) => {
    onSelectionChange({ type: 'participant', id: participant.id })
    onMultiSelectChange(new Set())
  }, [onSelectionChange, onMultiSelectChange])

  const handleParticipantDoubleClick = useCallback((participant: Participant) => {
    onEditNode(participant.id)
    onTempLabelChange(participant.name)
  }, [onEditNode, onTempLabelChange])

  const handleMessageClick = useCallback((message: Message) => {
    onSelectionChange({ type: 'message', id: message.id })
    onMultiSelectChange(new Set())
  }, [onSelectionChange, onMultiSelectChange])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const pos = getCanvasPos(e)
    if (boxSelect) {
      onBoxSelectMove(pos.x, pos.y)
    }
  }, [boxSelect, getCanvasPos, onBoxSelectMove])

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

  // Get participant X position
  const getParticipantX = (participant: Participant) => {
    return 50 + participant.order * PARTICIPANT_SPACING
  }

  // Fit all content to view
  const handleFitToView = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()

    // Calculate bounds for sequence diagram
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    // Include participants
    for (const participant of participants) {
      const x = 50 + participant.order * PARTICIPANT_SPACING
      minX = Math.min(minX, x)
      minY = Math.min(minY, BASE_Y)
      maxX = Math.max(maxX, x + PARTICIPANT_WIDTH_CONST)
      // Include timeline height based on messages
      const timelineHeight = messages.length * MESSAGE_SPACING + 100
      maxY = Math.max(maxY, BASE_Y + PARTICIPANT_HEIGHT_CONST + timelineHeight)
    }

    // If no participants, use default view
    if (minX === Infinity) {
      onViewChange({ x: 0, y: 0, scale: 1 })
      return
    }

    const bounds: BoundingBox = { minX, minY, maxX, maxY }
    const newView = calculateFitToView(bounds, rect.width, rect.height)
    onViewChange(newView)
  }, [containerRef, participants, messages, onViewChange])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden grid-bg ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      style={{
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`
      }}
      onPointerDown={handlePointerDown}
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
          <pattern id="sequence-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
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
          fill={snapToGrid ? 'url(#sequence-grid)' : 'transparent'}
        />

        {/* Title */}
        {state.title && (
          <text
            x={50 + (participants.length - 1) * PARTICIPANT_SPACING / 2 + PARTICIPANT_WIDTH_CONST / 2}
            y={30}
            textAnchor="middle"
            className="fill-gray-800 font-semibold pointer-events-none select-none"
            style={{ fontSize: 16 / view.scale }}
          >
            {state.title}
          </text>
        )}

        {/* Messages (render before participants so they appear behind) */}
        {messages.map(msg => (
          <MessageLineComponent
            key={msg.id}
            message={msg}
            participants={participants}
            participantSpacing={PARTICIPANT_SPACING}
            baseY={TIMELINE_START_Y}
            messageSpacing={MESSAGE_SPACING}
            isSelected={selection?.type === 'message' && selection.id === msg.id}
            scale={view.scale}
            onClick={() => handleMessageClick(msg)}
          />
        ))}

        {/* Participants */}
        {participants.map(participant => (
          <ParticipantNodeComponent
            key={participant.id}
            participant={participant}
            x={getParticipantX(participant)}
            y={BASE_Y}
            timelineHeight={timelineHeight}
            isSelected={selection?.type === 'participant' && selection.id === participant.id}
            scale={view.scale}
            onPointerDown={(e) => handleParticipantPointerDown(participant, e)}
            onDoubleClick={() => handleParticipantDoubleClick(participant)}
          />
        ))}

        {/* Box selection */}
        {renderBoxSelect()}
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
            left: (() => {
              const p = participants.find(p => p.id === editingNodeId)
              if (!p) return 0
              return getParticipantX(p) * view.scale + view.x
            })(),
            top: BASE_Y * view.scale + view.y + 50,
            transform: `scale(${view.scale})`,
            transformOrigin: 'top left',
            minWidth: 100
          }}
          autoFocus
        />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 flex space-x-2 bg-white p-1 rounded-md shadow border border-gray-200 z-30">
        <div className="px-2 py-1 text-xs text-gray-500 font-mono border-r border-gray-100 flex items-center">
          {(view.scale * 100).toFixed(0)}%
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

SequenceCanvas.displayName = 'SequenceCanvas'
