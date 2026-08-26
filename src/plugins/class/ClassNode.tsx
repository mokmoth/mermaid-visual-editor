import { memo, useCallback } from 'react'
import type { ClassNode as ClassNodeType, ClassMember } from './types'
import type { ResizeHandle } from '@/core/types'

interface ClassNodeProps {
  classNode: ClassNodeType
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

export const ClassNodeComponent = memo(({
  classNode,
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
}: ClassNodeProps) => {
  const handleResizePointerDown = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    e.stopPropagation()
    onResizeStart?.(e, handle)
  }, [onResizeStart])

  const size = getClassSize(classNode)
  const selected = isSelected || isMultiSelected

  const strokeColor = selected ? '#3b82f6' : isHovered ? '#6b7280' : '#9ca3af'
  const strokeWidth = selected ? 2 : 1.5

  const headerHeight = 30
  const stereotypeHeight = classNode.stereotype !== 'none' ? 18 : 0
  const divider1Y = headerHeight + stereotypeHeight
  const attributesSectionHeight = Math.max(classNode.attributes.length * 18 + 8, 25)
  const divider2Y = divider1Y + attributesSectionHeight

  // Resize handle size adjusted for scale
  const handleSize = Math.max(6, 8 / scale)

  return (
    <g
      transform={`translate(${classNode.x}, ${classNode.y})`}
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
      {classNode.stereotype !== 'none' && (
        <text
          x={size.width / 2}
          y={14}
          textAnchor="middle"
          className="fill-gray-500 text-xs pointer-events-none select-none"
          style={{ fontSize: 10 / scale }}
        >
          {`<<${classNode.stereotype}>>`}
        </text>
      )}

      <text
        x={size.width / 2}
        y={stereotypeHeight + 20}
        textAnchor="middle"
        className="fill-gray-800 font-semibold pointer-events-none select-none"
        style={{ fontSize: 14 / scale }}
      >
        {classNode.name}
      </text>

      {/* Divider line after header */}
      <line
        x1={0}
        y1={divider1Y}
        x2={size.width}
        y2={divider1Y}
        stroke={strokeColor}
        strokeWidth={1}
      />

      {/* Attributes section */}
      {classNode.attributes.map((attr, index) => (
        <text
          key={attr.id}
          x={8}
          y={divider1Y + 16 + index * 18}
          className="fill-gray-700 pointer-events-none select-none"
          style={{ fontSize: 11 / scale }}
        >
          {formatMember(attr)}
        </text>
      ))}

      {/* Divider line after attributes */}
      <line
        x1={0}
        y1={divider2Y}
        x2={size.width}
        y2={divider2Y}
        stroke={strokeColor}
        strokeWidth={1}
      />

      {/* Methods section */}
      {classNode.methods.map((method, index) => (
        <text
          key={method.id}
          x={8}
          y={divider2Y + 16 + index * 18}
          className="fill-gray-700 pointer-events-none select-none"
          style={{ fontSize: 11 / scale }}
        >
          {formatMember(method, true)}
        </text>
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

ClassNodeComponent.displayName = 'ClassNodeComponent'

function formatMember(member: ClassMember, isMethod = false): string {
  const visibility = member.visibility
  const staticMark = member.isStatic ? ' $' : ''
  const abstractMark = member.isAbstract ? ' *' : ''
  const type = member.type ? `: ${member.type}` : ''
  const params = isMethod ? (member.parameters || '()') : ''

  return `${visibility}${staticMark}${abstractMark} ${member.name}${params}${type}`
}

export function getClassSize(cls: ClassNodeType): { width: number; height: number } {
  const nameWidth = Math.max(120, cls.name.length * 10 + 40)
  const memberWidth = Math.max(
    ...cls.attributes.map(a => (a.name.length + (a.type?.length || 0)) * 8),
    ...cls.methods.map(m => (m.name.length + (m.parameters?.length || 0) + (m.type?.length || 0)) * 8),
    0
  ) + 30

  const width = cls.customWidth || Math.max(nameWidth, memberWidth, 150)

  const headerHeight = 30
  const stereotypeHeight = cls.stereotype !== 'none' ? 18 : 0
  const attributesHeight = Math.max(cls.attributes.length * 18 + 8, 25)
  const methodsHeight = Math.max(cls.methods.length * 18 + 8, 25)

  const height = cls.customHeight || (headerHeight + stereotypeHeight + attributesHeight + methodsHeight)

  return { width, height }
}

export function getClassCenter(cls: ClassNodeType): { x: number; y: number } {
  const size = getClassSize(cls)
  return {
    x: cls.x + size.width / 2,
    y: cls.y + size.height / 2
  }
}

export function getClassBorderPoint(
  cls: ClassNodeType,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const center = getClassCenter(cls)
  const size = getClassSize(cls)

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
