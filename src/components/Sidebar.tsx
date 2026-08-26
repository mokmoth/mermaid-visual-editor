import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Icon, Icons, CodeIcon, ImageIcon } from './Icons'
import { MermaidCodeEditor } from './MermaidCodeEditor'
import type { Selection, GraphNode, GraphLink, Swimlane, ArrowType, LinkType } from '@/types'
import { exportDiagram, ExportFormat } from '@/utils/export'
import { SwimlanePreview } from './SwimlanePreview'
import { ResizableDivider } from './ResizableDivider'
import { calculateFitToView, calculateFlowchartBounds } from '@/utils/geometry'

interface SidebarProps {
  selection: Selection | null
  multiSelectCount: number
  nodes: GraphNode[]
  links: GraphLink[]
  swimlanes?: Swimlane[]
  generatedCode: string
  mermaidError: string | null
  isFullscreen: boolean
  previewView: { x: number; y: number; scale: number }
  snapToGrid: boolean
  onLabelChange: (value: string) => void
  onLinkTypeChange: (type: LinkType) => void
  onLinkArrowChange: (arrow: ArrowType) => void
  onSwimlaneChange?: (id: string, updates: Partial<Swimlane>) => void
  onCodeChange: (code: string) => void
  onCodeBlur: () => void
  onFullscreenToggle: () => void
  onPreviewViewChange: (view: { x: number; y: number; scale: number }) => void
  onAlignNodes: (direction: string) => void
  onSnapToGridChange: (value: boolean) => void
  mermaidRef: React.RefObject<HTMLDivElement>
}

export const Sidebar = memo(({
  selection,
  multiSelectCount,
  nodes,
  links,
  swimlanes = [],
  generatedCode,
  mermaidError,
  isFullscreen,
  previewView,
  snapToGrid,
  onLabelChange,
  onLinkTypeChange,
  onLinkArrowChange,
  onSwimlaneChange,
  onCodeChange,
  onCodeBlur,
  onFullscreenToggle,
  onPreviewViewChange,
  onAlignNodes,
  onSnapToGridChange,
  mermaidRef
}: SidebarProps) => {
  const [copied, setCopied] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [propertiesHeight, setPropertiesHeight] = useState<number>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-properties-height')
    return saved ? parseInt(saved, 10) : 280 // Default 280px
  })
  const [codeHeight, setCodeHeight] = useState<number>(() => {
    const saved = window.localStorage.getItem('mermaid-editor-code-height')
    return saved ? parseInt(saved, 10) : 200 // Default 200px
  })
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const swimlanePreviewRef = useRef<HTMLDivElement>(null)
  const panState = useRef<{ startX: number; startY: number; viewStartX: number; viewStartY: number } | null>(null)

  // Properties section resize handler
  const handlePropertiesResize = useCallback((delta: number) => {
    setPropertiesHeight(prev => {
      const newHeight = Math.max(150, Math.min(500, prev + delta))
      window.localStorage.setItem('mermaid-editor-properties-height', String(newHeight))
      return newHeight
    })
  }, [])

  // Code section resize handler
  const handleCodeResize = useCallback((delta: number) => {
    setCodeHeight(prev => {
      const newHeight = Math.max(100, Math.min(400, prev + delta))
      window.localStorage.setItem('mermaid-editor-code-height', String(newHeight))
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as Element)?.closest('.export-menu-container')) {
        setShowExportMenu(false)
      }
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [showExportMenu])

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFullscreenToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, onFullscreenToggle])

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = async (format: ExportFormat) => {
    // Use swimlane preview when swimlanes exist, otherwise use mermaid preview
    const exportElement = swimlanes.length > 0
      ? swimlanePreviewRef.current
      : mermaidRef.current
    await exportDiagram(exportElement, format)
    setShowExportMenu(false)
  }

  const handlePreviewPointerDown = (e: React.PointerEvent) => {
    // Space + left-click or middle-click = pan
    if ((e.button === 0 && isSpacePressed) || e.button === 1) {
      panState.current = {
        startX: e.clientX,
        startY: e.clientY,
        viewStartX: previewView.x,
        viewStartY: previewView.y
      }
    }
  }

  const handlePreviewPointerMove = (e: React.PointerEvent) => {
    if (panState.current) {
      const dx = e.clientX - panState.current.startX
      const dy = e.clientY - panState.current.startY
      onPreviewViewChange({
        ...previewView,
        x: panState.current.viewStartX + dx,
        y: panState.current.viewStartY + dy
      })
    }
  }

  const handlePreviewPointerUp = () => {
    panState.current = null
  }

  const handlePreviewWheel = (e: WheelEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    // Pinch-to-zoom (ctrlKey is set on trackpad pinch)
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
      // Two-finger scroll = pan view
      onPreviewViewChange({
        x: previewView.x - e.deltaX,
        y: previewView.y - e.deltaY,
        scale: previewView.scale
      })
    }
  }

  // Use non-passive wheel event listener to allow preventDefault
  useEffect(() => {
    const container = previewContainerRef.current
    if (!container) return

    container.addEventListener('wheel', handlePreviewWheel, { passive: false })
    return () => container.removeEventListener('wheel', handlePreviewWheel)
  }, [previewView, onPreviewViewChange])

  // Fit preview content to view
  const handlePreviewFitToView = useCallback(() => {
    const container = previewContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()

    // For swimlane preview, calculate from flowchart bounds
    if (swimlanes.length > 0) {
      const bounds = calculateFlowchartBounds(nodes, swimlanes)
      const newView = calculateFitToView(bounds, rect.width, rect.height)
      onPreviewViewChange(newView)
    } else {
      // For mermaid preview, get the rendered SVG bounds
      const mermaidElement = mermaidRef.current
      if (mermaidElement) {
        const svg = mermaidElement.querySelector('svg')
        if (svg) {
          const svgRect = svg.getBoundingClientRect()
          // Mermaid SVG has its own dimensions, use them as bounds
          const bounds = {
            minX: 0,
            minY: 0,
            maxX: svgRect.width / previewView.scale,
            maxY: svgRect.height / previewView.scale
          }
          const newView = calculateFitToView(bounds, rect.width, rect.height)
          onPreviewViewChange(newView)
        } else {
          // No SVG yet, reset to default
          onPreviewViewChange({ x: 0, y: 0, scale: 1 })
        }
      } else {
        onPreviewViewChange({ x: 0, y: 0, scale: 1 })
      }
    }
  }, [previewContainerRef, swimlanes, nodes, mermaidRef, previewView.scale, onPreviewViewChange])

  // Get current selection values
  const selectedNode = selection?.type === 'node' ? nodes.find(n => n.id === selection.id) : null
  const selectedLink = selection?.type === 'link' ? links.find(l => l.id === selection.id) : null
  const selectedSwimlane = selection?.type === 'swimlane' ? swimlanes.find(s => s.id === selection.id) : null
  const currentLabel = selectedNode?.label || selectedLink?.label || ''

  return (
    <div className={`w-full h-full bg-white border-l border-gray-200 flex flex-col shadow-lg ${isFullscreen ? '' : 'z-30 relative'}`}>
      {/* Properties Panel */}
      <div
        className="border-b border-gray-100 bg-gray-50 flex-shrink-0 overflow-y-auto"
        style={{ height: isFullscreen ? 0 : propertiesHeight }}
      >
        <div className="p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {multiSelectCount > 0
            ? `已选择 ${multiSelectCount} 个节点`
            : selection
              ? (selection.type === 'node' ? '节点属性'
                : selection.type === 'swimlane' ? '泳道属性'
                : '连线属性')
              : '未选中'}
        </h3>

        {multiSelectCount > 0 ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-2">对齐工具</label>
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => onAlignNodes('left')} className="p-2 text-xs border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300">左</button>
                <button onClick={() => onAlignNodes('center')} className="p-2 text-xs border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300">中</button>
                <button onClick={() => onAlignNodes('right')} className="p-2 text-xs border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300">右</button>
                <button onClick={() => onAlignNodes('top')} className="p-2 text-xs border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300">顶</button>
                <button onClick={() => onAlignNodes('middle')} className="p-2 text-xs border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300">中</button>
                <button onClick={() => onAlignNodes('bottom')} className="p-2 text-xs border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300">底</button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-500">网格对齐</label>
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => onSnapToGridChange(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>
        ) : selectedSwimlane ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">泳道标题</label>
              <input
                type="text"
                value={selectedSwimlane.name}
                onChange={e => onSwimlaneChange?.(selectedSwimlane.id, { name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">方向</label>
              <div className="flex space-x-1">
                <button
                  onClick={() => onSwimlaneChange?.(selectedSwimlane.id, { orientation: 'horizontal' })}
                  className={`flex-1 py-1.5 px-2 text-xs rounded border ${
                    selectedSwimlane.orientation === 'horizontal'
                      ? 'bg-blue-50 border-blue-300 text-blue-600'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  横向 (行)
                </button>
                <button
                  onClick={() => onSwimlaneChange?.(selectedSwimlane.id, { orientation: 'vertical' })}
                  className={`flex-1 py-1.5 px-2 text-xs rounded border ${
                    selectedSwimlane.orientation === 'vertical'
                      ? 'bg-blue-50 border-blue-300 text-blue-600'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  纵向 (列)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                泳道数量 ({selectedSwimlane.lanes?.length || 0})
              </label>
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    if ((selectedSwimlane.lanes?.length || 0) > 1) {
                      const newLanes = (selectedSwimlane.lanes || []).slice(0, -1)
                      onSwimlaneChange?.(selectedSwimlane.id, { lanes: newLanes })
                    }
                  }}
                  disabled={(selectedSwimlane.lanes?.length || 0) <= 1}
                  className="flex-1 py-1.5 px-2 text-xs rounded border bg-white border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  - 减少
                </button>
                <button
                  onClick={() => {
                    const newLanes = [
                      ...(selectedSwimlane.lanes || []),
                      { id: `lane_${Date.now()}`, name: `泳道 ${(selectedSwimlane.lanes?.length || 0) + 1}` }
                    ]
                    onSwimlaneChange?.(selectedSwimlane.id, { lanes: newLanes })
                  }}
                  className="flex-1 py-1.5 px-2 text-xs rounded border bg-white border-gray-200 hover:bg-gray-50"
                >
                  + 增加
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">泳道名称</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(selectedSwimlane.lanes || []).map((lane, index) => (
                  <input
                    key={lane.id}
                    type="text"
                    value={lane.name}
                    onChange={e => {
                      const newLanes = (selectedSwimlane.lanes || []).map((l, i) =>
                        i === index ? { ...l, name: e.target.value } : l
                      )
                      onSwimlaneChange?.(selectedSwimlane.id, { lanes: newLanes })
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                    placeholder={`泳道 ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">背景颜色</label>
              <div className="flex space-x-1">
                {[
                  { color: '#f0f9ff', name: '浅蓝' },
                  { color: '#ecfdf5', name: '浅绿' },
                  { color: '#fffbeb', name: '浅黄' },
                  { color: '#fdf2f8', name: '浅粉' },
                  { color: '#faf5ff', name: '浅紫' },
                  { color: '#fff7ed', name: '浅橙' },
                ].map(opt => (
                  <button
                    key={opt.color}
                    onClick={() => onSwimlaneChange?.(selectedSwimlane.id, { color: opt.color })}
                    title={opt.name}
                    className={`w-6 h-6 rounded border-2 ${
                      selectedSwimlane.color === opt.color
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: opt.color }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>宽度: {Math.round(selectedSwimlane.width)}px</div>
              <div>高度: {Math.round(selectedSwimlane.height)}px</div>
            </div>
          </div>
        ) : selection ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">文本内容</label>
              <input
                type="text"
                value={currentLabel}
                onChange={e => onLabelChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            {selection.type === 'link' && selectedLink && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">线条样式</label>
                  <div className="flex space-x-1">
                    {([
                      { k: 'solid' as const, i: Icons.LineSolid, title: '实线' },
                      { k: 'dotted' as const, i: Icons.LineDotted, title: '虚线' },
                      { k: 'thick' as const, i: Icons.LineThick, title: '粗线' }
                    ]).map(opt => (
                      <button
                        key={opt.k}
                        onClick={() => onLinkTypeChange(opt.k)}
                        title={opt.title}
                        className={`flex-1 p-1.5 rounded border text-xs flex justify-center ${
                          selectedLink.type === opt.k
                            ? 'bg-blue-50 border-blue-300 text-blue-600'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <Icon path={opt.i} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">箭头端点</label>
                  <div className="grid grid-cols-5 gap-1">
                    {([
                      { k: 'none' as const, i: Icons.ArrowNone, title: '无' },
                      { k: 'forward' as const, i: Icons.ArrowForward, title: '前向箭头' },
                      { k: 'back' as const, i: Icons.ArrowBack, title: '后向箭头' },
                      { k: 'both' as const, i: Icons.ArrowBoth, title: '双向箭头' },
                      { k: 'circle' as const, i: Icons.ArrowCircle, title: '圆形端点' },
                      { k: 'circle_start' as const, i: Icons.ArrowCircleStart, title: '起点圆形' },
                      { k: 'circle_both' as const, i: Icons.ArrowCircleBoth, title: '双圆形' },
                      { k: 'cross' as const, i: Icons.ArrowCross, title: '叉形端点' },
                      { k: 'cross_start' as const, i: Icons.ArrowCrossStart, title: '起点叉形' },
                      { k: 'cross_both' as const, i: Icons.ArrowCrossBoth, title: '双叉形' }
                    ]).map(opt => {
                      const active = (selectedLink.arrow || 'forward') === opt.k
                      return (
                        <button
                          key={opt.k}
                          onClick={() => onLinkArrowChange(opt.k)}
                          title={opt.title}
                          className={`p-1.5 rounded border text-xs flex justify-center ${
                            active ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-200'
                          }`}
                        >
                          <Icon path={opt.i} size={16} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">在左侧画布选择元素以编辑</div>
        )}
        </div>
      </div>

      {/* Properties/Code Resizer */}
      {!isFullscreen && (
        <ResizableDivider orientation="vertical" onResize={handlePropertiesResize} />
      )}

      {/* Code Editor */}
      <div className="flex flex-col flex-shrink-0" style={{ height: isFullscreen ? 0 : codeHeight }}>
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-y border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <CodeIcon size={14} />
            <span className="text-xs font-bold text-gray-600">Code</span>
          </div>
          <button
            onClick={handleCopy}
            className="text-blue-600 text-xs flex items-center hover:underline"
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        <MermaidCodeEditor
          value={generatedCode}
          onChange={onCodeChange}
          onBlur={onCodeBlur}
        />
      </div>

      {/* Code/Preview Resizer */}
      {!isFullscreen && (
        <ResizableDivider orientation="vertical" onResize={handleCodeResize} />
      )}

      {/* Preview */}
      <div className={`${isFullscreen ? 'fixed inset-0 z-[100] bg-white flex flex-col' : 'flex flex-col bg-white flex-1 min-h-0'}`}>
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-gray-600">预览</span>
          <div className="flex items-center space-x-2 relative">
            <div className="relative export-menu-container">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-1 hover:bg-gray-200 rounded text-gray-600 flex items-center text-xs"
              >
                <Icon path={Icons.Download} size={14} />
                <span>导出</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 shadow-xl rounded z-50 py-1 animate-fade-in">
                  <button onClick={() => handleExport('svg')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2">
                    <CodeIcon size={12} />SVG
                  </button>
                  <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2">
                    <ImageIcon size={12} />PNG
                  </button>
                  <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2">
                    <Icon path={Icons.FileText} size={12} />PDF
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onFullscreenToggle}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
            >
              <Icon path={isFullscreen ? Icons.Minimize2 : Icons.Maximize2} size={14} />
            </button>
          </div>
        </div>
        
        <div
          ref={previewContainerRef}
          className={`flex-1 relative overflow-hidden bg-white grid-bg ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          style={{
            backgroundPosition: `${previewView.x}px ${previewView.y}px`,
            backgroundSize: `${20 * previewView.scale}px ${20 * previewView.scale}px`
          }}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={handlePreviewPointerUp}
          onPointerLeave={handlePreviewPointerUp}
        >
          <div
            style={{
              transform: `translate(${previewView.x}px, ${previewView.y}px) scale(${previewView.scale})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Use custom swimlane preview when swimlanes exist, otherwise use Mermaid */}
            {swimlanes.length > 0 ? (
              <div ref={swimlanePreviewRef} className="pointer-events-none swimlane-preview">
                <SwimlanePreview swimlanes={swimlanes} nodes={nodes} links={links} />
              </div>
            ) : (
              <div ref={mermaidRef} className="pointer-events-none mermaid-preview" />
            )}
          </div>
          
          {mermaidError && (
            <div className="absolute bottom-2 left-2 right-2 bg-red-100 text-red-600 text-xs p-2 rounded border border-red-200">
              {mermaidError}
            </div>
          )}
          
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
        </div>
      </div>
    </div>
  )
})

Sidebar.displayName = 'Sidebar'
