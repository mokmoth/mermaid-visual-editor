import { memo } from 'react'
import { Icon, Icons, RotateIcon } from './Icons'
import type { EditorMode, FlowDirection, NodeType, ViewState } from '@/types'

interface HeaderProps {
  mode: EditorMode
  direction: FlowDirection
  snapToGrid: boolean
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  editorView: ViewState
  onModeChange: (mode: EditorMode) => void
  onDirectionToggle: () => void
  onSnapToGridToggle: () => void
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onAutoLayout: () => void
  onAddNode: (type: NodeType) => void
}

interface NodeButtonProps {
  type: NodeType
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

export const Header = memo(({
  mode,
  direction,
  snapToGrid,
  canUndo,
  canRedo,
  hasSelection,
  onModeChange,
  onDirectionToggle,
  onSnapToGridToggle,
  onUndo,
  onRedo,
  onDelete,
  onAutoLayout,
  onAddNode
}: HeaderProps) => {
  const nodeTypes: Array<{ type: NodeType; icon: JSX.Element; title: string }> = [
    { type: 'rect', icon: Icons.Square, title: '过程 (Rect)' },
    { type: 'round', icon: Icons.Round, title: '圆角 (Round)' },
    { type: 'stadium', icon: Icons.Stadium, title: '开始/结束 (Stadium)' },
    { type: 'subroutine', icon: Icons.Subroutine, title: '子程序 (Subroutine)' },
    { type: 'database', icon: Icons.Database, title: '数据库 (Database)' },
    { type: 'circle', icon: Icons.Circle, title: '圆形 (Circle)' },
    { type: 'rhombus', icon: Icons.Rhombus, title: '判断 (Rhombus)' },
    { type: 'hexagon', icon: Icons.Hexagon, title: '准备 (Hexagon)' },
    { type: 'parallelogram', icon: Icons.Parallelogram, title: '输入/输出 (Parallelogram)' },
  ]

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20 relative">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {/* Logo */}
        <div className="flex items-center space-x-1 mr-4 shrink-0">
          <span className="text-blue-600 font-bold text-lg">Mermaid</span>
          <span className="text-gray-500 font-medium">Visual Editor</span>
        </div>
        
        <div className="h-6 w-px bg-gray-300 mx-2 shrink-0" />
        
        {/* Node type buttons */}
        <div className="flex flex-wrap gap-1 items-center overflow-x-auto no-scrollbar">
          {nodeTypes.map(({ type, icon, title }) => (
            <NodeButton
              key={type}
              type={type}
              icon={icon}
              title={title}
              onClick={() => onAddNode(type)}
            />
          ))}
        </div>
        
        <div className="h-6 w-px bg-gray-300 mx-2 shrink-0" />
        
        {/* Mode selector */}
        <div className="flex bg-gray-100 rounded p-1 shrink-0">
          <button
            onClick={() => onModeChange('select')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm transition-colors ${
              mode === 'select' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon path={Icons.MousePointer2} size={16} />
            <span>选择</span>
          </button>
          <button
            onClick={() => onModeChange('link')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm transition-colors ${
              mode === 'link' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon path={Icons.ArrowRight} size={16} />
            <span>连线</span>
          </button>
        </div>
      </div>
      
      {/* Right side tools */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={onAutoLayout}
          className="flex items-center space-x-1 px-3 py-1.5 rounded hover:bg-gray-100 text-blue-600 font-medium transition-colors"
          title="自动排版"
        >
          <Icon path={Icons.Magic} size={16} />
          <span>排版</span>
        </button>
        
        <div className="h-6 w-px bg-gray-300 mx-1" />
        
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="撤销 (Cmd+Z)"
        >
          <Icon path={Icons.ArrowBack} size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="重做 (Cmd+Shift+Z)"
        >
          <Icon path={Icons.ArrowForward} size={16} />
        </button>
        
        <div className="h-6 w-px bg-gray-300 mx-1" />
        
        <button
          onClick={onDirectionToggle}
          className="flex items-center space-x-1 px-3 py-1.5 rounded hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <RotateIcon size={16} />
          <span>{direction === 'TD' ? '纵向' : '横向'}</span>
        </button>
        
        <div className="h-6 w-px bg-gray-300 mx-1" />
        
        <button
          onClick={onSnapToGridToggle}
          className={`p-2 rounded transition-colors ${
            snapToGrid ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="网格对齐"
        >
          <Icon path={Icons.Layout} size={16} />
        </button>
        
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="删除 (Delete)"
        >
          <Icon path={Icons.Trash2} />
        </button>
      </div>
    </header>
  )
})

Header.displayName = 'Header'
