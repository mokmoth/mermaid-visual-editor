import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '@/i18n'
import type { SidebarProps } from '@/core/types'
import type { ERDiagramState, Cardinality, AttributeType, EntityAttribute } from './types'
import { CARDINALITY_OPTIONS, ATTRIBUTE_TYPES } from './types'
import { Icon, Icons } from '@/components/Icons'
import { ResizableDivider } from '@/components/ResizableDivider'
import { getEntitySize } from './EntityNode'
import { calculateFitToView, calculateItemsBounds } from '@/utils/geometry'

interface ERSidebarProps extends SidebarProps<ERDiagramState> {
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

export const ERSidebar = memo(({
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
}: ERSidebarProps) => {
  const { t } = useI18n()
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [propertiesHeight, setPropertiesHeight] = useState<number>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-er-properties-height')
    return saved ? parseInt(saved, 10) : 250
  })
  const [codeHeight, setCodeHeight] = useState<number>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-er-code-height')
    return saved ? parseInt(saved, 10) : 150
  })
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Properties section resize handler
  const handlePropertiesResize = useCallback((delta: number) => {
    setPropertiesHeight(prev => {
      const newHeight = Math.max(150, Math.min(500, prev + delta))
      window.localStorage.setItem('mermaid-editor-er-properties-height', String(newHeight))
      return newHeight
    })
  }, [])

  // Code section resize handler
  const handleCodeResize = useCallback((delta: number) => {
    setCodeHeight(prev => {
      const newHeight = Math.max(80, Math.min(300, prev + delta))
      window.localStorage.setItem('mermaid-editor-er-code-height', String(newHeight))
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

  // Fit preview content to view
  const handlePreviewFitToView = useCallback(() => {
    const container = previewContainerRef.current
    if (!container || !onPreviewViewChange) return

    const rect = container.getBoundingClientRect()
    const bounds = calculateItemsBounds(state.entities, getEntitySize)
    const newView = calculateFitToView(bounds, rect.width, rect.height)
    onPreviewViewChange(newView)
  }, [previewContainerRef, state.entities, onPreviewViewChange])

  const selectedEntity = useMemo(() => {
    if (selection?.type === 'entity') {
      return state.entities.find(e => e.id === selection.id)
    }
    return null
  }, [selection, state.entities])

  const selectedRelationship = useMemo(() => {
    if (selection?.type === 'erRelationship') {
      return state.relationships.find(r => r.id === selection.id)
    }
    return null
  }, [selection, state.relationships])

  const handleEntityNameChange = (name: string) => {
    if (!selectedEntity) return
    onStateChange({
      ...state,
      entities: state.entities.map(e =>
        e.id === selectedEntity.id ? { ...e, name } : e
      )
    })
  }

  const handleRelationshipLabelChange = (label: string) => {
    if (!selectedRelationship) return
    onStateChange({
      ...state,
      relationships: state.relationships.map(r =>
        r.id === selectedRelationship.id ? { ...r, label } : r
      )
    })
  }

  const handleCardinalityChange = (side: 'from' | 'to', cardinality: Cardinality) => {
    if (!selectedRelationship) return
    onStateChange({
      ...state,
      relationships: state.relationships.map(r =>
        r.id === selectedRelationship.id
          ? { ...r, [side === 'from' ? 'fromCardinality' : 'toCardinality']: cardinality }
          : r
      )
    })
  }

  const handleAddAttribute = () => {
    if (!selectedEntity) return
    const newAttr = {
      id: `a${Date.now()}`,
      name: 'new_column',
      type: 'VARCHAR' as AttributeType,
    }
    onStateChange({
      ...state,
      entities: state.entities.map(e =>
        e.id === selectedEntity.id
          ? { ...e, attributes: [...e.attributes, newAttr] }
          : e
      )
    })
  }

  const handleUpdateAttribute = (attrId: string, field: keyof EntityAttribute, value: any) => {
    if (!selectedEntity) return
    onStateChange({
      ...state,
      entities: state.entities.map(e =>
        e.id === selectedEntity.id
          ? {
              ...e,
              attributes: e.attributes.map(a =>
                a.id === attrId ? { ...a, [field]: value } : a
              )
            }
          : e
      )
    })
  }

  const handleDeleteAttribute = (attrId: string) => {
    if (!selectedEntity) return
    onStateChange({
      ...state,
      entities: state.entities.map(e =>
        e.id === selectedEntity.id
          ? { ...e, attributes: e.attributes.filter(a => a.id !== attrId) }
          : e
      )
    })
  }

  // Expandable section state
  const [expandedAttr, setExpandedAttr] = useState<string | null>(null)

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Properties Section */}
      <div
        className="border-b border-gray-200 overflow-y-auto flex-shrink-0"
        style={{ height: isFullscreen ? 0 : propertiesHeight }}
      >
        <div className="p-4">
          <h3 className="font-medium text-gray-700 mb-3">{t('sidebar.properties')}</h3>

        {selectedEntity && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t('erDiagram.entity')}
              </label>
              <input
                type="text"
                value={selectedEntity.name}
                onChange={(e) => handleEntityNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Attributes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-600">
                  Attributes
                </label>
                <button
                  onClick={handleAddAttribute}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-1 text-xs">
                {selectedEntity.attributes.map(attr => (
                  <div key={attr.id} className="bg-gray-50 rounded overflow-hidden">
                    <div
                      className="px-2 py-1 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                      onClick={() => setExpandedAttr(expandedAttr === attr.id ? null : attr.id)}
                    >
                      <span className="text-gray-700">
                        {attr.isPK && <span className="text-yellow-600 mr-1">★</span>}
                        {attr.isFK && <span className="text-blue-600 mr-1">◆</span>}
                        {attr.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-gray-400">{attr.type}</span>
                        <span className="text-gray-400">{expandedAttr === attr.id ? '▼' : '▶'}</span>
                      </span>
                    </div>
                    {expandedAttr === attr.id && (
                      <div className="px-2 py-2 border-t border-gray-200 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => handleUpdateAttribute(attr.id, 'name', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="Column name"
                          />
                          <select
                            value={attr.type}
                            onChange={(e) => handleUpdateAttribute(attr.id, 'type', e.target.value)}
                            className="w-24 px-1 py-1 border border-gray-300 rounded text-xs"
                          >
                            {ATTRIBUTE_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-3 items-center flex-wrap">
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={attr.isPK || false}
                              onChange={(e) => handleUpdateAttribute(attr.id, 'isPK', e.target.checked)}
                            />
                            PK
                          </label>
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={attr.isFK || false}
                              onChange={(e) => handleUpdateAttribute(attr.id, 'isFK', e.target.checked)}
                            />
                            FK
                          </label>
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={attr.isNullable || false}
                              onChange={(e) => handleUpdateAttribute(attr.id, 'isNullable', e.target.checked)}
                            />
                            Nullable
                          </label>
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={attr.isUnique || false}
                              onChange={(e) => handleUpdateAttribute(attr.id, 'isUnique', e.target.checked)}
                            />
                            Unique
                          </label>
                          <button
                            onClick={() => handleDeleteAttribute(attr.id)}
                            className="ml-auto text-red-500 hover:text-red-700 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {selectedEntity.attributes.length === 0 && (
                  <p className="text-gray-400 italic">No attributes</p>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedRelationship && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t('erDiagram.relationship')}
              </label>
              <input
                type="text"
                value={selectedRelationship.label || ''}
                onChange={(e) => handleRelationshipLabelChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Relationship label"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {selectedRelationship.from} Cardinality
              </label>
              <select
                value={selectedRelationship.fromCardinality}
                onChange={(e) => handleCardinalityChange('from', e.target.value as Cardinality)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CARDINALITY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label} ({c.description})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {selectedRelationship.to} Cardinality
              </label>
              <select
                value={selectedRelationship.toCardinality}
                onChange={(e) => handleCardinalityChange('to', e.target.value as Cardinality)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CARDINALITY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label} ({c.description})</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-500">
              <p>From: {selectedRelationship.from}</p>
              <p>To: {selectedRelationship.to}</p>
            </div>
          </div>
        )}

        {!selectedEntity && !selectedRelationship && (
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
          <p>Entities: {state.entities.length}</p>
          <p>Relationships: {state.relationships.length}</p>
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
            className="mermaid p-4"
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

ERSidebar.displayName = 'ERSidebar'
