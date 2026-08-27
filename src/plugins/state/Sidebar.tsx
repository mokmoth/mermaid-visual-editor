import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '@/i18n'
import type { SidebarProps } from '@/core/types'
import type { StateDiagramState, StateNode } from './types'
import { Icon, Icons } from '@/components/Icons'
import { ResizableDivider } from '@/components/ResizableDivider'
import { FullscreenPortal } from '@/components/FullscreenPortal'
import { usePanelHeights } from '@/hooks/usePanelHeights'
import { getStateNodeSize } from './StateNode'
import { calculateFitToView, calculateItemsBounds } from '@/utils/geometry'

interface StateSidebarProps extends SidebarProps<StateDiagramState> {
  // Extended props if needed
  generatedCode?: string
  mermaidError?: string | null
  isFullscreen?: boolean
  previewView?: any
  onCodeChange?: (code: string) => void
  onCodeBlur?: () => void
  onFullscreenToggle?: () => void
  onPreviewViewChange?: (view: any) => void
  mermaidRef?: React.RefObject<HTMLDivElement>
  onLinkTypeChange?: (type: any) => void
  onLinkArrowChange?: (arrow: any) => void
  compact?: boolean
}

export const StateSidebar = memo(({
  state,
  selection,
  multiSelectCount,
  snapToGrid,
  onStateChange,
  onAlignNodes,
  onSnapToGridChange,
  generatedCode,
  mermaidError,
  isFullscreen,
  previewView,
  onCodeChange,
  onCodeBlur,
  onFullscreenToggle,
  onPreviewViewChange,
  mermaidRef,
  compact = false,
}: StateSidebarProps) => {
  const { t } = useI18n()
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const {
    rootRef,
    propertiesHeight,
    codeHeight,
    handlePropertiesResize,
    handleCodeResize
  } = usePanelHeights({
    propsKey: 'mermaid-editor-state-properties-height',
    codeKey: 'mermaid-editor-state-code-height',
    defaultProps: 200,
    defaultCode: 150,
    compact,
    hasSelection: !!selection
  })
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Track spacebar state for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Non-passive wheel event listener
  useEffect(() => {
    const container = previewContainerRef.current
    if (!container || !previewView || !onPreviewViewChange) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = container.getBoundingClientRect()

      if (e.ctrlKey || e.metaKey) {
        const scaleAmount = -e.deltaY * 0.01
        const newScale = Math.min(Math.max(0.2, previewView.scale + scaleAmount), 5)
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const worldX = (mouseX - previewView.x) / previewView.scale
        const worldY = (mouseY - previewView.y) / previewView.scale
        onPreviewViewChange({
          x: mouseX - worldX * newScale,
          y: mouseY - worldY * newScale,
          scale: newScale
        })
      } else {
        onPreviewViewChange({
          x: previewView.x - e.deltaX,
          y: previewView.y - e.deltaY,
          scale: previewView.scale
        })
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [previewView, onPreviewViewChange])

  // Fit preview content to view
  const handlePreviewFitToView = useCallback(() => {
    const container = previewContainerRef.current
    if (!container || !onPreviewViewChange) return

    const rect = container.getBoundingClientRect()
    const bounds = calculateItemsBounds(state.states, getStateNodeSize)
    const newView = calculateFitToView(bounds, rect.width, rect.height)
    onPreviewViewChange(newView)
  }, [previewContainerRef, state.states, onPreviewViewChange])

  const selectedState = useMemo(() => {
    if (selection?.type === 'state') {
      return state.states.find(s => s.id === selection.id)
    }
    return null
  }, [selection, state.states])

  const selectedTransition = useMemo(() => {
    if (selection?.type === 'transition') {
      return state.transitions.find(t => t.id === selection.id)
    }
    return null
  }, [selection, state.transitions])

  const handleStateNameChange = (name: string) => {
    if (!selectedState) return
    onStateChange({
      ...state,
      states: state.states.map(s =>
        s.id === selectedState.id ? { ...s, name } : s
      )
    })
  }

  const handleTransitionLabelChange = (label: string) => {
    if (!selectedTransition) return
    onStateChange({
      ...state,
      transitions: state.transitions.map(t =>
        t.id === selectedTransition.id ? { ...t, label } : t
      )
    })
  }

  const handleStateTypeChange = (type: StateNode['type']) => {
    if (!selectedState) return
    onStateChange({
      ...state,
      states: state.states.map(s =>
        s.id === selectedState.id ? { ...s, type, name: type === 'state' ? s.name : '' } : s
      )
    })
  }

  const handleStateDescriptionChange = (description: string) => {
    if (!selectedState) return
    onStateChange({
      ...state,
      states: state.states.map(s =>
        s.id === selectedState.id ? { ...s, description } : s
      )
    })
  }

  const handleTransitionGuardChange = (guard: string) => {
    if (!selectedTransition) return
    onStateChange({
      ...state,
      transitions: state.transitions.map(t =>
        t.id === selectedTransition.id ? { ...t, guard } : t
      )
    })
  }

  const handleTransitionActionChange = (action: string) => {
    if (!selectedTransition) return
    onStateChange({
      ...state,
      transitions: state.transitions.map(t =>
        t.id === selectedTransition.id ? { ...t, action } : t
      )
    })
  }

  return (
    <div ref={rootRef} className="w-full h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Properties Section */}
      <div
        className="border-b border-gray-200 overflow-y-auto flex-shrink-0"
        style={{ height: isFullscreen ? 0 : propertiesHeight }}
      >
        <div className="p-4">
        <h3 className="font-medium text-gray-700 mb-3">{t('sidebar.properties')}</h3>

        {selectedState && (
          <div className="space-y-3">
            {selectedState.type === 'state' && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {t('stateDiagram.labels.name')}
                  </label>
                  <input
                    type="text"
                    value={selectedState.name}
                    onChange={(e) => handleStateNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Description
                  </label>
                  <textarea
                    value={selectedState.description || ''}
                    onChange={(e) => handleStateDescriptionChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="State description (optional)"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t('stateDiagram.labels.type')}
              </label>
              <select
                value={selectedState.type}
                onChange={(e) => handleStateTypeChange(e.target.value as StateNode['type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="state">{t('stateDiagram.nodes.state')}</option>
                <option value="start">{t('stateDiagram.nodes.start')}</option>
                <option value="end">{t('stateDiagram.nodes.end')}</option>
                <option value="choice">{t('stateDiagram.nodes.choice')}</option>
                <option value="fork">{t('stateDiagram.nodes.fork')}</option>
                <option value="join">{t('stateDiagram.nodes.join')}</option>
              </select>
            </div>
          </div>
        )}

        {selectedTransition && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t('stateDiagram.labels.transitionLabel')} (Event)
              </label>
              <input
                type="text"
                value={selectedTransition.label || ''}
                onChange={(e) => handleTransitionLabelChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('stateDiagram.labels.eventName')}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Guard Condition
              </label>
              <input
                type="text"
                value={selectedTransition.guard || ''}
                onChange={(e) => handleTransitionGuardChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="[condition]"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Action
              </label>
              <input
                type="text"
                value={selectedTransition.action || ''}
                onChange={(e) => handleTransitionActionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/ action"
              />
            </div>

            <div className="text-xs text-gray-500">
              <p>{t('stateDiagram.labels.from')}: {selectedTransition.from}</p>
              <p>{t('stateDiagram.labels.to')}: {selectedTransition.to}</p>
            </div>
          </div>
        )}

        {!selectedState && !selectedTransition && (
          <p className="text-sm text-gray-500">
            {t('sidebar.noSelection')}
          </p>
        )}
        </div>

        {/* Multi-select alignment */}
        {multiSelectCount > 1 && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('sidebar.alignment')}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAlignNodes('left')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {t('sidebar.alignLeft')}
              </button>
              <button
                onClick={() => onAlignNodes('center')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {t('sidebar.alignCenter')}
              </button>
              <button
                onClick={() => onAlignNodes('right')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {t('sidebar.alignRight')}
              </button>
              <button
                onClick={() => onAlignNodes('top')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {t('sidebar.alignTop')}
              </button>
              <button
                onClick={() => onAlignNodes('middle')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {t('sidebar.alignMiddle')}
              </button>
              <button
                onClick={() => onAlignNodes('bottom')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {t('sidebar.alignBottom')}
              </button>
            </div>
          </div>
        )}

        {/* Grid snap option */}
        <div className="p-4 border-t border-gray-200">
          <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => onSnapToGridChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('sidebar.snapToGrid')}</span>
          </label>
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <p>{t('stateDiagram.stats.states')}: {state.states.length}</p>
          <p>{t('stateDiagram.stats.transitions')}: {state.transitions.length}</p>
        </div>
      </div>

      {/* Properties/Code Resizer */}
      {!isFullscreen && (
        <ResizableDivider orientation="vertical" onResize={handlePropertiesResize} touchFriendly={compact} />
      )}

      {/* Code Section */}
      <div className="flex flex-col flex-shrink-0" style={{ height: isFullscreen ? 0 : codeHeight }}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">{t('sidebar.mermaidCode')}</span>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <textarea
            value={generatedCode || ''}
            onChange={(e) => onCodeChange?.(e.target.value)}
            onBlur={() => onCodeBlur?.()}
            className="w-full h-full p-3 text-xs font-mono bg-gray-50 border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            spellCheck={false}
          />
        </div>
        {mermaidError && (
          <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-200 flex-shrink-0">
            {mermaidError}
          </div>
        )}
      </div>

      {/* Code/Preview Resizer */}
      {!isFullscreen && (
        <ResizableDivider orientation="vertical" onResize={handleCodeResize} touchFriendly={compact} />
      )}

      {/* Preview Section */}
      <FullscreenPortal active={!!isFullscreen}>
      <div className={`border-t border-gray-200 flex flex-col bg-white ${isFullscreen ? 'h-full' : 'flex-1 min-h-0'}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">{t('sidebar.preview')}</span>
          <button
            type="button"
            onClick={() => onFullscreenToggle?.()}
            className={`${compact || isFullscreen ? 'min-h-[44px] min-w-[44px] px-2' : 'p-1'} hover:bg-gray-200 rounded`}
            title={isFullscreen ? t('sidebar.exitFullscreen') : t('sidebar.fullscreen')}
          >
            <Icon path={isFullscreen ? Icons.ExitFullscreen : Icons.Fullscreen} size={16} />
          </button>
        </div>
        <div
          ref={previewContainerRef}
          className={`flex-1 overflow-auto bg-white ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          onPointerDown={(e) => {
            if ((e.button === 0 && isSpacePressed || e.button === 1) && previewView && onPreviewViewChange) {
              const startX = e.clientX
              const startY = e.clientY
              const startViewX = previewView.x
              const startViewY = previewView.y

              const handleMove = (moveE: PointerEvent) => {
                const dx = moveE.clientX - startX
                const dy = moveE.clientY - startY
                onPreviewViewChange({ ...previewView, x: startViewX + dx, y: startViewY + dy })
              }

              const handleUp = () => {
                window.removeEventListener('pointermove', handleMove)
                window.removeEventListener('pointerup', handleUp)
              }

              window.addEventListener('pointermove', handleMove)
              window.addEventListener('pointerup', handleUp)
            }
          }}
        >
          <div
            ref={mermaidRef}
            className="mermaid-preview p-4"
            style={{
              transform: previewView ? `translate(${previewView.x}px, ${previewView.y}px) scale(${previewView.scale})` : undefined,
              transformOrigin: '0 0'
            }}
          />

          {/* Zoom indicator */}
          {previewView && onPreviewViewChange && (
            <div className="absolute bottom-4 right-4 flex space-x-2 bg-white/80 backdrop-blur p-1 rounded-md shadow border border-gray-200">
              <div className="px-2 py-1 text-xs text-gray-500 font-mono border-r border-gray-100 flex items-center">
                {(previewView.scale * 100).toFixed(0)}%
              </div>
              <button
                onClick={handlePreviewFitToView}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="适应视图"
              >
                <Icon path={Icons.Reset} size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
      </FullscreenPortal>
    </div>
  )
})

StateSidebar.displayName = 'StateSidebar'
