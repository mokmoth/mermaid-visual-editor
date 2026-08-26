import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '@/i18n'
import type { SidebarProps } from '@/core/types'
import type { SequenceDiagramState, ParticipantType, MessageType } from './types'
import { PARTICIPANT_TYPES, MESSAGE_TYPES } from './types'
import { Icon, Icons } from '@/components/Icons'
import { ResizableDivider } from '@/components/ResizableDivider'
import { PARTICIPANT_WIDTH_CONST, PARTICIPANT_HEIGHT_CONST } from './ParticipantNode'
import { calculateFitToView, BoundingBox } from '@/utils/geometry'

interface SequenceSidebarProps extends SidebarProps<SequenceDiagramState> {
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
}

export const SequenceSidebar = memo(({
  state,
  selection,
  multiSelectCount: _multiSelectCount,
  snapToGrid,
  onStateChange,
  onAlignNodes: _onAlignNodes,
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
}: SequenceSidebarProps) => {
  const { t } = useI18n()
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [propertiesHeight, setPropertiesHeight] = useState<number>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-sequence-properties-height')
    return saved ? parseInt(saved, 10) : 280
  })
  const [codeHeight, setCodeHeight] = useState<number>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-sequence-code-height')
    return saved ? parseInt(saved, 10) : 150
  })
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Properties section resize handler
  const handlePropertiesResize = useCallback((delta: number) => {
    setPropertiesHeight(prev => {
      const newHeight = Math.max(150, Math.min(500, prev + delta))
      window.localStorage.setItem('mermaid-editor-sequence-properties-height', String(newHeight))
      return newHeight
    })
  }, [])

  // Code section resize handler
  const handleCodeResize = useCallback((delta: number) => {
    setCodeHeight(prev => {
      const newHeight = Math.max(80, Math.min(300, prev + delta))
      window.localStorage.setItem('mermaid-editor-sequence-code-height', String(newHeight))
      return newHeight
    })
  }, [])

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

  // Constants for sequence layout calculation
  const PARTICIPANT_SPACING = 150
  const MESSAGE_SPACING = 50
  const BASE_Y = 80

  // Fit preview content to view
  const handlePreviewFitToView = useCallback(() => {
    const container = previewContainerRef.current
    if (!container || !onPreviewViewChange) return

    const rect = container.getBoundingClientRect()

    // Calculate bounds for sequence diagram
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const participant of state.participants) {
      const x = 50 + participant.order * PARTICIPANT_SPACING
      minX = Math.min(minX, x)
      minY = Math.min(minY, BASE_Y)
      maxX = Math.max(maxX, x + PARTICIPANT_WIDTH_CONST)
      const timelineHeight = state.messages.length * MESSAGE_SPACING + 100
      maxY = Math.max(maxY, BASE_Y + PARTICIPANT_HEIGHT_CONST + timelineHeight)
    }

    if (minX === Infinity) {
      onPreviewViewChange({ x: 0, y: 0, scale: 1 })
      return
    }

    const bounds: BoundingBox = { minX, minY, maxX, maxY }
    const newView = calculateFitToView(bounds, rect.width, rect.height)
    onPreviewViewChange(newView)
  }, [previewContainerRef, state.participants, state.messages, onPreviewViewChange])

  const selectedParticipant = useMemo(() => {
    if (selection?.type === 'participant') {
      return state.participants.find(p => p.id === selection.id)
    }
    return null
  }, [selection, state.participants])

  const selectedMessage = useMemo(() => {
    if (selection?.type === 'message') {
      return state.messages.find(m => m.id === selection.id)
    }
    return null
  }, [selection, state.messages])

  const handleParticipantNameChange = (name: string) => {
    if (!selectedParticipant) return
    onStateChange({
      ...state,
      participants: state.participants.map(p =>
        p.id === selectedParticipant.id ? { ...p, name } : p
      )
    })
  }

  const handleParticipantAliasChange = (alias: string) => {
    if (!selectedParticipant) return
    onStateChange({
      ...state,
      participants: state.participants.map(p =>
        p.id === selectedParticipant.id ? { ...p, alias: alias || undefined } : p
      )
    })
  }

  const handleParticipantTypeChange = (type: ParticipantType) => {
    if (!selectedParticipant) return
    onStateChange({
      ...state,
      participants: state.participants.map(p =>
        p.id === selectedParticipant.id ? { ...p, type } : p
      )
    })
  }

  const handleMessageTextChange = (text: string) => {
    if (!selectedMessage) return
    onStateChange({
      ...state,
      messages: state.messages.map(m =>
        m.id === selectedMessage.id ? { ...m, text } : m
      )
    })
  }

  const handleMessageTypeChange = (type: MessageType) => {
    if (!selectedMessage) return
    onStateChange({
      ...state,
      messages: state.messages.map(m =>
        m.id === selectedMessage.id ? { ...m, type } : m
      )
    })
  }

  const handleMessageFromChange = (from: string) => {
    if (!selectedMessage) return
    onStateChange({
      ...state,
      messages: state.messages.map(m =>
        m.id === selectedMessage.id ? { ...m, from } : m
      )
    })
  }

  const handleMessageToChange = (to: string) => {
    if (!selectedMessage) return
    onStateChange({
      ...state,
      messages: state.messages.map(m =>
        m.id === selectedMessage.id ? { ...m, to } : m
      )
    })
  }

  const handleTitleChange = (title: string) => {
    onStateChange({ ...state, title: title || undefined })
  }

  const handleMoveMessageUp = () => {
    if (!selectedMessage || selectedMessage.order === 0) return
    const messages = [...state.messages]
    const idx = messages.findIndex(m => m.id === selectedMessage.id)
    const prevIdx = messages.findIndex(m => m.order === selectedMessage.order - 1)
    if (prevIdx >= 0) {
      messages[idx] = { ...messages[idx], order: selectedMessage.order - 1 }
      messages[prevIdx] = { ...messages[prevIdx], order: messages[prevIdx].order + 1 }
      onStateChange({ ...state, messages })
    }
  }

  const handleMoveMessageDown = () => {
    if (!selectedMessage) return
    const maxOrder = Math.max(...state.messages.map(m => m.order))
    if (selectedMessage.order >= maxOrder) return

    const messages = [...state.messages]
    const idx = messages.findIndex(m => m.id === selectedMessage.id)
    const nextIdx = messages.findIndex(m => m.order === selectedMessage.order + 1)
    if (nextIdx >= 0) {
      messages[idx] = { ...messages[idx], order: selectedMessage.order + 1 }
      messages[nextIdx] = { ...messages[nextIdx], order: messages[nextIdx].order - 1 }
      onStateChange({ ...state, messages })
    }
  }

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Properties Section */}
      <div
        className="border-b border-gray-200 overflow-y-auto flex-shrink-0"
        style={{ height: isFullscreen ? 0 : propertiesHeight }}
      >
        <div className="p-4">
          <h3 className="font-medium text-gray-700 mb-3">{t('sidebar.properties')}</h3>

        {/* Diagram Title */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Diagram Title
          </label>
          <input
            type="text"
            value={state.title || ''}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional title"
          />
        </div>

        {selectedParticipant && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Name
              </label>
              <input
                type="text"
                value={selectedParticipant.name}
                onChange={(e) => handleParticipantNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Alias (Display Name)
              </label>
              <input
                type="text"
                value={selectedParticipant.alias || ''}
                onChange={(e) => handleParticipantAliasChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional alias"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Type
              </label>
              <select
                value={selectedParticipant.type}
                onChange={(e) => handleParticipantTypeChange(e.target.value as ParticipantType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PARTICIPANT_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p><span className="font-medium">Order:</span> {selectedParticipant.order + 1}</p>
            </div>
          </div>
        )}

        {selectedMessage && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Message Text
              </label>
              <input
                type="text"
                value={selectedMessage.text}
                onChange={(e) => handleMessageTextChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Arrow Type
              </label>
              <select
                value={selectedMessage.type}
                onChange={(e) => handleMessageTypeChange(e.target.value as MessageType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MESSAGE_TYPES.map(mt => (
                  <option key={mt.value} value={mt.value}>{mt.label} ({mt.description})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  From
                </label>
                <select
                  value={selectedMessage.from}
                  onChange={(e) => handleMessageFromChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {state.participants.map(p => (
                    <option key={p.id} value={p.id}>{p.alias || p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  To
                </label>
                <select
                  value={selectedMessage.to}
                  onChange={(e) => handleMessageToChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {state.participants.map(p => (
                    <option key={p.id} value={p.id}>{p.alias || p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Move message order */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Message Order
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleMoveMessageUp}
                  disabled={selectedMessage.order === 0}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Move Up
                </button>
                <button
                  onClick={handleMoveMessageDown}
                  disabled={selectedMessage.order >= Math.max(...state.messages.map(m => m.order))}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Move Down
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p><span className="font-medium">Sequence:</span> #{selectedMessage.order + 1}</p>
            </div>
          </div>
        )}

        {!selectedParticipant && !selectedMessage && (
          <p className="text-sm text-gray-500">
            {t('sidebar.noSelection')}
          </p>
        )}
        </div>

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
          <p>Participants: {state.participants.length}</p>
          <p>Messages: {state.messages.length}</p>
        </div>
      </div>

      {/* Properties/Code Resizer */}
      {!isFullscreen && (
        <ResizableDivider orientation="vertical" onResize={handlePropertiesResize} />
      )}

      {/* Code Section */}
      <div
        className="flex flex-col border-t border-gray-200 overflow-hidden shrink-0"
        style={{ height: isFullscreen ? 0 : codeHeight }}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">{t('sidebar.mermaidCode')}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <textarea
            value={generatedCode || ''}
            onChange={(e) => onCodeChange?.(e.target.value)}
            onBlur={() => onCodeBlur?.()}
            className="w-full h-full p-3 text-xs font-mono bg-gray-50 border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            spellCheck={false}
          />
        </div>
        {mermaidError && (
          <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-200">
            {mermaidError}
          </div>
        )}
      </div>

      {/* Resizable divider between Code and Preview */}
      {!isFullscreen && <ResizableDivider orientation="vertical" onResize={handleCodeResize} />}

      {/* Preview Section */}
      <div className={`border-t border-gray-200 flex flex-col ${isFullscreen ? 'fixed inset-0 z-[100] bg-white' : 'flex-1 min-h-0'}`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">{t('sidebar.preview')}</span>
          <button
            onClick={() => onFullscreenToggle?.()}
            className="p-1 hover:bg-gray-200 rounded"
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
    </div>
  )
})

SequenceSidebar.displayName = 'SequenceSidebar'
