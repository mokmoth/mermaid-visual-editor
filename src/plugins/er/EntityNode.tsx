import { memo, useCallback } from 'react'
import type { Entity as EntityType } from './types'
import type { ResizeHandle } from '@/core/types'
import { activateOnEnterOrSpace, interactiveA11y } from '@/utils/a11y'

interface EntityNodeProps {
  entity: EntityType
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

export const EntityNodeComponent = memo(({
  entity,
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
}: EntityNodeProps) => {
  const handleResizePointerDown = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    e.stopPropagation()
    onResizeStart?.(e, handle)
  }, [onResizeStart])

  const size = getEntitySize(entity)
  const selected = isSelected || isMultiSelected

  const strokeColor = selected ? '#3b82f6' : isHovered ? '#6b7280' : '#9ca3af'
  const strokeWidth = selected ? 2 : 1.5

  const headerHeight = 28

  // Resize handle size adjusted for scale
  const handleSize = Math.max(6, 8 / scale)

  return (
    <g
      transform={`translate(${entity.x}, ${entity.y})`}
      {...interactiveA11y(entity.name || entity.id, selected)}
      onKeyDown={(e) => activateOnEnterOrSpace(e, () => onPointerDown(e as unknown as React.PointerEvent))}
      onPointerDown={(e) => {
        e.stopPropagation()
        onPointerDown(e)
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        onPointerUp?.(e)
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onDoubleClick={onDoubleClick}
      style={{ cursor: 'move' }}
    >
      {/* Main rectangle */}
      <rect
        x={0}
        y={0}
        width={size.width}
        height={size.height}
        rx={4}
        fill="white"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Header section */}
      <rect
        x={0}
        y={0}
        width={size.width}
        height={headerHeight}
        rx={4}
        fill="#f3f4f6"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Fix bottom corners of header */}
      <rect
        x={0}
        y={headerHeight - 4}
        width={size.width}
        height={4}
        fill="#f3f4f6"
      />
      <line
        x1={0}
        y1={headerHeight}
        x2={size.width}
        y2={headerHeight}
        stroke={strokeColor}
        strokeWidth={1}
      />

      <text
        x={size.width / 2}
        y={headerHeight / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-gray-800 font-bold pointer-events-none select-none"
        style={{ fontSize: 13 / scale }}
      >
        {entity.name}
      </text>

      {/* Attributes */}
      {entity.attributes.map((attr, index) => (
        <g key={attr.id} transform={`translate(0, ${headerHeight + 5 + index * 22})`}>
          {/* PK/FK indicator */}
          <text
            x={8}
            y={13}
            className="fill-gray-500 pointer-events-none select-none"
            style={{ fontSize: 11 / scale }}
          >
            {attr.isPK ? '★' : attr.isFK ? '◆' : ' '}
          </text>
          {/* Attribute name */}
          <text
            x={22}
            y={13}
            className="fill-gray-700 pointer-events-none select-none"
            style={{ fontSize: 11 / scale }}
          >
            {attr.name}
          </text>
          {/* Attribute type */}
          <text
            x={size.width - 8}
            y={13}
            textAnchor="end"
            className="fill-gray-500 pointer-events-none select-none"
            style={{ fontSize: 10 / scale }}
          >
            {attr.type}
          </text>
        </g>
      ))}

      {/* Resize handles */}
      {selected && (
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

EntityNodeComponent.displayName = 'EntityNodeComponent'

export function getEntitySize(entity: EntityType): { width: number; height: number } {
  const nameWidth = Math.max(120, entity.name.length * 10 + 40)
  const attrWidth = Math.max(
    ...entity.attributes.map(a => (a.name.length + a.type.length) * 8),
    0
  ) + 50

  const width = entity.customWidth || Math.max(nameWidth, attrWidth, 150)

  const headerHeight = 28
  const attributesHeight = Math.max(entity.attributes.length * 22, 30)

  const height = entity.customHeight || (headerHeight + attributesHeight + 10)

  return { width, height }
}

export function getEntityCenter(entity: EntityType): { x: number; y: number } {
  const size = getEntitySize(entity)
  return {
    x: entity.x + size.width / 2,
    y: entity.y + size.height / 2
  }
}

export function getEntityBorderPoint(
  entity: EntityType,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const center = getEntityCenter(entity)
  const size = getEntitySize(entity)

  const dx = targetX - center.x
  const dy = targetY - center.y
  const angle = Math.atan2(dy, dx)

  const hw = size.width / 2
  const hh = size.height / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const t = Math.min(
    Math.abs(cos) > 0.001 ? Math.abs(hw / cos) : Infinity,
    Math.abs(sin) > 0.001 ? Math.abs(hh / sin) : Infinity
  )

  return {
    x: center.x + t * cos,
    y: center.y + t * sin
  }
}
