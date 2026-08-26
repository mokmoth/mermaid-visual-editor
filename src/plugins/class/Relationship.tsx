import { memo } from 'react'
import type { ClassNode, ClassRelationship } from './types'
import { getClassCenter, getClassBorderPoint } from './ClassNode'

interface RelationshipProps {
  relationship: ClassRelationship
  classes: ClassNode[]
  isSelected: boolean
  scale: number
  onClick: () => void
}

export const RelationshipComponent = memo(({
  relationship,
  classes,
  isSelected,
  scale,
  onClick
}: RelationshipProps) => {
  const fromClass = classes.find(c => c.id === relationship.from)
  const toClass = classes.find(c => c.id === relationship.to)

  if (!fromClass || !toClass) return null

  const fromCenter = getClassCenter(fromClass)
  const toCenter = getClassCenter(toClass)

  const start = getClassBorderPoint(fromClass, toCenter.x, toCenter.y)
  const end = getClassBorderPoint(toClass, fromCenter.x, fromCenter.y)

  const strokeColor = isSelected ? '#3b82f6' : '#6b7280'
  const strokeWidth = isSelected ? 2 : 1.5
  const strokeDasharray = getStrokeDasharray(relationship.type)

  // Calculate marker end position
  const dx = end.x - start.x
  const dy = end.y - start.y
  const angle = Math.atan2(dy, dx)
  const markerSize = 12

  // For inheritance/realization, shorten line to make room for triangle
  const needsTriangle = relationship.type === 'inheritance' || relationship.type === 'realization'
  const needsDiamond = relationship.type === 'aggregation' || relationship.type === 'composition'

  const lineEnd = needsTriangle || needsDiamond
    ? { x: end.x - markerSize * Math.cos(angle), y: end.y - markerSize * Math.sin(angle) }
    : end

  // Label position
  const labelX = (start.x + end.x) / 2
  const labelY = (start.y + end.y) / 2 - 10

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Invisible wider line for easier clicking */}
      <line
        x1={start.x}
        y1={start.y}
        x2={lineEnd.x}
        y2={lineEnd.y}
        stroke="transparent"
        strokeWidth={16}
      />
      {/* Visible line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={lineEnd.x}
        y2={lineEnd.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />

      {/* Arrow/marker at end */}
      {renderEndMarker(relationship.type, end, angle, markerSize, strokeColor, strokeWidth)}

      {/* Label */}
      {relationship.label && (
        <g>
          <rect
            x={labelX - relationship.label.length * 4 - 4}
            y={labelY - 10}
            width={relationship.label.length * 8 + 8}
            height={18}
            fill="white"
            rx={3}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-700 text-xs pointer-events-none"
            style={{ fontSize: 11 / scale }}
          >
            {relationship.label}
          </text>
        </g>
      )}

      {/* Cardinality labels */}
      {relationship.fromCardinality && (
        <text
          x={start.x + 15 * Math.cos(angle) - 10 * Math.sin(angle)}
          y={start.y + 15 * Math.sin(angle) + 10 * Math.cos(angle)}
          className="fill-gray-600 text-xs pointer-events-none"
          style={{ fontSize: 10 / scale }}
        >
          {relationship.fromCardinality}
        </text>
      )}
      {relationship.toCardinality && (
        <text
          x={end.x - 25 * Math.cos(angle) - 10 * Math.sin(angle)}
          y={end.y - 25 * Math.sin(angle) + 10 * Math.cos(angle)}
          className="fill-gray-600 text-xs pointer-events-none"
          style={{ fontSize: 10 / scale }}
        >
          {relationship.toCardinality}
        </text>
      )}
    </g>
  )
})

RelationshipComponent.displayName = 'RelationshipComponent'

function getStrokeDasharray(type: ClassRelationship['type']): string {
  switch (type) {
    case 'realization':
    case 'dependency':
      return '5,5'
    default:
      return ''
  }
}

function renderEndMarker(
  type: ClassRelationship['type'],
  end: { x: number; y: number },
  angle: number,
  size: number,
  stroke: string,
  strokeWidth: number
) {
  const sin = Math.sin
  const cos = Math.cos

  switch (type) {
    case 'inheritance':
    case 'realization': {
      // Empty triangle
      const p1 = { x: end.x, y: end.y }
      const p2 = {
        x: end.x - size * cos(angle) - (size / 2) * cos(angle - Math.PI / 2),
        y: end.y - size * sin(angle) - (size / 2) * sin(angle - Math.PI / 2)
      }
      const p3 = {
        x: end.x - size * cos(angle) - (size / 2) * cos(angle + Math.PI / 2),
        y: end.y - size * sin(angle) - (size / 2) * sin(angle + Math.PI / 2)
      }
      return (
        <polygon
          points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
          fill="white"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
    }

    case 'aggregation':
    case 'composition': {
      // Diamond
      const halfSize = size / 2
      const p1 = { x: end.x, y: end.y }
      const p2 = {
        x: end.x - halfSize * cos(angle) - halfSize * cos(angle - Math.PI / 2),
        y: end.y - halfSize * sin(angle) - halfSize * sin(angle - Math.PI / 2)
      }
      const p3 = {
        x: end.x - size * cos(angle),
        y: end.y - size * sin(angle)
      }
      const p4 = {
        x: end.x - halfSize * cos(angle) - halfSize * cos(angle + Math.PI / 2),
        y: end.y - halfSize * sin(angle) - halfSize * sin(angle + Math.PI / 2)
      }
      return (
        <polygon
          points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
          fill={type === 'composition' ? stroke : 'white'}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
    }

    case 'dependency': {
      // Open arrow
      const arrowSize = size * 0.7
      const p1 = {
        x: end.x - arrowSize * cos(angle - Math.PI / 6),
        y: end.y - arrowSize * sin(angle - Math.PI / 6)
      }
      const p2 = {
        x: end.x - arrowSize * cos(angle + Math.PI / 6),
        y: end.y - arrowSize * sin(angle + Math.PI / 6)
      }
      return (
        <g>
          <line x1={end.x} y1={end.y} x2={p1.x} y2={p1.y} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={end.x} y1={end.y} x2={p2.x} y2={p2.y} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      )
    }

    default:
      return null
  }
}
