import { memo, RefObject } from 'react'
import type { GraphNode, GraphLink, DrawingLink } from '@/types'
import { getNodeCenter, getBorderPoint } from '@/utils/geometry'

interface LinkRendererProps {
  links: GraphLink[]
  nodes: GraphNode[]
  selection: { type: string; id: string } | null
  editingLinkId: string | null
  onLinkClick: (id: string) => void
  onLinkDoubleClick: (id: string, label: string) => void
  drawingLink: DrawingLink | null
  tempLabel: string
  setTempLabel: (label: string) => void
  finishEditing: () => void
  inputRef: RefObject<HTMLInputElement>
}

function getLinkVisuals(link: GraphLink, nodes: GraphNode[]) {
  const s = nodes.find(n => n.id === link.source)
  const t = nodes.find(n => n.id === link.target)
  if (!s || !t) return { path: '', midX: 0, midY: 0 }

  const cS = getNodeCenter(s)
  const cT = getNodeCenter(t)

  // Self-loop handling
  if (link.source === link.target) {
    const gap = 30
    return {
      path: `M${cS.x + 10},${cS.y - 20} C${cS.x + gap},${cS.y - gap - 20} ${cS.x - gap},${cS.y - gap - 20} ${cS.x - 10},${cS.y - 20}`,
      midX: cS.x,
      midY: cS.y - gap - 20 + 10
    }
  }

  // Calculate bezier control point (handle parallel lines)
  const dx = cT.x - cS.x
  const dy = cT.y - cS.y
  let dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) dist = 0.001

  const controlX = (cS.x + cT.x) / 2
  const controlY = (cS.y + cT.y) / 2

  // Precise edge clipping
  const startPoint = getBorderPoint(s, { x: controlX, y: controlY })
  const endPoint = getBorderPoint(t, { x: controlX, y: controlY })

  return {
    path: `M${startPoint.x},${startPoint.y} Q${controlX},${controlY} ${endPoint.x},${endPoint.y}`,
    midX: 0.25 * startPoint.x + 0.5 * controlX + 0.25 * endPoint.x,
    midY: 0.25 * startPoint.y + 0.5 * controlY + 0.25 * endPoint.y
  }
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
  setTempLabel,
  finishEditing,
  inputRef
}: LinkRendererProps) => {
  const renderLinkInput = () => {
    if (!editingLinkId) return null
    const link = links.find(l => l.id === editingLinkId)
    if (!link) return null
    
    const { midX, midY } = getLinkVisuals(link, nodes)
    
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
          onChange={(e) => setTempLabel(e.target.value)}
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
        className="absolute top-0 left-0 w-[50000px] h-[50000px] pointer-events-none z-0" 
        style={{ overflow: 'visible', transform: 'translate(-25000px, -25000px)' }}
      >
        <defs>
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
        </defs>
        <g transform="translate(25000, 25000)">
          {links.map(link => {
            const visuals = getLinkVisuals(link, nodes)
            const { path, midX, midY } = visuals

            const isSel = selection?.type === 'link' && selection.id === link.id
            const color = isSel ? '#2563eb' : '#64748b'
            const mStart = (link.arrow === 'back' || link.arrow === 'both') 
              ? (isSel ? 'url(#arrowhead-rev-blue)' : 'url(#arrowhead-rev)') 
              : ''
            const mEnd = (link.arrow === 'forward' || link.arrow === 'both' || !link.arrow) 
              ? (isSel ? 'url(#arrowhead-blue)' : 'url(#arrowhead)') 
              : ''

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
                  strokeWidth={isSel ? 3 : 2} 
                  fill="none" 
                  markerStart={mStart} 
                  markerEnd={mEnd} 
                  strokeDasharray={link.type === 'dotted' ? '6,4' : '0'} 
                />
                {/* Label */}
                {link.label && editingLinkId !== link.id && (
                  <text 
                    x={midX} 
                    y={midY} 
                    textAnchor="middle" 
                    fill="#475569" 
                    fontSize="12" 
                    dy="-5" 
                    className="bg-white px-1 pointer-events-auto cursor-pointer select-none"
                    onClick={(e) => { e.stopPropagation(); onLinkClick(link.id) }}
                    onDoubleClick={(e) => { e.stopPropagation(); onLinkDoubleClick(link.id, link.label || '') }}
                  >
                    {link.label}
                  </text>
                )}
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
