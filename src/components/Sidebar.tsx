import { memo, useState, useRef, useEffect } from 'react'
import { Icon, Icons, CodeIcon, ImageIcon } from './Icons'
import type { Selection, GraphNode, GraphLink, ArrowType } from '@/types'
import { exportDiagram, ExportFormat } from '@/utils/export'

interface SidebarProps {
  selection: Selection | null
  multiSelectCount: number
  nodes: GraphNode[]
  links: GraphLink[]
  generatedCode: string
  mermaidError: string | null
  isFullscreen: boolean
  previewView: { x: number; y: number; scale: number }
  snapToGrid: boolean
  onLabelChange: (value: string) => void
  onLinkTypeToggle: () => void
  onLinkArrowChange: (arrow: ArrowType) => void
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
  generatedCode,
  mermaidError,
  isFullscreen,
  previewView,
  snapToGrid,
  onLabelChange,
  onLinkTypeToggle,
  onLinkArrowChange,
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
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const panState = useRef<{ startX: number; startY: number; viewStartX: number; viewStartY: number } | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as Element)?.closest('.export-menu-container')) {
        setShowExportMenu(false)
      }
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [showExportMenu])

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = async (format: ExportFormat) => {
    await exportDiagram(mermaidRef.current, format)
    setShowExportMenu(false)
  }

  const handlePreviewPointerDown = (e: React.PointerEvent) => {
    if (e.button === 0 || e.button === 1) {
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

  const handlePreviewWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const scaleAmount = -e.deltaY * 0.001
    const newScale = Math.min(Math.max(0.2, previewView.scale + scaleAmount), 5)
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const worldX = (mouseX - previewView.x) / previewView.scale
    const worldY = (mouseY - previewView.y) / previewView.scale
    onPreviewViewChange({
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale,
      scale: newScale
    })
  }

  // Get current selection values
  const selectedNode = selection?.type === 'node' ? nodes.find(n => n.id === selection.id) : null
  const selectedLink = selection?.type === 'link' ? links.find(l => l.id === selection.id) : null
  const currentLabel = selectedNode?.label || selectedLink?.label || ''

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg z-30 relative">
      {/* Properties Panel */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {multiSelectCount > 0 
            ? `已选择 ${multiSelectCount} 个节点` 
            : selection 
              ? (selection.type === 'node' ? '节点属性' : '连线属性') 
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
                    {(['solid', 'dotted'] as const).map(t => (
                      <button
                        key={t}
                        onClick={onLinkTypeToggle}
                        className={`flex-1 p-1.5 rounded border text-xs flex justify-center ${
                          selectedLink.type === t 
                            ? 'bg-blue-50 border-blue-300 text-blue-600' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <Icon path={t === 'solid' ? Icons.LineSolid : Icons.LineDotted} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">箭头方向</label>
                  <div className="flex space-x-1">
                    {([
                      { k: 'none' as const, i: Icons.ArrowNone },
                      { k: 'forward' as const, i: Icons.ArrowForward },
                      { k: 'back' as const, i: Icons.ArrowBack },
                      { k: 'both' as const, i: Icons.ArrowBoth }
                    ]).map(opt => {
                      const active = (selectedLink.arrow || 'forward') === opt.k
                      return (
                        <button
                          key={opt.k}
                          onClick={() => onLinkArrowChange(opt.k)}
                          className={`flex-1 p-1.5 rounded border text-xs flex justify-center ${
                            active ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-200'
                          }`}
                        >
                          <Icon path={opt.i} />
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

      {/* Code Editor */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-y border-gray-200">
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
        <textarea
          className="flex-1 p-4 text-xs font-mono bg-slate-800 text-green-400 resize-none focus:outline-none"
          value={generatedCode}
          onChange={(e) => onCodeChange(e.target.value)}
          onBlur={onCodeBlur}
          spellCheck="false"
        />
      </div>

      {/* Preview */}
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : 'h-1/3 flex flex-col bg-white'}`}>
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
          className="flex-1 relative overflow-hidden bg-white cursor-grab active:cursor-grabbing grid-bg"
          style={{
            backgroundPosition: `${previewView.x}px ${previewView.y}px`,
            backgroundSize: `${20 * previewView.scale}px ${20 * previewView.scale}px`
          }}
          onWheel={handlePreviewWheel}
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
            <div ref={mermaidRef} className="pointer-events-none mermaid-preview" />
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
              onClick={() => onPreviewViewChange({ x: 0, y: 0, scale: 1 })}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
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
