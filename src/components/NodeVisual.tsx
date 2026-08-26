import { memo, RefObject } from 'react'
import type { GraphNode, ResizeHandle } from '@/types'
import { getNodeSize } from '@/utils/nodeSize'

interface NodeVisualProps {
  node: GraphNode
  isSel: boolean
  isEdit: boolean
  tempLabel: string
  setTempLabel: (label: string) => void
  finishEditing: () => void
  inputRef: RefObject<HTMLInputElement>
  onResizeStart: (e: React.PointerEvent, node: GraphNode, handle: ResizeHandle) => void
  showResizeHandles?: boolean
}

export const NodeVisual = memo(({
  node,
  isSel,
  isEdit,
  tempLabel,
  setTempLabel,
  finishEditing,
  inputRef,
  onResizeStart,
  showResizeHandles = false
}: NodeVisualProps) => {
  const { width, height } = getNodeSize(
    node.type, 
    isEdit ? tempLabel : node.label, 
    node.customWidth, 
    node.customHeight
  )

  const borderClass = isSel 
    ? 'stroke-blue-500 stroke-2' 
    : 'stroke-slate-600 stroke-2 hover:stroke-blue-400'
  const bgClass = 'fill-white transition-colors duration-200'

  const renderShape = () => {
    switch (node.type) {
      case 'rect':
        return <rect x="1" y="1" width={width - 2} height={height - 2} className={`${bgClass} ${borderClass}`} />
      case 'round':
        return <rect x="1" y="1" width={width - 2} height={height - 2} rx="8" className={`${bgClass} ${borderClass}`} />
      case 'stadium':
        return <rect x="1" y="1" width={width - 2} height={height - 2} rx={Math.min(width, height) / 2} className={`${bgClass} ${borderClass}`} />
      case 'circle':
        return <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 1} ry={height / 2 - 1} className={`${bgClass} ${borderClass}`} />
      case 'rhombus':
        return <path d={`M${width / 2} 1 L${width - 1} ${height / 2} L${width / 2} ${height - 1} L1 ${height / 2} Z`} className={`${bgClass} ${borderClass}`} />
      case 'hexagon':
        return <path d={`M${Math.min(15, width * 0.2)} 1 L${width - Math.min(15, width * 0.2)} 1 L${width - 1} ${height / 2} L${width - Math.min(15, width * 0.2)} ${height - 1} L${Math.min(15, width * 0.2)} ${height - 1} L1 ${height / 2} Z`} className={`${bgClass} ${borderClass}`} />
      case 'parallelogram':
        return <path d={`M${Math.min(20, width * 0.2)} 1 L${width - 1} 1 L${width - Math.min(20, width * 0.2)} ${height - 1} L1 ${height - 1} Z`} className={`${bgClass} ${borderClass}`} />
      case 'database':
        return (
          <g>
            <path d={`M1 10 C1 4 15 1 ${width / 2} 1 S${width - 1} 4 ${width - 1} 10 V${height - 10} C${width - 1} ${height - 4} ${width - 15} ${height - 1} ${width / 2} ${height - 1} S1 ${height - 4} 1 ${height - 10} Z`} className={`${bgClass} ${borderClass}`} />
            <path d={`M1 10 C1 16 15 19 ${width / 2} 19 S${width - 1} 16 ${width - 1} 10`} fill="none" className={borderClass} />
          </g>
        )
      case 'subroutine':
        return (
          <g>
            <rect x="1" y="1" width={width - 2} height={height - 2} className={`${bgClass} ${borderClass}`} />
            <line x1="10" y1="1" x2="10" y2={height - 1} className={borderClass} />
            <line x1={width - 10} y1="1" x2={width - 10} y2={height - 1} className={borderClass} />
          </g>
        )
      case 'flag':
        // Asymmetric flag shape: A>text]
        return <path d={`M1 1 L${width - Math.min(20, width * 0.2)} 1 L${width - 1} ${height / 2} L${width - Math.min(20, width * 0.2)} ${height - 1} L1 ${height - 1} Z`} className={`${bgClass} ${borderClass}`} />
      case 'trapezoid':
        // Trapezoid: narrower at top, wider at bottom
        return <path d={`M${Math.min(20, width * 0.15)} 1 L${width - Math.min(20, width * 0.15)} 1 L${width - 1} ${height - 1} L1 ${height - 1} Z`} className={`${bgClass} ${borderClass}`} />
      case 'trapezoid_alt':
        // Inverted trapezoid: wider at top, narrower at bottom
        return <path d={`M1 1 L${width - 1} 1 L${width - Math.min(20, width * 0.15)} ${height - 1} L${Math.min(20, width * 0.15)} ${height - 1} Z`} className={`${bgClass} ${borderClass}`} />
      case 'double_circle':
        // Double circle with inner and outer rings
        return (
          <g>
            <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 1} ry={height / 2 - 1} className={`${bgClass} ${borderClass}`} />
            <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 6} ry={height / 2 - 6} className={borderClass} fill="none" />
          </g>
        )
      case 'parallelogram_alt':
        // Reverse parallelogram (slanted the other way)
        return <path d={`M1 1 L${width - Math.min(20, width * 0.2)} 1 L${width - 1} ${height - 1} L${Math.min(20, width * 0.2)} ${height - 1} Z`} className={`${bgClass} ${borderClass}`} />
      default:
        return <rect x="1" y="1" width={width - 2} height={height - 2} className={`${bgClass} ${borderClass}`} />
    }
  }

  // Calculate font size based on node dimensions and text length
  const fontSize = Math.min(16, Math.max(6, Math.min(14, Math.sqrt((width * height) / (Math.max(1, node.label.length) * 4)))))
  const maxLines = Math.max(1, Math.floor(height / 12))

  return (
    <div className="w-full h-full relative">
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        className="absolute inset-0 overflow-visible pointer-events-none"
      >
        {renderShape()}
      </svg>
      
      {/* Content */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none p-2 overflow-hidden">
        {isEdit ? (
          <input
            ref={inputRef}
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            onBlur={finishEditing}
            onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
            className="w-full h-full bg-transparent text-center outline-none pointer-events-auto text-sm cursor-text"
            style={{ resize: 'none' }}
            autoFocus
          />
        ) : (
          <span
            className="text-center leading-tight w-full select-none overflow-hidden"
            style={{
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              fontSize: `${fontSize}px`,
              lineHeight: '1.3',
              display: '-webkit-box',
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis'
            }}
          >
            {node.label.replace(/<br\s*\/?>/gi, '\n')}
          </span>
        )}
      </div>

      {/* Selection ring and resize handles */}
      {(isSel || showResizeHandles) && (
        <div className={`absolute inset-0 rounded ring-2 ${isSel ? 'ring-blue-100' : 'ring-gray-200'} pointer-events-none opacity-50 z-0`}>
          {/* Resize Handles - 4 corners */}
          <div 
            className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-blue-500 border border-white cursor-nwse-resize pointer-events-auto z-50" 
            onPointerDown={(e) => onResizeStart(e, node, 'nw')} 
          />
          <div 
            className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-blue-500 border border-white cursor-nesw-resize pointer-events-auto z-50" 
            onPointerDown={(e) => onResizeStart(e, node, 'ne')} 
          />
          <div 
            className="absolute -right-1 -bottom-1 w-2.5 h-2.5 bg-blue-500 border border-white cursor-nwse-resize pointer-events-auto z-50" 
            onPointerDown={(e) => onResizeStart(e, node, 'se')} 
          />
          <div 
            className="absolute -left-1 -bottom-1 w-2.5 h-2.5 bg-blue-500 border border-white cursor-nesw-resize pointer-events-auto z-50" 
            onPointerDown={(e) => onResizeStart(e, node, 'sw')} 
          />
        </div>
      )}
    </div>
  )
})

NodeVisual.displayName = 'NodeVisual'
