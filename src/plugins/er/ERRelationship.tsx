import { memo } from 'react'
import type { Entity, ERRelationship, Cardinality } from './types'
import { getEntityCenter, getEntityBorderPoint } from './EntityNode'

interface ERRelationshipProps {
  relationship: ERRelationship
  entities: Entity[]
  isSelected: boolean
  scale: number
  onClick: () => void
}

export const ERRelationshipComponent = memo(({
  relationship,
  entities,
  isSelected,
  scale,
  onClick
}: ERRelationshipProps) => {
  const fromEntity = entities.find(e => e.id === relationship.from)
  const toEntity = entities.find(e => e.id === relationship.to)

  if (!fromEntity || !toEntity) return null

  const fromCenter = getEntityCenter(fromEntity)
  const toCenter = getEntityCenter(toEntity)

  const start = getEntityBorderPoint(fromEntity, toCenter.x, toCenter.y)
  const end = getEntityBorderPoint(toEntity, fromCenter.x, fromCenter.y)

  const strokeColor = isSelected ? '#3b82f6' : '#6b7280'
  const strokeWidth = isSelected ? 2 : 1.5

  // Calculate angle for markers
  const dx = end.x - start.x
  const dy = end.y - start.y
  const angle = Math.atan2(dy, dx)

  // Label position
  const labelX = (start.x + end.x) / 2
  const labelY = (start.y + end.y) / 2 - 10

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Invisible wider line for easier clicking */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="transparent"
        strokeWidth={16}
      />
      {/* Visible line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* From cardinality marker */}
      {renderCardinalityMarker(
        relationship.fromCardinality,
        start.x,
        start.y,
        angle,
        strokeColor,
        strokeWidth
      )}

      {/* To cardinality marker */}
      {renderCardinalityMarker(
        relationship.toCardinality,
        end.x,
        end.y,
        angle + Math.PI,
        strokeColor,
        strokeWidth
      )}

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
    </g>
  )
})

ERRelationshipComponent.displayName = 'ERRelationshipComponent'

function crowsFoot(
  x: number,
  y: number,
  angle: number,
  stroke: string,
  strokeWidth: number
) {
  const cos = Math.cos
  const sin = Math.sin
  const stem = 12
  const toe = 7
  const perp = angle + Math.PI / 2
  const meetX = x + stem * cos(angle)
  const meetY = y + stem * sin(angle)
  return (
    <g>
      <line x1={meetX} y1={meetY} x2={x} y2={y} stroke={stroke} strokeWidth={strokeWidth} />
      <line
        x1={meetX}
        y1={meetY}
        x2={x + toe * cos(perp)}
        y2={y + toe * sin(perp)}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <line
        x1={meetX}
        y1={meetY}
        x2={x - toe * cos(perp)}
        y2={y - toe * sin(perp)}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  )
}

function renderCardinalityMarker(
  cardinality: Cardinality,
  x: number,
  y: number,
  angle: number,
  stroke: string,
  strokeWidth: number
) {
  const cos = Math.cos
  const sin = Math.sin

  // Offset from the border point
  const offset = 15
  const markerX = x + offset * cos(angle)
  const markerY = y + offset * sin(angle)

  // Perpendicular offset for marker width
  const perpAngle = angle + Math.PI / 2
  const perpOffset = 8

  switch (cardinality) {
    case '||': {
      // Two vertical lines (exactly one)
      return (
        <g>
          <line
            x1={markerX + 3 * cos(angle) + perpOffset * cos(perpAngle)}
            y1={markerY + 3 * sin(angle) + perpOffset * sin(perpAngle)}
            x2={markerX + 3 * cos(angle) - perpOffset * cos(perpAngle)}
            y2={markerY + 3 * sin(angle) - perpOffset * sin(perpAngle)}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line
            x1={markerX - 3 * cos(angle) + perpOffset * cos(perpAngle)}
            y1={markerY - 3 * sin(angle) + perpOffset * sin(perpAngle)}
            x2={markerX - 3 * cos(angle) - perpOffset * cos(perpAngle)}
            y2={markerY - 3 * sin(angle) - perpOffset * sin(perpAngle)}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    }

    case '|o': {
      // One line and circle (zero or one)
      return (
        <g>
          <line
            x1={markerX - 6 * cos(angle) + perpOffset * cos(perpAngle)}
            y1={markerY - 6 * sin(angle) + perpOffset * sin(perpAngle)}
            x2={markerX - 6 * cos(angle) - perpOffset * cos(perpAngle)}
            y2={markerY - 6 * sin(angle) - perpOffset * sin(perpAngle)}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={markerX + 4 * cos(angle)}
            cy={markerY + 4 * sin(angle)}
            r={5}
            fill="white"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    }

    case '}|': {
      return (
        <g>
          {crowsFoot(x, y, angle, stroke, strokeWidth)}
          <line
            x1={markerX + 4 * cos(angle) + perpOffset * cos(perpAngle)}
            y1={markerY + 4 * sin(angle) + perpOffset * sin(perpAngle)}
            x2={markerX + 4 * cos(angle) - perpOffset * cos(perpAngle)}
            y2={markerY + 4 * sin(angle) - perpOffset * sin(perpAngle)}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    }

    case '}o': {
      return (
        <g>
          {crowsFoot(x, y, angle, stroke, strokeWidth)}
          <circle
            cx={markerX + 6 * cos(angle)}
            cy={markerY + 6 * sin(angle)}
            r={4.5}
            fill="white"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    }

    default:
      return null
  }
}
