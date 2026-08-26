import { memo } from 'react'
import { Icon, Icons, RotateIcon } from '@/components/Icons'
import { useI18n } from '@/i18n'
import type { ToolbarProps } from '@/core/types'
import type { ERDiagramState } from './types'

interface ERToolbarProps extends ToolbarProps<ERDiagramState> {
  onAddEntity: () => void
}

export const ERToolbar = memo(({
  state,
  direction,
  editorView,
  onStateChange,
  onDirectionChange,
  onAutoLayout,
}: ERToolbarProps) => {
  const { t } = useI18n()

  const handleAddEntity = () => {
    const id = `ENTITY${Date.now()}`

    const newEntity = {
      id,
      name: 'NEW_ENTITY',
      x: 50 - (editorView?.x || 0),
      y: 50 - (editorView?.y || 0),
      attributes: [
        { id: 'a1', name: 'id', type: 'INT' as const, isPK: true }
      ],
    }

    onStateChange({
      ...state,
      entities: [...state.entities, newEntity]
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
      {/* Entity button */}
      <div className="flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar">
        <button
          onClick={handleAddEntity}
          className="flex items-center space-x-1 px-3 py-1.5 hover:bg-gray-100 rounded text-gray-700 transition-colors"
          title={t('erDiagram.entity')}
        >
          <Icon path={Icons.Entity} />
          <span className="text-sm">{t('erDiagram.entity')}</span>
        </button>
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

ERToolbar.displayName = 'ERToolbar'
