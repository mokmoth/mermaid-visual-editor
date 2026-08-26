import { memo } from 'react'
import type { Message, Participant } from './types'
import { PARTICIPANT_WIDTH_CONST } from './ParticipantNode'

interface MessageLineProps {
  message: Message
  participants: Participant[]
  participantSpacing: number
  baseY: number
  messageSpacing: number
  isSelected: boolean
  scale: number
  onClick: () => void
}

export const MessageLineComponent = memo(({
  message,
  participants,
  participantSpacing,
  baseY,
  messageSpacing,
  isSelected,
  scale,
  onClick
}: MessageLineProps) => {
  const fromParticipant = participants.find(p => p.id === message.from)
  const toParticipant = participants.find(p => p.id === message.to)

  if (!fromParticipant || !toParticipant) return null

  const getParticipantCenterX = (p: Participant) => {
    return 50 + p.order * participantSpacing + PARTICIPANT_WIDTH_CONST / 2
  }

  const fromX = getParticipantCenterX(fromParticipant)
  const toX = getParticipantCenterX(toParticipant)
  const y = baseY + message.order * messageSpacing

  const isSelfMessage = message.from === message.to
  const isLeftToRight = fromX < toX

  const strokeColor = isSelected ? '#3b82f6' : '#374151'
  const strokeWidth = isSelected ? 2 : 1.5
  const isDotted = message.type.includes('dotted')

  // Arrow marker ID
  const markerId = `arrow-${message.id}-${isSelected ? 'selected' : 'normal'}`

  // Determine arrow head type
  const getArrowHead = () => {
    if (message.type.includes('cross')) {
      return 'cross'
    }
    if (message.type.includes('open')) {
      return 'open'
    }
    return 'filled'
  }

  const arrowType = getArrowHead()

  if (isSelfMessage) {
    // Self-referencing message (loop back)
    const loopWidth = 40
    const loopHeight = 30

    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        <defs>
          {arrowType === 'filled' && (
            <marker
              id={markerId}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
            </marker>
          )}
          {arrowType === 'open' && (
            <marker
              id={markerId}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L9,3 L0,6" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            </marker>
          )}
        </defs>

        {/* Self loop path */}
        <path
          d={`M ${fromX} ${y}
              L ${fromX + loopWidth} ${y}
              L ${fromX + loopWidth} ${y + loopHeight}
              L ${fromX + 5} ${y + loopHeight}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isDotted ? '5,5' : undefined}
          markerEnd={arrowType !== 'cross' ? `url(#${markerId})` : undefined}
        />

        {/* Cross end if needed */}
        {arrowType === 'cross' && (
          <>
            <line
              x1={fromX + 5 - 5}
              y1={y + loopHeight - 5}
              x2={fromX + 5 + 5}
              y2={y + loopHeight + 5}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line
              x1={fromX + 5 - 5}
              y1={y + loopHeight + 5}
              x2={fromX + 5 + 5}
              y2={y + loopHeight - 5}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </>
        )}

        {/* Message text */}
        <text
          x={fromX + loopWidth + 5}
          y={y + loopHeight / 2 + 4}
          className="fill-gray-700 pointer-events-none select-none"
          style={{ fontSize: 11 / scale }}
        >
          {message.text}
        </text>
      </g>
    )
  }

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        {arrowType === 'filled' && (
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
          </marker>
        )}
        {arrowType === 'open' && (
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L9,3 L0,6" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          </marker>
        )}
      </defs>

      {/* Invisible wider line for easier clicking */}
      <line
        x1={fromX}
        y1={y}
        x2={toX}
        y2={y}
        stroke="transparent"
        strokeWidth={15}
      />

      {/* Visible line */}
      <line
        x1={fromX}
        y1={y}
        x2={toX - (isLeftToRight ? 10 : -10)}
        y2={y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isDotted ? '5,5' : undefined}
        markerEnd={arrowType !== 'cross' ? `url(#${markerId})` : undefined}
      />

      {/* Cross end if needed */}
      {arrowType === 'cross' && (
        <>
          <line
            x1={toX - 5}
            y1={y - 5}
            x2={toX + 5}
            y2={y + 5}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={toX - 5}
            y1={y + 5}
            x2={toX + 5}
            y2={y - 5}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </>
      )}

      {/* Message text */}
      <text
        x={(fromX + toX) / 2}
        y={y - 8}
        textAnchor="middle"
        className="fill-gray-700 pointer-events-none select-none"
        style={{ fontSize: 11 / scale }}
      >
        {message.text}
      </text>

      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={Math.min(fromX, toX) - 5}
          y={y - 15}
          width={Math.abs(toX - fromX) + 10}
          height={20}
          fill="rgba(59, 130, 246, 0.1)"
          rx={4}
          pointerEvents="none"
        />
      )}
    </g>
  )
})

MessageLineComponent.displayName = 'MessageLineComponent'
