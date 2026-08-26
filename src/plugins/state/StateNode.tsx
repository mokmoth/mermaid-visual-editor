import { memo, useCallback } from 'react'
import type { StateNode as StateNodeType } from './types'
import type { ResizeHandle } from '@/core/types'
import { activateOnEnterOrSpace, interactiveA11y } from '@/utils/a11y'

interface StateNodeProps {
  state: StateNodeType
  isSelected: boolean
  isHovered: boolean
  isMultiSelected: boolean
  scale: number
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp?: (e: React.PointerEvent) => void
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  onDoubleClick: () => void
  onResizeStart?: (e: React.PointerEvent, handle: ResizeHandle) => void
}

export const StateNodeComponent = memo(({
  state,
  isSelected,
  isHovered,
  isMultiSelected,
  scale,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerLeave,
  onDoubleClick,
  onResizeStart
}: StateNodeProps) => {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    onPointerDown(e)
  }, [onPointerDown])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    onPointerUp?.(e)
  }, [onPointerUp])

  const handleResizePointerDown = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    e.stopPropagation()
    onResizeStart?.(e, handle)
  }, [onResizeStart])

  const size = getStateSize(state)
  const selected = isSelected || isMultiSelected

  // Only show resize handles for resizable state types (not start, end, choice, fork, join)
  const canResize = state.type === 'state' && selected

  // Resize handle size adjusted for scale
  const handleSize = Math.max(6, 8 / scale)

  return (
    <g
      transform={`translate(${state.x}, ${state.y})`}
      {...interactiveA11y(state.name || state.type, selected)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => activateOnEnterOrSpace(e, () => onPointerDown(e as unknown as React.PointerEvent))}
      style={{ cursor: 'move' }}
    >
      {renderStateShape(state, size, selected, isHovered)}
      {state.type === 'state' && state.name && (
        <text
          x={size.width / 2}
          y={size.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-800 text-sm pointer-events-none select-none"
          style={{ fontSize: 14 / scale }}
        >
          {state.name}
        </text>
      )}

      {/* Resize handles */}
      {canResize && (
        <>
          {/* NW handle */}
          <rect
            x={-handleSize / 2}
            y={-handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1}
            style={{ cursor: 'nwse-resize' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
          />
          {/* NE handle */}
          <rect
            x={size.width - handleSize / 2}
            y={-handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1}
            style={{ cursor: 'nesw-resize' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
          />
          {/* SE handle */}
          <rect
            x={size.width - handleSize / 2}
            y={size.height - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1}
            style={{ cursor: 'nwse-resize' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'se')}
          />
          {/* SW handle */}
          <rect
            x={-handleSize / 2}
            y={size.height - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1}
            style={{ cursor: 'nesw-resize' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
          />
        </>
      )}
    </g>
  )
})

StateNodeComponent.displayName = 'StateNodeComponent'

export function getStateNodeSize(state: StateNodeType): { width: number; height: number } {
  switch (state.type) {
    case 'start':
    case 'end':
      return { width: 30, height: 30 }
    case 'choice':
      return { width: 40, height: 40 }
    case 'fork':
    case 'join':
      return { width: 100, height: 8 }
    default:
      return {
        width: state.customWidth || Math.max(100, state.name.length * 10 + 40),
        height: state.customHeight || 50
      }
  }
}

// Alias for internal use
const getStateSize = getStateNodeSize

function renderStateShape(
  state: StateNodeType,
  size: { width: number; height: number },
  selected: boolean,
  isHovered: boolean
) {
  const strokeColor = selected ? '#3b82f6' : isHovered ? '#6b7280' : '#9ca3af'
  const strokeWidth = selected ? 2 : 1.5
  const fillColor = state.type === 'start' || state.type === 'end' ? '#374151' : '#ffffff'

  switch (state.type) {
    case 'start':
      // Filled circle
      return (
        <circle
          cx={size.width / 2}
          cy={size.height / 2}
          r={12}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )

    case 'end':
      // Double circle with filled inner
      return (
        <g>
          <circle
            cx={size.width / 2}
            cy={size.height / 2}
            r={14}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size.width / 2}
            cy={size.height / 2}
            r={8}
            fill={fillColor}
            stroke="none"
          />
        </g>
      )

    case 'choice':
      // Diamond shape
      const cx = size.width / 2
      const cy = size.height / 2
      const r = 18
      return (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )

    case 'fork':
    case 'join':
      // Horizontal bar
      return (
        <rect
          x={0}
          y={0}
          width={size.width}
          height={size.height}
          rx={2}
          fill="#374151"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )

    default:
      // Rounded rectangle for normal state
      return (
        <rect
          x={0}
          y={0}
          width={size.width}
          height={size.height}
          rx={8}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )
  }
}

export function getStateCenter(state: StateNodeType): { x: number; y: number } {
  const size = getStateSize(state)
  return {
    x: state.x + size.width / 2,
    y: state.y + size.height / 2
  }
}

export function getStateBorderPoint(
  state: StateNodeType,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const center = getStateCenter(state)
  const size = getStateSize(state)

  const dx = targetX - center.x
  const dy = targetY - center.y
  const angle = Math.atan2(dy, dx)

  switch (state.type) {
    case 'start':
    case 'end': {
      const r = state.type === 'end' ? 14 : 12
      return {
        x: center.x + r * Math.cos(angle),
        y: center.y + r * Math.sin(angle)
      }
    }
    case 'choice': {
      // Diamond intersection
      const r = 18
      const abscos = Math.abs(Math.cos(angle))
      const abssin = Math.abs(Math.sin(angle))
      const scale = 1 / (abscos + abssin)
      return {
        x: center.x + r * Math.cos(angle) * scale,
        y: center.y + r * Math.sin(angle) * scale
      }
    }
    case 'fork':
    case 'join': {
      // Rectangle intersection
      const hw = size.width / 2
      const hh = size.height / 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const t = Math.min(Math.abs(hw / cos), Math.abs(hh / sin))
      return {
        x: center.x + t * cos,
        y: center.y + t * sin
      }
    }
    default: {
      // Rounded rectangle approximation (using ellipse)
      const hw = size.width / 2
      const hh = size.height / 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      // Use rectangle intersection for simplicity
      const t = Math.min(
        Math.abs(cos) > 0.001 ? Math.abs(hw / cos) : Infinity,
        Math.abs(sin) > 0.001 ? Math.abs(hh / sin) : Infinity
      )
      return {
        x: center.x + t * cos,
        y: center.y + t * sin
      }
    }
  }
}
