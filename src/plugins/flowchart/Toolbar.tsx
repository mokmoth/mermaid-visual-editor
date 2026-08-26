import { memo } from 'react'
import { Icon, Icons, RotateIcon } from '@/components/Icons'
import { useI18n } from '@/i18n'
import type { ToolbarProps } from '@/core/types'
import type { FlowchartState, FlowNodeType } from './types'
import { FLOWCHART_NODE_TYPES } from './types'

// Map icon keys to actual icons
const iconMap: Record<string, JSX.Element> = {
  Square: Icons.Square,
  Round: Icons.Round,
  Stadium: Icons.Stadium,
  Subroutine: Icons.Subroutine,
  Database: Icons.Database,
  Circle: Icons.Circle,
  Rhombus: Icons.Rhombus,
  Hexagon: Icons.Hexagon,
  Parallelogram: Icons.Parallelogram,
  Flag: Icons.Flag,
  Trapezoid: Icons.Trapezoid,
  TrapezoidAlt: Icons.TrapezoidAlt,
  DoubleCircle: Icons.DoubleCircle,
  ParallelogramAlt: Icons.ParallelogramAlt,
}

interface NodeButtonProps {
  icon: JSX.Element
  title: string
  onClick: () => void
}

const NodeButton = memo(({ icon, title, onClick }: NodeButtonProps) => (
  <button
    onClick={onClick}
    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 shrink-0 transition-colors"
    title={title}
  >
    <Icon path={icon} />
  </button>
))

NodeButton.displayName = 'NodeButton'

interface FlowchartToolbarProps extends ToolbarProps<FlowchartState> {
  onAddNode?: (type: FlowNodeType) => void
}

export const FlowchartToolbar = memo(({
  state,
  direction,
  editorView,
  onStateChange,
  onDirectionChange,
  onAutoLayout,
}: FlowchartToolbarProps) => {
  const { t } = useI18n()

  const handleAddNode = (type: FlowNodeType) => {
    const id = `Node${Date.now()}`
    const labels: Record<string, string> = {
      rect: t('flowchart.labels.rect'),
      round: t('flowchart.labels.round'),
      stadium: t('flowchart.labels.stadium'),
      subroutine: t('flowchart.labels.subroutine'),
      database: t('flowchart.labels.database'),
      circle: t('flowchart.labels.circle'),
      rhombus: t('flowchart.labels.rhombus'),
      hexagon: t('flowchart.labels.hexagon'),
      parallelogram: t('flowchart.labels.parallelogram'),
      flag: t('flowchart.labels.flag'),
      trapezoid: t('flowchart.labels.trapezoid'),
      trapezoid_alt: t('flowchart.labels.trapezoidAlt'),
      double_circle: t('flowchart.labels.doubleCircle'),
      parallelogram_alt: t('flowchart.labels.parallelogramAlt')
    }

    const newNode = {
      id,
      type,
      x: 50 - (editorView?.x || 0),
      y: 50 - (editorView?.y || 0),
      label: labels[type] || t('flowchart.labels.rect')
    }

    onStateChange({
      ...state,
      nodes: [...state.nodes, newNode]
    })
  }

  const handleDirectionToggle = () => {
    const directions: Array<'TD' | 'LR' | 'BT' | 'RL'> = ['TD', 'LR', 'BT', 'RL']
    const currentIndex = directions.indexOf(direction)
    const newDir = directions[(currentIndex + 1) % directions.length]
    onDirectionChange(newDir)
  }

  const directionLabels: Record<string, string> = {
    TD: t('header.directionTD'),
    LR: t('header.directionLR'),
    BT: t('header.directionBT'),
    RL: t('header.directionRL'),
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* Node type buttons */}
      <div className="flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar">
        {FLOWCHART_NODE_TYPES.map(({ type, iconKey, labelKey }) => (
          <NodeButton
            key={type}
            icon={iconMap[iconKey]}
            title={t(labelKey as any)}
            onClick={() => handleAddNode(type)}
          />
        ))}
      </div>

      {/* Right side tools */}
      <div className="flex items-center space-x-2 shrink-0 ml-4">
        <button
          onClick={onAutoLayout}
          className="flex items-center space-x-1 px-3 py-1.5 rounded hover:bg-gray-100 text-blue-600 font-medium transition-colors"
          title={t('header.autoLayout')}
        >
          <Icon path={Icons.Magic} size={16} />
          <span>{t('header.autoLayout')}</span>
        </button>

        <div className="h-6 w-px bg-gray-300 mx-1" />

        <button
          onClick={handleDirectionToggle}
          className="flex items-center space-x-1 px-3 py-1.5 rounded hover:bg-gray-100 text-gray-700 transition-colors"
          title={t('header.direction')}
        >
          <RotateIcon size={16} />
          <span>{directionLabels[direction]}</span>
        </button>
      </div>
    </div>
  )
})

FlowchartToolbar.displayName = 'FlowchartToolbar'
