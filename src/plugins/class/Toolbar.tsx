import { memo } from 'react'
import { Icon, Icons, RotateIcon } from '@/components/Icons'
import { useI18n } from '@/i18n'
import type { ToolbarProps } from '@/core/types'
import type { ClassDiagramState, ClassStereotype } from './types'

interface ClassToolbarProps extends ToolbarProps<ClassDiagramState> {
  onAddClass: (stereotype: ClassStereotype) => void
}

const ClassButton = memo(({
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

ClassButton.displayName = 'ClassButton'

export const ClassToolbar = memo(({
  state,
  direction,
  editorView,
  onStateChange,
  onDirectionChange,
  onAutoLayout,
}: ClassToolbarProps) => {
  const { t } = useI18n()

  const handleAddClass = (stereotype: ClassStereotype) => {
    const id = `Class${Date.now()}`
    const name = stereotype === 'interface' ? 'INewInterface' :
                 stereotype === 'abstract' ? 'AbstractClass' :
                 stereotype === 'enum' ? 'NewEnum' : 'NewClass'

    const newClass = {
      id,
      name,
      x: 50 - (editorView?.x || 0),
      y: 50 - (editorView?.y || 0),
      stereotype,
      attributes: [],
      methods: [],
    }

    onStateChange({
      ...state,
      classes: [...state.classes, newClass]
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
      {/* Class type buttons */}
      <div className="flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar">
        <ClassButton
          icon={Icons.Class}
          title={t('classDiagram.class')}
          onClick={() => handleAddClass('none')}
        />
        <ClassButton
          icon={Icons.Interface}
          title={t('classDiagram.interface')}
          onClick={() => handleAddClass('interface')}
        />
        <ClassButton
          icon={Icons.AbstractClass}
          title={t('classDiagram.abstract')}
          onClick={() => handleAddClass('abstract')}
        />
        <ClassButton
          icon={Icons.Enum}
          title={t('classDiagram.enum')}
          onClick={() => handleAddClass('enum')}
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

ClassToolbar.displayName = 'ClassToolbar'
