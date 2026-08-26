import { memo } from 'react'
import type { StateNode, StateTransition } from './types'
import { getStateCenter, getStateBorderPoint } from './StateNode'

interface TransitionProps {
  transition: StateTransition
  states: StateNode[]
  isSelected: boolean
  scale: number
  onClick: () => void
}

export const TransitionComponent = memo(({
  transition,
  states,
  isSelected,
  scale,
  onClick
}: TransitionProps) => {
  const fromState = states.find(s => s.id === transition.from)
  const toState = states.find(s => s.id === transition.to)

  if (!fromState || !toState) return null

  const fromCenter = getStateCenter(fromState)
  const toCenter = getStateCenter(toState)

  const start = getStateBorderPoint(fromState, toCenter.x, toCenter.y)
  const end = getStateBorderPoint(toState, fromCenter.x, fromCenter.y)

  // Calculate path
  const dx = end.x - start.x
  const dy = end.y - start.y

  // Arrow marker
  const arrowSize = 8
  const angle = Math.atan2(dy, dx)
  const arrowX = end.x - arrowSize * Math.cos(angle)
  const arrowY = end.y - arrowSize * Math.sin(angle)

  const arrowPoints = [
    { x: end.x, y: end.y },
    { x: arrowX - arrowSize * 0.5 * Math.cos(angle - Math.PI / 2), y: arrowY - arrowSize * 0.5 * Math.sin(angle - Math.PI / 2) },
    { x: arrowX - arrowSize * 0.5 * Math.cos(angle + Math.PI / 2), y: arrowY - arrowSize * 0.5 * Math.sin(angle + Math.PI / 2) }
  ]

  // Label position
  const labelX = (start.x + end.x) / 2
  const labelY = (start.y + end.y) / 2 - 10

  const strokeColor = isSelected ? '#3b82f6' : '#6b7280'
  const strokeWidth = isSelected ? 2 : 1.5

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
        x2={arrowX}
        y2={arrowY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Arrow head */}
      <polygon
        points={arrowPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill={strokeColor}
      />
      {/* Label */}
      {transition.label && (
        <g>
          <rect
            x={labelX - transition.label.length * 4 - 4}
            y={labelY - 10}
            width={transition.label.length * 8 + 8}
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
            style={{ fontSize: 12 / scale }}
          >
            {transition.label}
          </text>
        </g>
      )}
    </g>
  )
})

TransitionComponent.displayName = 'TransitionComponent'
