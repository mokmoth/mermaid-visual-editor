import { memo, useState, useRef, useEffect } from 'react'
import { Icon, Icons, RotateIcon } from './Icons'
import { useI18n, Language, languageLabels } from '@/i18n'
import type { EditorMode, FlowDirection } from '@/types'

interface HeaderProps {
  mode: EditorMode
  direction: FlowDirection
  snapToGrid: boolean
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  activeDiagramType: string
  // User and diagram management props
  currentUser: string | null
  currentDiagramName: string | null
  isUserAdmin: boolean
  onModeChange: (mode: EditorMode) => void
  onDirectionToggle: () => void
  onSnapToGridToggle: () => void
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onAutoLayout: () => void
  onAddNode: (type: string) => void
  onDiagramTypeChange: (type: string) => void
  onOpenDiagramList: () => void
  onOpenAdminPanel?: () => void
  onLogout?: () => void
}

interface NodeButtonProps {
  type: string
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

// Available diagram types
const diagramTypes = [
  { id: 'flowchart', icon: Icons.Flowchart, nameKey: 'diagramTypes.flowchart' },
  { id: 'state', icon: Icons.StateDiagram, nameKey: 'diagramTypes.state' },
  { id: 'class', icon: Icons.ClassDiagram, nameKey: 'diagramTypes.classDiagram' },
  { id: 'er', icon: Icons.ERDiagram, nameKey: 'diagramTypes.erDiagram' },
  { id: 'sequence', icon: Icons.SequenceDiagram, nameKey: 'diagramTypes.sequenceDiagram' },
]

export const Header = memo(({
  mode,
  direction,
  snapToGrid,
  canUndo,
  canRedo,
  hasSelection,
  activeDiagramType,
  currentUser,
  currentDiagramName,
  isUserAdmin,
  onModeChange,
  onDirectionToggle,
  onSnapToGridToggle,
  onUndo,
  onRedo,
  onDelete,
  onAutoLayout,
  onAddNode,
  onDiagramTypeChange,
  onOpenDiagramList,
  onOpenAdminPanel,
  onLogout
}: HeaderProps) => {
  const { t, language, setLanguage } = useI18n()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showDiagramMenu, setShowDiagramMenu] = useState(false)
  const [showOverflowMenu, setShowOverflowMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [isVeryNarrow, setIsVeryNarrow] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)
  const diagramMenuRef = useRef<HTMLDivElement>(null)
  const overflowMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  // Responsive breakpoints
  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth
      setIsNarrow(width < 900)
      setIsVeryNarrow(width < 640)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false)
      }
      if (diagramMenuRef.current && !diagramMenuRef.current.contains(e.target as Node)) {
        setShowDiagramMenu(false)
      }
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeDiagram = diagramTypes.find(d => d.id === activeDiagramType) || diagramTypes[0]

  // Node types for each diagram type
  const flowchartNodeTypes: Array<{ type: string; icon: JSX.Element; titleKey: string; separator?: boolean }> = [
    { type: 'rect', icon: Icons.Square, titleKey: 'flowchart.nodes.rect' },
    { type: 'round', icon: Icons.Round, titleKey: 'flowchart.nodes.round' },
    { type: 'stadium', icon: Icons.Stadium, titleKey: 'flowchart.nodes.stadium' },
    { type: 'subroutine', icon: Icons.Subroutine, titleKey: 'flowchart.nodes.subroutine' },
    { type: 'database', icon: Icons.Database, titleKey: 'flowchart.nodes.database' },
    { type: 'circle', icon: Icons.Circle, titleKey: 'flowchart.nodes.circle' },
    { type: 'rhombus', icon: Icons.Rhombus, titleKey: 'flowchart.nodes.rhombus' },
    { type: 'hexagon', icon: Icons.Hexagon, titleKey: 'flowchart.nodes.hexagon' },
    { type: 'parallelogram', icon: Icons.Parallelogram, titleKey: 'flowchart.nodes.parallelogram' },
    { type: 'flag', icon: Icons.Flag, titleKey: 'flowchart.nodes.flag' },
    { type: 'trapezoid', icon: Icons.Trapezoid, titleKey: 'flowchart.nodes.trapezoid' },
    { type: 'trapezoid_alt', icon: Icons.TrapezoidAlt, titleKey: 'flowchart.nodes.trapezoidAlt' },
    { type: 'double_circle', icon: Icons.DoubleCircle, titleKey: 'flowchart.nodes.doubleCircle' },
    { type: 'parallelogram_alt', icon: Icons.ParallelogramAlt, titleKey: 'flowchart.nodes.parallelogramAlt' },
    { type: 'swimlane', icon: Icons.Swimlane, titleKey: 'flowchart.nodes.swimlane', separator: true },
  ]

  const stateNodeTypes: Array<{ type: string; icon: JSX.Element; titleKey: string; separator?: boolean }> = [
    { type: 'state', icon: Icons.State, titleKey: 'stateDiagram.nodes.state' },
    { type: 'start', icon: Icons.StartState, titleKey: 'stateDiagram.nodes.start' },
    { type: 'end', icon: Icons.EndState, titleKey: 'stateDiagram.nodes.end' },
    { type: 'choice', icon: Icons.Choice, titleKey: 'stateDiagram.nodes.choice' },
    { type: 'fork', icon: Icons.Fork, titleKey: 'stateDiagram.nodes.fork' },
    { type: 'join', icon: Icons.Join, titleKey: 'stateDiagram.nodes.join' },
  ]

  const classNodeTypes: Array<{ type: string; icon: JSX.Element; titleKey: string; separator?: boolean }> = [
    { type: 'class', icon: Icons.Class, titleKey: 'classDiagram.class' },
    { type: 'interface', icon: Icons.Interface, titleKey: 'classDiagram.interface' },
    { type: 'abstract', icon: Icons.AbstractClass, titleKey: 'classDiagram.abstract' },
    { type: 'enum', icon: Icons.Enum, titleKey: 'classDiagram.enum' },
  ]

  const erNodeTypes: Array<{ type: string; icon: JSX.Element; titleKey: string; separator?: boolean }> = [
    { type: 'entity', icon: Icons.Entity, titleKey: 'erDiagram.entity' },
  ]

  const sequenceNodeTypes: Array<{ type: string; icon: JSX.Element; titleKey: string; separator?: boolean }> = [
    { type: 'participant', icon: Icons.Rect, titleKey: 'sequenceDiagram.participant' },
    { type: 'actor', icon: Icons.User, titleKey: 'sequenceDiagram.actor' },
    { type: 'message', icon: Icons.Arrow, titleKey: 'sequenceDiagram.message' },
  ]

  // Get node types based on active diagram type
  const nodeTypes = activeDiagramType === 'flowchart' ? flowchartNodeTypes
    : activeDiagramType === 'state' ? stateNodeTypes
    : activeDiagramType === 'class' ? classNodeTypes
    : activeDiagramType === 'er' ? erNodeTypes
    : activeDiagramType === 'sequence' ? sequenceNodeTypes
    : flowchartNodeTypes

  const directionLabels: Record<FlowDirection, string> = {
    TD: t('header.directionTD'),
    LR: t('header.directionLR'),
    BT: t('header.directionBT'),
    RL: t('header.directionRL'),
  }

  // Overflow menu items
  const overflowMenuItems = [
    {
      label: t('header.autoLayout'),
      icon: Icons.Magic,
      onClick: () => { onAutoLayout(); setShowOverflowMenu(false) },
      className: 'text-blue-600'
    },
    { type: 'divider' as const },
    {
      label: t('common.undo'),
      icon: Icons.ArrowBack,
      onClick: () => { onUndo(); setShowOverflowMenu(false) },
      disabled: !canUndo
    },
    {
      label: t('common.redo'),
      icon: Icons.ArrowForward,
      onClick: () => { onRedo(); setShowOverflowMenu(false) },
      disabled: !canRedo
    },
    ...(activeDiagramType !== 'sequence' ? [
      { type: 'divider' as const },
      {
        label: `${t('header.direction')}: ${directionLabels[direction]}`,
        icon: null,
        customIcon: <RotateIcon size={14} />,
        onClick: () => { onDirectionToggle(); setShowOverflowMenu(false) }
      }
    ] : []),
    { type: 'divider' as const },
    {
      label: t('header.gridSnap'),
      icon: Icons.Layout,
      onClick: () => { onSnapToGridToggle(); setShowOverflowMenu(false) },
      active: snapToGrid
    },
    {
      label: t('common.delete'),
      icon: Icons.Trash2,
      onClick: () => { onDelete(); setShowOverflowMenu(false) },
      disabled: !hasSelection,
      className: 'text-red-600'
    },
    { type: 'divider' as const },
    {
      label: t('settings.language'),
      icon: Icons.Language,
      subLabel: language.toUpperCase(),
      onClick: () => setShowLangMenu(!showLangMenu)
    }
  ]

  return (
    <header ref={headerRef} className="bg-white border-b border-gray-200 shadow-sm z-40 relative">
      {/* Main Row */}
      <div className="flex items-center px-3 py-1.5 flex-wrap gap-y-1">
        {/* Logo and Diagram Management */}
        <div className="flex items-center shrink-0 gap-2">
          <span className="text-blue-600 font-bold text-base whitespace-nowrap">{t('app.name')}</span>
          
          {/* My Diagrams Button */}
          {currentUser && (
            <button
              onClick={onOpenDiagramList}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
              title="我的图表"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <span className="text-xs font-medium">我的图表</span>
            </button>
          )}

          {/* Current Diagram Name */}
          {currentDiagramName && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-blue-700 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="max-w-[120px] truncate">{currentDiagramName}</span>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-gray-300 mx-2 shrink-0" />

        {/* Diagram Type Selector */}
        <div className="relative shrink-0" ref={diagramMenuRef}>
          <button
            onClick={() => setShowDiagramMenu(!showDiagramMenu)}
            className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200"
          >
            <Icon path={activeDiagram.icon} size={14} />
            <span className="text-sm font-medium whitespace-nowrap">{t(activeDiagram.nameKey as any)}</span>
            <Icon path={Icons.ChevronDown} size={12} />
          </button>

          {showDiagramMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] py-1">
              {diagramTypes.map(diagram => (
                <button
                  key={diagram.id}
                  onClick={() => {
                    onDiagramTypeChange(diagram.id)
                    setShowDiagramMenu(false)
                  }}
                  className={`w-full flex items-center space-x-2 px-3 py-2 text-left text-sm ${
                    diagram.id === activeDiagramType
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon path={diagram.icon} size={16} />
                  <span>{t(diagram.nameKey as any)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode selector - hide for sequence diagrams */}
        {activeDiagramType !== 'sequence' && (
          <>
            <div className="h-5 w-px bg-gray-300 mx-2 shrink-0" />

            <div className="flex bg-gray-100 rounded p-0.5 shrink-0">
              <button
                onClick={() => onModeChange('select')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors whitespace-nowrap ${
                  mode === 'select' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon path={Icons.MousePointer2} size={12} />
                <span>{t('header.selectMode')}</span>
              </button>
              <button
                onClick={() => onModeChange('link')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors whitespace-nowrap ${
                  mode === 'link' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon path={Icons.ArrowRight} size={12} />
                <span>{t('header.connectMode')}</span>
              </button>
            </div>
          </>
        )}

        {/* Node type buttons - inline when not narrow */}
        {!isNarrow && (
          <>
            <div className="h-5 w-px bg-gray-300 mx-2 shrink-0" />
            <div className="flex items-center gap-0.5 shrink-0">
              {nodeTypes.map(({ type, icon, titleKey, separator }) => (
                <span key={type} className="flex items-center shrink-0">
                  {separator && <div className="w-px h-5 bg-gray-300 mx-1" />}
                  <NodeButton
                    type={type}
                    icon={icon}
                    title={t(titleKey as any)}
                    onClick={() => onAddNode(type)}
                  />
                </span>
              ))}
            </div>
          </>
        )}

        <div className="flex-1 min-w-2" />

        {/* Right side tools - show when not very narrow */}
        {!isVeryNarrow && (
          <div className="flex items-center space-x-0.5 shrink-0">
            <button
              onClick={onAutoLayout}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-gray-100 text-blue-600 font-medium transition-colors whitespace-nowrap"
              title={t('header.autoLayout')}
            >
              <Icon path={Icons.Magic} size={12} />
              <span className="text-xs">{t('header.autoLayout')}</span>
            </button>

            <div className="h-5 w-px bg-gray-300 mx-0.5" />

            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={`${t('common.undo')} (Cmd+Z)`}
            >
              <Icon path={Icons.ArrowBack} size={12} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={`${t('common.redo')} (Cmd+Shift+Z)`}
            >
              <Icon path={Icons.ArrowForward} size={12} />
            </button>

            {/* Direction toggle - hide for sequence diagrams */}
            {activeDiagramType !== 'sequence' && (
              <>
                <div className="h-5 w-px bg-gray-300 mx-0.5" />

                <button
                  onClick={onDirectionToggle}
                  className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded hover:bg-gray-100 text-gray-700 transition-colors whitespace-nowrap"
                  title={t('header.direction')}
                >
                  <RotateIcon size={12} />
                  <span className="text-xs">{directionLabels[direction]}</span>
                </button>
              </>
            )}

            <div className="h-5 w-px bg-gray-300 mx-0.5" />

            <button
              onClick={onSnapToGridToggle}
              className={`p-1 rounded transition-colors ${
                snapToGrid ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={t('header.gridSnap')}
            >
              <Icon path={Icons.Layout} size={12} />
            </button>

            <button
              onClick={onDelete}
              disabled={!hasSelection}
              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={`${t('common.delete')} (Delete)`}
            >
              <Icon path={Icons.Trash2} size={12} />
            </button>

            <div className="h-5 w-px bg-gray-300 mx-0.5" />

            {/* Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center space-x-0.5 p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                title={t('settings.language')}
              >
                <Icon path={Icons.Language} size={12} />
                <span className="text-xs">{language.toUpperCase()}</span>
              </button>

              {showLangMenu && (
                <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] py-1">
                  {(Object.keys(languageLabels) as Language[]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang)
                        setShowLangMenu(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        lang === language ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {languageLabels[lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Info */}
            {currentUser && (
              <>
                <div className="h-5 w-px bg-gray-300 mx-0.5" />
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                    title={currentUser}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span className="text-xs max-w-[60px] truncate">{currentUser}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] py-1">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">当前用户</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-800 truncate">{currentUser}</p>
                          {isUserAdmin && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded font-medium">
                              管理员
                            </span>
                          )}
                        </div>
                      </div>
                      {isUserAdmin && onOpenAdminPanel && (
                        <button
                          onClick={() => {
                            onOpenAdminPanel()
                            setShowUserMenu(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          管理面板
                        </button>
                      )}
                      {onLogout && (
                        <button
                          onClick={() => {
                            onLogout()
                            setShowUserMenu(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                          </svg>
                          切换用户
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Overflow menu button - show when very narrow */}
        {isVeryNarrow && (
          <div className="relative shrink-0" ref={overflowMenuRef}>
            <button
              onClick={() => setShowOverflowMenu(!showOverflowMenu)}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              title="更多选项"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>

            {showOverflowMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] py-1">
                {overflowMenuItems.map((item, index) => {
                  if ('type' in item && item.type === 'divider') {
                    return <div key={index} className="h-px bg-gray-200 my-1" />
                  }
                  const menuItem = item as { label: string; icon?: any; customIcon?: JSX.Element; onClick: () => void; disabled?: boolean; active?: boolean; className?: string; subLabel?: string }
                  return (
                    <button
                      key={index}
                      onClick={menuItem.onClick}
                      disabled={menuItem.disabled}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                        menuItem.active ? 'bg-blue-50' : ''
                      } ${menuItem.className || 'text-gray-700'}`}
                    >
                      <span className="flex items-center space-x-2">
                        {menuItem.customIcon || (menuItem.icon && <Icon path={menuItem.icon} size={14} />)}
                        <span>{menuItem.label}</span>
                      </span>
                      {menuItem.subLabel && (
                        <span className="text-xs text-gray-500">{menuItem.subLabel}</span>
                      )}
                    </button>
                  )
                })}

                {/* Language submenu */}
                {showLangMenu && (
                  <div className="border-t border-gray-200 mt-1 pt-1">
                    {(Object.keys(languageLabels) as Language[]).map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang)
                          setShowLangMenu(false)
                          setShowOverflowMenu(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          lang === language ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {languageLabels[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Node type buttons (only when narrow) */}
      {isNarrow && (
        <div className="flex items-center px-3 py-1 border-t border-gray-100 overflow-x-auto">
          <div className="flex items-center gap-0.5">
            {nodeTypes.map(({ type, icon, titleKey, separator }) => (
              <span key={type} className="flex items-center shrink-0">
                {separator && <div className="w-px h-5 bg-gray-300 mx-1" />}
                <NodeButton
                  type={type}
                  icon={icon}
                  title={t(titleKey as any)}
                  onClick={() => onAddNode(type)}
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  )
})

Header.displayName = 'Header'
