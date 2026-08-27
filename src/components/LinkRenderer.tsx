import { memo, useMemo, RefObject } from 'react'
import type { GraphNode, GraphLink, DrawingLink } from '@/types'
import { estimateLabelWidth, getLinkVisuals, parallelOffsetByLinkId } from '@/utils/linkPath'

interface LinkRendererProps {
  links: GraphLink[]
  nodes: GraphNode[]
  selection: { type: string; id: string } | null
  editingLinkId: string | null
  onLinkClick: (id: string) => void
  onLinkDoubleClick: (id: string, label: string) => void
  drawingLink: DrawingLink | null
  tempLabel: string
  onTempLabelChange: (label: string) => void
  finishEditing: () => void
  inputRef: RefObject<HTMLInputElement>
}

export const LinkRenderer = memo(({
  links,
  nodes,
  selection,
  editingLinkId,
  onLinkClick,
  onLinkDoubleClick,
  drawingLink,
  tempLabel,
  onTempLabelChange,
  finishEditing,
  inputRef
}: LinkRendererProps) => {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  const linkVisuals = useMemo(() => {
    const offsets = parallelOffsetByLinkId(links)
    return links.reduce((acc, link) => {
      acc[link.id] = getLinkVisuals(link, nodeMap, offsets.get(link.id) ?? 0)
      return acc
    }, {} as Record<string, { path: string; midX: number; midY: number }>)
  }, [links, nodeMap])

  const renderLinkInput = () => {
    if (!editingLinkId) return null
    const link = links.find(l => l.id === editingLinkId)
    if (!link) return null
    
    const visuals = linkVisuals[link.id]
    if (!visuals) return null
    const { midX, midY } = visuals
    
    return (
      <div 
        style={{ 
          position: 'absolute', 
          left: midX, 
          top: midY, 
          transform: 'translate(-50%, -50%)', 
          zIndex: 20 
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={tempLabel}
          onChange={(e) => onTempLabelChange(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={e => e.key === 'Enter' && finishEditing()}
          className="text-xs text-center border border-blue-500 rounded px-1 py-0.5 shadow-sm outline-none bg-white min-w-[60px]"
        />
      </div>
    )
  }

  return (
    <>
      {renderLinkInput()}
      <svg
        className="absolute top-0 left-0 w-[50000px] h-[50000px] pointer-events-none"
        style={{ overflow: 'visible', transform: 'translate(-25000px, -25000px)', zIndex: 5 }}
      >
        <defs>
          {/* Arrow markers */}
          <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
          <marker id="arrowhead-blue" markerWidth="12" markerHeight="12" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
          <marker id="arrowhead-rev" markerWidth="12" markerHeight="12" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="10 0, 0 3.5, 10 7" fill="#64748b" />
          </marker>
          <marker id="arrowhead-rev-blue" markerWidth="12" markerHeight="12" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="10 0, 0 3.5, 10 7" fill="#3b82f6" />
          </marker>
          {/* Circle markers */}
          <marker id="circle-end" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
            <circle cx="5" cy="5" r="4" fill="none" stroke="#64748b" strokeWidth="1.5" />
          </marker>
          <marker id="circle-end-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
            <circle cx="5" cy="5" r="4" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
          </marker>
          <marker id="circle-start" markerWidth="10" markerHeight="10" refX="2" refY="5" orient="auto" markerUnits="strokeWidth">
            <circle cx="5" cy="5" r="4" fill="none" stroke="#64748b" strokeWidth="1.5" />
          </marker>
          <marker id="circle-start-blue" markerWidth="10" markerHeight="10" refX="2" refY="5" orient="auto" markerUnits="strokeWidth">
            <circle cx="5" cy="5" r="4" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
          </marker>
          {/* Cross markers */}
          <marker id="cross-end" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
            <line x1="2" y1="2" x2="8" y2="8" stroke="#64748b" strokeWidth="1.5" />
            <line x1="8" y1="2" x2="2" y2="8" stroke="#64748b" strokeWidth="1.5" />
          </marker>
          <marker id="cross-end-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
            <line x1="2" y1="2" x2="8" y2="8" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1="8" y1="2" x2="2" y2="8" stroke="#3b82f6" strokeWidth="1.5" />
          </marker>
          <marker id="cross-start" markerWidth="10" markerHeight="10" refX="2" refY="5" orient="auto" markerUnits="strokeWidth">
            <line x1="2" y1="2" x2="8" y2="8" stroke="#64748b" strokeWidth="1.5" />
            <line x1="8" y1="2" x2="2" y2="8" stroke="#64748b" strokeWidth="1.5" />
          </marker>
          <marker id="cross-start-blue" markerWidth="10" markerHeight="10" refX="2" refY="5" orient="auto" markerUnits="strokeWidth">
            <line x1="2" y1="2" x2="8" y2="8" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1="8" y1="2" x2="2" y2="8" stroke="#3b82f6" strokeWidth="1.5" />
          </marker>
        </defs>
        <g transform="translate(25000, 25000)">
          {links.map(link => {
            const visuals = linkVisuals[link.id]
            if (!visuals) return null
            const { path, midX, midY } = visuals

            const isSel = selection?.type === 'link' && selection.id === link.id
            const color = isSel ? '#2563eb' : '#64748b'

            // Determine stroke width based on link type
            const strokeWidth = link.type === 'thick' ? (isSel ? 5 : 4) : (isSel ? 3 : 2)

            // Determine stroke dash array
            const strokeDasharray = link.type === 'dotted' ? '6,4' : '0'

            // Determine markers based on arrow type
            let mStart = ''
            let mEnd = ''

            switch (link.arrow) {
              case 'forward':
                mEnd = isSel ? 'url(#arrowhead-blue)' : 'url(#arrowhead)'
                break
              case 'back':
                mStart = isSel ? 'url(#arrowhead-rev-blue)' : 'url(#arrowhead-rev)'
                break
              case 'both':
                mStart = isSel ? 'url(#arrowhead-rev-blue)' : 'url(#arrowhead-rev)'
                mEnd = isSel ? 'url(#arrowhead-blue)' : 'url(#arrowhead)'
                break
              case 'none':
                // No markers
                break
              case 'circle':
                mEnd = isSel ? 'url(#circle-end-blue)' : 'url(#circle-end)'
                break
              case 'circle_start':
                mStart = isSel ? 'url(#circle-start-blue)' : 'url(#circle-start)'
                break
              case 'circle_both':
                mStart = isSel ? 'url(#circle-start-blue)' : 'url(#circle-start)'
                mEnd = isSel ? 'url(#circle-end-blue)' : 'url(#circle-end)'
                break
              case 'cross':
                mEnd = isSel ? 'url(#cross-end-blue)' : 'url(#cross-end)'
                break
              case 'cross_start':
                mStart = isSel ? 'url(#cross-start-blue)' : 'url(#cross-start)'
                break
              case 'cross_both':
                mStart = isSel ? 'url(#cross-start-blue)' : 'url(#cross-start)'
                mEnd = isSel ? 'url(#cross-end-blue)' : 'url(#cross-end)'
                break
              default:
                // Default to forward arrow
                mEnd = isSel ? 'url(#arrowhead-blue)' : 'url(#arrowhead)'
            }

            if (!path) return null

            return (
              <g key={link.id}>
                {/* Invisible wider path for easier clicking */}
                <path 
                  d={path} 
                  stroke="transparent" 
                  strokeWidth={15} 
                  fill="none" 
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onLinkClick(link.id) }}
                  onDoubleClick={(e) => { e.stopPropagation(); onLinkDoubleClick(link.id, link.label || '') }}
                />
                {/* Visible path */}
                <path
                  d={path}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  markerStart={mStart}
                  markerEnd={mEnd}
                  strokeDasharray={strokeDasharray}
                />
                {link.label && editingLinkId !== link.id && (() => {
                  const labelW = estimateLabelWidth(link.label)
                  const labelH = 16
                  return (
                    <g
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onLinkClick(link.id) }}
                      onDoubleClick={(e) => { e.stopPropagation(); onLinkDoubleClick(link.id, link.label || '') }}
                    >
                      <rect
                        x={midX - labelW / 2}
                        y={midY - labelH / 2}
                        width={labelW}
                        height={labelH}
                        rx={3}
                        fill="white"
                        fillOpacity={0.95}
                      />
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#475569"
                        fontSize="12"
                        className="select-none"
                      >
                        {link.label}
                      </text>
                    </g>
                  )
                })()}
              </g>
            )
          })}
          {/* Drawing link preview */}
          {drawingLink && (
            <line 
              x1={drawingLink.startX} 
              y1={drawingLink.startY} 
              x2={drawingLink.currX} 
              y2={drawingLink.currY} 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeDasharray="5,5" 
              markerEnd="url(#arrowhead-blue)" 
            />
          )}
        </g>
      </svg>
    </>
  )
})

LinkRenderer.displayName = 'LinkRenderer'
