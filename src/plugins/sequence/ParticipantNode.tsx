import { memo, useCallback } from 'react'
import type { Participant } from './types'
import { activateOnEnterOrSpace, interactiveA11y } from '@/utils/a11y'

interface ParticipantNodeProps {
  participant: Participant
  x: number
  y: number
  timelineHeight: number
  isSelected: boolean
  scale: number
  onPointerDown: (e: React.PointerEvent) => void
  onDoubleClick: () => void
}

const PARTICIPANT_WIDTH = 100
const PARTICIPANT_HEIGHT = 40
const ACTOR_SIZE = 50

export const ParticipantNodeComponent = memo(({
  participant,
  x,
  y,
  timelineHeight,
  isSelected,
  scale,
  onPointerDown,
  onDoubleClick
}: ParticipantNodeProps) => {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    onPointerDown(e)
  }, [onPointerDown])

  const strokeColor = isSelected ? '#3b82f6' : '#9ca3af'
  const strokeWidth = isSelected ? 2 : 1.5

  // Calculate center position
  const centerX = x + PARTICIPANT_WIDTH / 2

  if (participant.type === 'actor') {
    // Draw stick figure actor
    const headRadius = 10
    const bodyTop = y + headRadius * 2 + 5
    const bodyBottom = bodyTop + 20
    const armY = bodyTop + 8
    const legBottom = bodyBottom + 15

    return (
      <g
        {...interactiveA11y(participant.name, isSelected)}
        onPointerDown={handlePointerDown}
        onDoubleClick={onDoubleClick}
        onKeyDown={(e) => activateOnEnterOrSpace(e, () => handlePointerDown(e as unknown as React.PointerEvent))}
        style={{ cursor: 'move' }}
      >
        {/* Timeline (dashed line) */}
        <line
          x1={centerX}
          y1={legBottom + 10}
          x2={centerX}
          y2={legBottom + 10 + timelineHeight}
          stroke="#d1d5db"
          strokeWidth={1}
          strokeDasharray="5,5"
        />

        {/* Head */}
        <circle
          cx={centerX}
          cy={y + headRadius + 5}
          r={headRadius}
          fill="white"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Body */}
        <line
          x1={centerX}
          y1={bodyTop}
          x2={centerX}
          y2={bodyBottom}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Arms */}
        <line
          x1={centerX - 15}
          y1={armY}
          x2={centerX + 15}
          y2={armY}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Legs */}
        <line
          x1={centerX}
          y1={bodyBottom}
          x2={centerX - 12}
          y2={legBottom}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        <line
          x1={centerX}
          y1={bodyBottom}
          x2={centerX + 12}
          y2={legBottom}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Name label */}
        <text
          x={centerX}
          y={legBottom + 20}
          textAnchor="middle"
          className="fill-gray-800 pointer-events-none select-none"
          style={{ fontSize: 12 / scale }}
        >
          {participant.alias || participant.name}
        </text>
      </g>
    )
  }

  // Draw rectangular participant
  return (
    <g
      {...interactiveA11y(participant.name, isSelected)}
      onPointerDown={handlePointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => activateOnEnterOrSpace(e, () => handlePointerDown(e as unknown as React.PointerEvent))}
      style={{ cursor: 'move' }}
    >
      {/* Timeline (dashed line) */}
      <line
        x1={centerX}
        y1={y + PARTICIPANT_HEIGHT}
        x2={centerX}
        y2={y + PARTICIPANT_HEIGHT + timelineHeight}
        stroke="#d1d5db"
        strokeWidth={1}
        strokeDasharray="5,5"
      />

      {/* Participant box */}
      <rect
        x={x}
        y={y}
        width={PARTICIPANT_WIDTH}
        height={PARTICIPANT_HEIGHT}
        rx={4}
        fill="white"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Name label */}
      <text
        x={centerX}
        y={y + PARTICIPANT_HEIGHT / 2 + 4}
        textAnchor="middle"
        className="fill-gray-800 pointer-events-none select-none"
        style={{ fontSize: 12 / scale }}
      >
        {participant.alias || participant.name}
      </text>

      {/* Bottom box (mirrored) */}
      <rect
        x={x}
        y={y + PARTICIPANT_HEIGHT + timelineHeight}
        width={PARTICIPANT_WIDTH}
        height={PARTICIPANT_HEIGHT}
        rx={4}
        fill="white"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      <text
        x={centerX}
        y={y + PARTICIPANT_HEIGHT + timelineHeight + PARTICIPANT_HEIGHT / 2 + 4}
        textAnchor="middle"
        className="fill-gray-800 pointer-events-none select-none"
        style={{ fontSize: 12 / scale }}
      >
        {participant.alias || participant.name}
      </text>
    </g>
  )
})

ParticipantNodeComponent.displayName = 'ParticipantNodeComponent'

export const PARTICIPANT_WIDTH_CONST = PARTICIPANT_WIDTH
export const PARTICIPANT_HEIGHT_CONST = PARTICIPANT_HEIGHT
export const ACTOR_SIZE_CONST = ACTOR_SIZE
