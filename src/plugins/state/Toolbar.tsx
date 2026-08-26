import { memo } from 'react'
import { Icon, Icons, RotateIcon } from '@/components/Icons'
import { useI18n } from '@/i18n'
import type { ToolbarProps } from '@/core/types'
import type { StateDiagramState, StateNodeType } from './types'

interface StateToolbarProps extends ToolbarProps<StateDiagramState> {
  onAddState: (type: StateNodeType) => void
}

const StateButton = memo(({
  icon,
  title,
  onClick
}: {
  icon: JSX.Element
  title: string
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 shrink-0 transition-colors"
    title={title}
  >
    <Icon path={icon} />
  </button>
))

StateButton.displayName = 'StateButton'

export const StateToolbar = memo(({
  state,
  direction,
  editorView,
  onStateChange,
  onDirectionChange,
  onAutoLayout,
}: StateToolbarProps) => {
  const { t } = useI18n()

  const handleAddState = (type: StateNodeType) => {
    const id = type === 'state' ? `State${Date.now()}` : `${type}${Date.now()}`
    const name = type === 'state' ? t('stateDiagram.labels.newState') : ''

    const newState = {
      id,
      name,
      type,
      x: 50 - (editorView?.x || 0),
      y: 50 - (editorView?.y || 0),
    }

    onStateChange({
      ...state,
      states: [...state.states, newState]
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
      {/* State type buttons */}
      <div className="flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar">
        <StateButton
          icon={Icons.State}
          title={t('stateDiagram.nodes.state')}
          onClick={() => handleAddState('state')}
        />
        <StateButton
          icon={Icons.StartState}
          title={t('stateDiagram.nodes.start')}
          onClick={() => handleAddState('start')}
        />
        <StateButton
          icon={Icons.EndState}
          title={t('stateDiagram.nodes.end')}
          onClick={() => handleAddState('end')}
        />
        <StateButton
          icon={Icons.Choice}
          title={t('stateDiagram.nodes.choice')}
          onClick={() => handleAddState('choice')}
        />
        <StateButton
          icon={Icons.Fork}
          title={t('stateDiagram.nodes.fork')}
          onClick={() => handleAddState('fork')}
        />
        <StateButton
          icon={Icons.Join}
          title={t('stateDiagram.nodes.join')}
          onClick={() => handleAddState('join')}
        />
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

StateToolbar.displayName = 'StateToolbar'
